// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';
import { SnippetManager } from './snippetManager';
import { SnippetProvider } from './snippetProvider';
import { WebviewPanel } from './webviewPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('SnippetX extension is now active!');

    // Initialize managers
    const snippetManager = new SnippetManager(context);
    const snippetProvider = new SnippetProvider(snippetManager);

    // Register with activity bar
    vscode.window.registerTreeDataProvider('snippetx.explorer', snippetProvider);

    // Commands
    const saveCommand = vscode.commands.registerCommand('snippetx.saveSnippet', async () => {
        try {
            await snippetManager.saveSnippetFromSelection();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save snippet: ${error}`);
        }
    });

    const searchCommand = vscode.commands.registerCommand('snippetx.searchSnippets', async () => {
        try {
            const query = await vscode.window.showInputBox({
                prompt: 'Search snippets by keyword or tag...',
                placeHolder: 'Enter search term...'
            });

            if (query) {
                const results = await snippetManager.searchSnippets(query);
                await showSearchResults(results, snippetManager);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error searching snippets: ${error}`);
        }
    });

    const recentCommand = vscode.commands.registerCommand('snippetx.recentSnippets', async () => {
        try {
            const recent = await snippetManager.getRecentSnippets();
            await showSearchResults(recent, snippetManager);
        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching recent snippets: ${error}`);
        }
    });

    const favoritesCommand = vscode.commands.registerCommand('snippetx.favorites', async () => {
        try {
            const favorites = await snippetManager.getFavoriteSnippets();
            await showSearchResults(favorites, snippetManager);
        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching favorites: ${error}`);
        }
    });

    // Add commands to subscriptions
    context.subscriptions.push(saveCommand, searchCommand, recentCommand, favoritesCommand);

    // Update tree view
    vscode.commands.executeCommand('setContext', 'snippetx:initialized', true);

    // Show welcome message
    const config = vscode.workspace.getConfiguration('snippetx');
    if (config.get('showNotifications', true)) {
        vscode.window.showInformationMessage(
            'SnippetX is ready! Use Ctrl+Shift+S to save snippets.',
            'Open Settings'
        ).then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'snippetx');
            }
        });
    }
}

async function showSearchResults(results: any[], snippetManager: SnippetManager) {
    if (results.length === 0) {
        vscode.window.showInformationMessage('No snippets found matching your search.');
        return;
    }

    const items = results.map(snippet => ({
        label: snippet.title,
        description: `${snippet.language} • ${snippet.tags?.slice(0, 2).join(', ') || 'No tags'}`,
        detail: snippet.description || 'No description',
        snippetData: snippet
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a snippet to insert',
        canPickMany: false
    });

    if (selected?.snippetData) {
        await snippetManager.insertSnippet(selected.snippetData);
    }
}

export function deactivate() {
    console.log('SnippetX extension is now deactivated');
}