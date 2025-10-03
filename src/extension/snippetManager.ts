import * as vscode from 'vscode';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SnippetApi } from './snippetApi';
import { LanguageDetector } from './languageDetector';
import { AITagger } from './aiTagger';

export interface Snippet {
    id: string;
    content: string;
    language: string;
    title: string;
    tags: string[];
    description?: string;
    useCount: number;
    qualityScore: number;
    isFavorited: boolean;
    createdAt: Date;
    lastUsedAt?: Date;
}

export class SnippetManager {
    private snippets: Map<string, Snippet> = new Map();
    private readonly config: vscode.WorkspaceConfiguration;
    private readonly api: SnippetApi;
    private readonly languageDetector: LanguageDetector;
    private readonly aiTagger: AITagger;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.config = vscode.workspace.getConfiguration('snippetx');
        this.api = new SnippetApi(this.config);
        this.languageDetector = new LanguageDetector();
        this.aiTagger = new AITagger(this.config);

        this.loadSnippets();
    }

    async saveSnippetFromSelection(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText.trim()) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }

        const language = this.languageDetector.detectLanguage(editor.document.languageId, editor.document.fileName);

        // Show save dialog
        const title = await vscode.window.showInputBox({
            prompt: 'Enter a title for this snippet',
            placeHolder: 'e.g., React useState with TypeScript',
            value: this.generateTitle(selectedText, language)
        });

        if (!title) {
            return; // User cancelled
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Enter an optional description',
            placeHolder: 'Brief description of what this snippet does...'
        });

        try {
            // Show progress
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Saving snippet...',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Detecting language...' });

                progress.report({ message: 'Analyzing content...' });
                let tags: string[] = [];

                try {
                    tags = await this.aiTagger.generateTags(selectedText, title);
                } catch (error) {
                    console.warn('AI tagging failed, using basic tags:', error);
                    tags = this.generateBasicTags(selectedText, language);
                }

                const snippet: Snippet = {
                    id: uuidv4(),
                    content: selectedText,
                    language,
                    title,
                    tags,
                    description: description || undefined,
                    useCount: 0,
                    qualityScore: this.calculateQualityScore(selectedText),
                    isFavorited: false,
                    createdAt: new Date()
                };

                progress.report({ message: 'Saving to local storage...' });
                this.snippets.set(snippet.id, snippet);
                await this.saveSnippets();

                progress.report({ message: 'Syncing to cloud...' });
                await this.api.saveSnippet(snippet);

                vscode.window.showInformationMessage(
                    `Snippet "${title}" saved successfully!`,
                    'View All',
                    'Copy Code'
                ).then(selection => {
                    if (selection === 'View All') {
                        vscode.commands.executeCommand('snippetx.searchSnippets');
                    } else if (selection === 'Copy Code') {
                        vscode.env.clipboard.writeText(selectedText);
                        vscode.window.showInformationMessage('Code copied to clipboard!');
                    }
                });
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save snippet: ${error}`);
        }
    }

    async searchSnippets(query: string): Promise<Snippet[]> {
        const queryLower = query.toLowerCase();

        return Array.from(this.snippets.values())
            .filter(snippet =>
                snippet.title.toLowerCase().includes(queryLower) ||
                snippet.content.toLowerCase().includes(queryLower) ||
                snippet.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
                snippet.language.toLowerCase().includes(queryLower) ||
                (snippet.description && snippet.description.toLowerCase().includes(queryLower))
            )
            .sort((a, b) => {
                // Prioritize by use count, then quality score, then creation date
                if (b.useCount !== a.useCount) return b.useCount - a.useCount;
                if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
                return b.createdAt.getTime() - a.createdAt.getTime();
            });
    }

    async getRecentSnippets(limit: number = 20): Promise<Snippet[]> {
        return Array.from(this.snippets.values())
            .sort((a, b) => (b.lastUsedAt || b.createdAt).getTime() - (a.lastUsedAt || a.createdAt).getTime())
            .slice(0, limit);
    }

    async getFavoriteSnippets(): Promise<Snippet[]> {
        return Array.from(this.snippets.values())
            .filter(snippet => snippet.isFavorited)
            .sort((a, b) => a.title.localeCompare(b.title));
    }

    async insertSnippet(snippet: Snippet): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor');
            return;
        }

        await editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, snippet.content);
        });

        // Update usage count and last used date
        if (this.snippets.has(snippet.id)) {
            const localSnippet = this.snippets.get(snippet.id)!;
            localSnippet.useCount++;
            localSnippet.lastUsedAt = new Date();
            await this.saveSnippets();

            // Add to clipboard as well
            await vscode.env.clipboard.writeText(snippet.content);
            vscode.window.showInformationMessage(`Snippet inserted and copied to clipboard!`);
        }
    }

    async deleteSnippet(id: string): Promise<void> {
        this.snippets.delete(id);
        await this.saveSnippets();
        await this.api.deleteSnippet(id);
    }

    async toggleFavorite(id: string): Promise<void> {
        if (this.snippets.has(id)) {
            const snippet = this.snippets.get(id)!;
            snippet.isFavorited = !snippet.isFavorited;
            await this.saveSnippets();
        }
    }

    getAllSnippets(): Snippet[] {
        return Array.from(this.snippets.values());
    }

    private generateTitle(text: string, language: string): string {
        const lines = text.split('\n').slice(0, 5);
        const firstLine = lines[0]?.trim();

        if (firstLine && firstLine.length < 50) {
            return `${language}: ${firstLine}`;
        }

        return `${language}: ${text.substring(0, 30)}...`;
    }

    private generateBasicTags(text: string, language: string): string[] {
        const tags = [language];
        const commonPatterns = {
            'async': /\basync\s+function|(?:await|async)\b/g,
            'promise': /\bPromise|\.then\(|\.catch\(|async\/await\b/g,
            'api': /\b(fetch|axios|request|GET|POST|PUT|DELETE)\b/g,
            'database': /\b(database|sql|query|mongodb|redis|postgres)\b/g,
            'react': /\b(React|useState|useEffect|Component|JSX)\b/g,
            'vue': /\b(Vue|ref|reactive|computed|watch)\b/g,
            'error': /\b(error|exception|try|catch|finally)\b/g,
            'validation': /\b(validate|check|required|regex|validator)\b/g
        };

        text = text.toLowerCase();

        for (const [tag, pattern] of Object.entries(commonPatterns)) {
            if (pattern.test(text)) {
                tags.push(tag);
            }
        }

        return [...new Set(tags)].slice(0, 5);
    }

    private calculateQualityScore(text: string): number {
        let score = 5.0;

        // Length bonus
        if (text.length < 20) score -= 2.0;
        else if (text.length > 200) score += 1.0;

        // Comment bonus
        if (text.includes('//') || text.includes('/*') || text.includes('# ')) score += 1.0;

        // Documentation bonus
        if (text.includes('@param') || text.includes('@return') || text.includes('/**')) score += 1.0;

        // Error handling bonus
        if (text.includes('try') || text.includes('catch')) score += 0.5;

        // Validation bonus
        if (text.includes('validate') || text.includes('check') || text.includes('assert')) score += 0.5;

        return Math.min(score, 10.0);
    }

    private async loadSnippets(): Promise<void> {
        try {
            const saved = context.workspaceState.get('snippets', []);
            this.snippets = new Map(saved.map((s: Snippet) => [s.id, s]));
        } catch (error) {
            console.error('Failed to load snippets:', error);
            this.snippets = new Map();
        }
    }

    private async saveSnippets(): Promise<void> {
        try {
            await this.context.workspaceState.update('snippets', Array.from(this.snippets.values()));
        } catch (error) {
            console.error('Failed to save snippets:', error);
        }
    }
}