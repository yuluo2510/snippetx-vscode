import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

interface Snippet {
    id: string;
    content: string;
    language: string;
    title: string;
    tags: string[];
    useCount: number;
    isFavorited: boolean;
    createdAt: Date;
    updatedAt: Date;
    description?: string;
}

export class SnippetManager {
    private snippets: Snippet[] = [];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadSnippets();
    }

    private async loadSnippets() {
        const data = this.context.globalState.get<Snippet[]>('snippets', []);
        this.snippets = data.map(item => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }));
    }

    private async saveSnippets() {
        await this.context.globalState.update('snippets', this.snippets);
    }

    async saveSnippet(content: string, language: string, fileUri?: vscode.Uri): Promise<void> {
        const title = await vscode.window.showInputBox({
            prompt: 'Enter snippet title',
            placeHolder: 'Descriptive title for this snippet'
        });

        if (!title) {
            return;
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Enter snippet description (optional)',
            placeHolder: 'Brief description of what this snippet does'
        });

        const tagsInput = await vscode.window.showInputBox({
            prompt: 'Enter tags (comma-separated)',
            placeHolder: 'react,hooks,state-management'
        });

        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [language];

        const snippet: Snippet = {
            id: uuidv4(),
            content: content.trim(),
            language,
            title,
            tags: [...new Set([...tags, language])],
            useCount: 0,
            isFavorited: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            description: description || undefined
        };

        this.snippets.unshift(snippet);
        await this.saveSnippets();

        vscode.window.showInformationMessage(`Snippet "${title}" saved successfully!`);

        // Sync with backend if available
        this.syncWithBackend(snippet);
    }

    async searchSnippets(query: string): Promise<Snippet[]> {
        const lowercaseQuery = query.toLowerCase();

        return this.snippets.filter(snippet =>
            snippet.title.toLowerCase().includes(lowercaseQuery) ||
            snippet.content.toLowerCase().includes(lowercaseQuery) ||
            snippet.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
            snippet.language.toLowerCase().includes(lowercaseQuery)
        ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async getRecentSnippets(limit: number = 10): Promise<Snippet[]> {
        return this.snippets
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, limit);
    }

    async getFavorites(): Promise<Snippet[]> {
        return this.snippets
            .filter(snippet => snippet.isFavorited)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async toggleFavorite(id: string): Promise<void> {
        const snippet = this.snippets.find(s => s.id === id);
        if (snippet) {
            snippet.isFavorited = !snippet.isFavorited;
            snippet.updatedAt = new Date();
            await this.saveSnippets();
        }
    }

    async incrementUsage(id: string): Promise<void> {
        const snippet = this.snippets.find(s => s.id === id);
        if (snippet) {
            snippet.useCount++;
            snippet.updatedAt = new Date();
            await this.saveSnippets();
        }
    }

    async deleteSnippet(id: string): Promise<void> {
        const index = this.snippets.findIndex(s => s.id === id);
        if (index !== -1) {
            this.snippets.splice(index, 1);
            await this.saveSnippets();
        }
    }

    getAllSnippets(): Snippet[] {
        return [...this.snippets];
    }

    private async syncWithBackend(snippet: Snippet) {
        // Placeholder for backend sync
        try {
            const config = vscode.workspace.getConfiguration('snippetx');
            const apiUrl = config.get<string>('apiUrl', 'http://localhost:3000');

            fetch(`${apiUrl}/api/snippets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(snippet),
            }).catch(() => {
                // Silently fail if backend not available
            });
        } catch (error) {
            // Optional: implement retry or local queue
        }
    }
}