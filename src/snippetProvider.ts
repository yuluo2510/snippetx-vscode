import * as vscode from 'vscode';
import { SnippetManager } from './snippetManager';

interface Snippet {
    id: string;
    content: string;
    language: string;
    title: string;
    tags: string[];
    useCount: number;
    isFavorited: boolean;
    createdAt: Date;
    description?: string;
}

export class SnippetProvider implements vscode.TreeDataProvider<SnippetItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SnippetItem | undefined | null | void> = new vscode.EventEmitter<SnippetItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SnippetItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private snippetManager: SnippetManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SnippetItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SnippetItem): Thenable<SnippetItem[]> {
        if (!element) {
            // Root level - categories
            return Promise.resolve([
                new CategoryItem('Recent', 'clock', () => this.snippetManager.getRecentSnippets(10)),
                new CategoryItem('Favorites', 'star', () => this.snippetManager.getFavorites()),
                new CategoryItem('All Snippets', 'file-code', () => Promise.resolve(this.snippetManager.getAllSnippets()))
            ]);
        }

        if (element instanceof CategoryItem) {
            return Promise.resolve(element.getChildren());
        }

        return Promise.resolve([]);
    }
}

class CategoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private iconName: string,
        private getSnippets: () => Promise<Snippet[]>
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon(iconName);
    }

    async getChildren(): Promise<SnippetItem[]> {
        const snippets = await this.getSnippets();
        return snippets
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 20)
            .map(snippet => new SnippetItem(snippet));
    }
}

class SnippetItem extends vscode.TreeItem {
    constructor(public readonly snippet: Snippet) {
        super(snippet.title, vscode.TreeItemCollapsibleState.None);

        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.command = {
            command: 'snippetx.openSnippet',
            title: 'Open Snippet',
            arguments: [snippet]
        };

        this.iconPath = new vscode.ThemeIcon(
            snippet.isFavorited ? 'star-full' : 'file-code'
        );

        this.contextValue = 'snippet';
    }

    private getTooltip(): string {
        const desc = this.snippet.description ? `\n\n${this.snippet.description}` : '';
        const tags = this.snippet.tags.length > 0 ? `\n\nTags: ${this.snippet.tags.join(', ')}` : '';
        const usage = this.snippet.useCount > 0 ? `\nUsed: ${this.snippet.useCount} times` : '';

        return `${this.snippet.title}${desc}${tags}${usage}\n\nLanguage: ${this.snippet.language}`;
    }

    private getDescription(): string {
        const preview = this.snippet.content.slice(0, 50).replace(/\s+/g, ' ');
        const tags = this.snippet.tags.slice(0, 3).join(', ');
        return `${preview}${preview.length < this.snippet.content.length ? '...' : ''} • ${tags}`;
    }
}