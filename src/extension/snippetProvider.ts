import * as vscode from 'vscode';
import { Snippet, SnippetManager } from './snippetManager';

export class SnippetProvider implements vscode.TreeDataProvider<SnippetItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SnippetItem | undefined | null | void> = new vscode.EventEmitter<SnippetItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SnippetItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private readonly snippetManager: SnippetManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SnippetItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SnippetItem): Thenable<SnippetItem[]> {
        if (!element) {
            // Root items
            return Promise.resolve([
                new CategoryItem('Recent', 'clock', 'Recent snippets'),
                new CategoryItem('Favorites', 'star', 'Favorite snippets'),
                new CategoryItem('Languages', 'symbol-color', 'Snippets by language'),
                new CategoryItem('Tags', 'tag', 'Snippets by tag')
            ]);
        } else if (element instanceof CategoryItem) {
            return this.getCategoryChildren(element);
        } else if (element instanceof SnippetItem) {
            // Snippet items are leaf nodes
            return Promise.resolve([]);
        }

        return Promise.resolve([]);
    }

    private getCategoryChildren(category: CategoryItem): Thenable<SnippetItem[]> {
        const snippets = this.snippetManager.getAllSnippets();

        switch (category.label) {
            case 'Recent':
                const recent = snippets
                    .sort((a, b) => (b.lastUsedAt || b.createdAt).getTime() - (a.lastUsedAt || a.createdAt).getTime())
                    .slice(0, 10);
                return Promise.resolve(recent.map(s => new SnippetItem(s, 'recent')));

            case 'Favorites':
                const favorites = snippets.filter(s => s.isFavorited);
                return Promise.resolve(favorites.map(s => new SnippetItem(s, 'favorite')));

            case 'Languages':
                const languages = [...new Set(snippets.map(s => s.language))]
                    .sort()
                    .map(lang => new LanguageItem(lang, snippets.filter(s => s.language === lang).length));
                return Promise.resolve(languages);

            case 'Tags':
                const allTags = [...new Set(snippets.flatMap(s => s.tags))].sort();
                return Promise.resolve(allTags.map(tag => new TagItem(tag, snippets.filter(s => s.tags.includes(tag)).length)));

            default:
                return Promise.resolve([]);
        }
    }

    private getChildrenForLanguage(language: string): Thenable<SnippetItem[]> {
        const snippets = this.snippetManager.getAllSnippets()
            .filter(s => s.language === language)
            .sort((a, b) => a.title.localeCompare(b.title));
        return Promise.resolve(snippets.map(s => new SnippetItem(s, 'language')));
    }

    private getChildrenForTag(tag: string): Thenable<SnippetItem[]> {
        const snippets = this.snippetManager.getAllSnippets()
            .filter(s => s.tags.includes(tag))
            .sort((a, b) => a.title.localeCompare(b.title));
        return Promise.resolve(snippets.map(s => new SnippetItem(s, 'tag')));
    }
}

export class SnippetItem extends vscode.TreeItem {
    constructor(public snippet: Snippet, contextValue: string) {
        super(snippet.title, vscode.TreeItemCollapsibleState.None);

        this.tooltip = this.getTooltip();
        this.description = `${snippet.language} • ${snippet.tags.slice(0, 2).join(', ')}`;
        this.contextValue = contextValue;
        this.iconPath = new vscode.ThemeIcon('file-code');

        this.command = {
            command: 'snippetx.insertSnippet',
            title: 'Insert Snippet',
            arguments: [snippet]
        };

        // Add decorations
        this.resourceUri = vscode.Uri.parse(`snippetx://${snippet.id}`);
    }

    private getTooltip(): string {
        let tooltip = `${this.snippet.title}\n` +
                     `Language: ${this.snippet.language}\n` +
                     `Tags: ${this.snippet.tags.join(', ')}\n` +
                     `Used: ${this.snippet.useCount} times\n` +
                     `Quality: ${this.snippet.qualityScore}/10`;

        if (this.snippet.description) {
            tooltip += `\n\nDescription: ${this.snippet.description}`;
        }

        const previewLength = 100;
        const content = this.snippet.content.length > previewLength
            ? this.snippet.content.substring(0, previewLength) + '...'
            : this.snippet.content;

        tooltip += `\n\n${content}`;

        return tooltip;
    }
}

class CategoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        iconName: string,
        description: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.description = description;
        this.contextValue = 'category';
    }
}

class LanguageItem extends vscode.TreeItem {
    constructor(
        public readonly language: string,
        public readonly count: number
    ) {
        super(language, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = `${count} snippets`;
        this.iconPath = new vscode.ThemeIcon('symbol-color');
        this.contextValue = 'languageCategory';
        this.command = {
            command: 'snippetx.showLanguageSnippets',
            title: 'Show Language Snippets',
            arguments: [language]
        };
    }
}

class TagItem extends vscode.TreeItem {
    constructor(
        public readonly tag: string,
        public readonly count: number
    ) {
        super(tag, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = `${count} snippets`;
        this.iconPath = new vscode.ThemeIcon('tag');
        this.contextValue = 'tagCategory';
    }
}