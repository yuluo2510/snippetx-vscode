import * as vscode from 'vscode';
import { SnippetManager } from './snippetManager';
import { SnippetProvider } from './snippetProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('SnippetX extension is now active!');

    const snippetManager = new SnippetManager(context);
    const snippetProvider = new SnippetProvider(snippetManager);

    const treeView = vscode.window.createTreeView('snippetx.explorer', {
        treeDataProvider: snippetProvider
    });

    // Register commands
    const saveSnippet = vscode.commands.registerCommand('snippetx.saveSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText.trim()) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }

        await snippetManager.saveSnippet(selectedText, editor.document.languageId);
    });

    const searchSnippets = vscode.commands.registerCommand('snippetx.searchSnippets', async () => {
        const query = await vscode.window.showInputBox({
            prompt: 'Search snippets by title, content, or tags',
            placeHolder: 'Enter search query...'
        });

        if (query) {
            const results = await snippetManager.searchSnippets(query);
            await showSearchResults(results);
        }
    });

    const recentSnippets = vscode.commands.registerCommand('snippetx.recentSnippets', async () => {
        const results = await snippetManager.getRecentSnippets();
        await showSearchResults(results);
    });

    const favorites = vscode.commands.registerCommand('snippetx.favorites', async () => {
        const results = await snippetManager.getFavorites();
        await showSearchResults(results);
    });

    context.subscriptions.push(
        saveSnippet,
        searchSnippets,
        recentSnippets,
        favorites,
        treeView
    );

    vscode.commands.executeCommand('setContext', 'snippetx:initialized', true);
}

async function showSearchResults(snippets: any[]) {
    if (snippets.length === 0) {
        vscode.window.showInformationMessage('No snippets found');
        return;
    }

    const picks = snippets.map(snippet => ({
        label: snippet.title,
        description: snippet.tags?.join(', ') || snippet.language,
        detail: snippet.content.slice(0, 100) + '...',
        snippet
    }));

    const selected = await vscode.window.showQuickPick(picks, {
        placeHolder: `Found ${snippets.length} snippets`
    });

    if (selected) {
        const doc = await vscode.workspace.openTextDocument({
            content: selected.snippet.content,
            language: selected.snippet.language
        });
        vscode.window.showTextDocument(doc);
    }
}

export function deactivate() {}