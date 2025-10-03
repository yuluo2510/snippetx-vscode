import * as vscode from 'vscode';
import { Snippet, SnippetManager } from './snippetManager';

export class SnippetXPanel {
    public static currentPanel: SnippetXPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it in the target column
        if (SnippetXPanel.currentPanel) {
            SnippetXPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'snippetx.panel',
            'SnippetX Manager',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        SnippetXPanel.currentPanel = new SnippetXPanel(panel, extensionUri);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        SnippetXPanel.currentPanel = new SnippetXPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        this._update();
                        break;
                    case 'insert':
                        await this.insertSnippet(message.snippetId);
                        break;
                    case 'delete':
                        await this.deleteSnippet(message.snippetId);
                        break;
                    case 'favorite':
                        await this.toggleFavorite(message.snippetId);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        SnippetXPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlContent(snippets: Snippet[]): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnippetX Manager</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            box-sizing: border-box;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .search-container {
            margin-bottom: 15px;
        }

        .search-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .filters {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .filter-button {
            padding: 4px 8px;
            font-size: 12px;
            background-color: var(--vscode-buttonbackground);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }

        .filter-button:hover {
            background-color: var(--vscode-button-hoverbackground);
        }

        .filter-button.active {
            background-color: var(--vscode-button-hoverbackground);
        }

        .snippet-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: calc(100vh - 200px);
            overflow-y: auto;
        }

        .snippet-card {
            background-color: var(--vscode-editor-selectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            transition: all 0.2s ease;
            position: relative;
        }

        .snippet-card:hover {
            border-color: var(--vscode-focusBorder);
            transform: translateY(-1px);
        }

        .snippet-title {
            font-weight: 600;
            font-size: 14px;
            margin: 0 0 8px 0;
            color: var(--vscode-editor-foreground);
        }

        .snippet-meta {
            display: flex;
            gap: 10px;
            margin-bottom: 8px;
            font-size: 12px;
            opacity: 0.7;
        }

        .language-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
        }

        .use-count {
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .quality-score {
            color: var(--vscode-gitDecoration-untrackedResourceForeground);
        }

        .snippet-content {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 10px;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 100px;
            overflow-y: auto;
        }

        .tags {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }

        .tag {
            background-color: var(--vscode-gitDecoration-modifiedResourceForeground);
            color: var(--vscode-editor-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
        }

        .snippet-actions {
            display: flex;
            gap: 5px;
            justify-content: flex-end;
        }

        .action-button {
            padding: 4px 8px;
            font-size: 11px;
            background-color: var(--vscode-buttonbackground);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .action-button:hover {
            background-color: var(--vscode-button-hoverbackground);
        }

        .action-button.danger {
            background-color: var(--vscode-editorError-foreground);
        }

        .action-button.danger:hover {
            background-color: var(--vscode-editorError-foreground);
            opacity: 0.9;
        }

        .favorite-star {
            color: var(--vscode-editorWarn-foreground);
            cursor: pointer;
        }

        .favorite-star.active {
            color: var(--vscode-editorWarn-foreground);
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-disabledForeground);
        }

        .empty-state h3 {
            margin-bottom: 10px;
        }

        .stats {
            font-size: 12px;
            color: var(--vscode-disabledForeground);
            margin-top: 10px;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-disabledForeground);
        }

        .code-block {
            font-family: 'Consolas', 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>SnippetX Manager</h2>
        <button class="action-button" onclick="refresh()">Refresh</button>
    </div>

    <div class="search-container">
        <input type="text" class="search-input" id="searchInput" placeholder="Search snippets by title, content, or tags..." />
    </div>

    <div class="filters">
        <button class="filter-button active" onclick="filterByType('all')">All</button>
        <button class="filter-button" onclick="filterByType('favorites')">Favorites</button>
        <button class="filter-button" onclick="filterByType('recent')">Recent</button>
    </div>

    <div id="snippetList" class="snippet-list">
        ${generateSnippetList(snippets)}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const snippets = ${JSON.stringify(snippets)};
        let filteredSnippets = [...snippets];
        let currentFilter = 'all';

        function generateSnippetList(items) {
            if (!items || items.length === 0) {
                return '<div class="empty-state"><h3>No snippets found</h3><p>Create your first snippet using Ctrl+Shift+S</p></div>';
            }

            return items.map(snippet => \`
                <div class="snippet-card" data-id="\${snippet.id}">
                    <div class="snippet-title">
                        \${snippet.title}
                        <span class="favorite-star \${snippet.isFavorited ? 'active' : ''}"
                              onclick="toggleFavorite('\${snippet.id}')">★</span>
                    </div>
                    <div class="snippet-meta">
                        <span class="language-badge">\${snippet.language}</span>
                        <span class="use-count">📈 \${snippet.useCount}</span>
                        <span class="quality-score">★\${snippet.qualityScore}/10</span>
                    </div>
                    <div class="snippet-content code-block">\${escapeHtml(snippet.content)}</div>
                    <div class="tags">
                        \${snippet.tags.map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
                    </div>
                    <div class="snippet-actions">
                        <button class="action-button" onclick="insertSnippet('\${snippet.id}')">Insert</button>
                        <button class="action-button" onclick="copySnippet('\${snippet.id}')">Copy</button>
                        <button class="action-button danger" onclick="deleteSnippet('\${snippet.id}')">Delete</button>
                    </div>
                </div>
            \`).join('');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function insertSnippet(id) {
            vscode.postMessage({ command: 'insert', snippetId: id });
        }

        function deleteSnippet(id) {
            if (confirm('Are you sure you want to delete this snippet?')) {
                vscode.postMessage({ command: 'delete', snippetId: id });
            }
        }

        function toggleFavorite(id) {
            vscode.postMessage({ command: 'favorite', snippetId: id });
        }

        function copySnippet(id) {
            const snippet = filteredSnippets.find(s => s.id === id);
            if (snippet) {
                navigator.clipboard.writeText(snippet.content).then(() => {
                    // Show confirmation briefly
                    const button = document.querySelector(\`button[onclick="copySnippet('\\${id}')"\`);
                    if (button) {
                        const originalText = button.textContent;
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                            button.textContent = originalText;
                        }, 1000);
                    }
                });
            }
        }

        function filterSnippets() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            let result = [...snippets];

            if (currentFilter === 'favorites') {
                result = result.filter(s => s.isFavorited);
            } else if (currentFilter === 'recent') {
                result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                result = result.slice(0, 20);
            }

            if (searchTerm) {
                result = result.filter(snippet =>
                    snippet.title.toLowerCase().includes(searchTerm) ||
                    snippet.content.toLowerCase().includes(searchTerm) ||
                    snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                    snippet.language.toLowerCase().includes(searchTerm)
                );
            }

            filteredSnippets = result;
            renderSnippets();
        }

        function filterByType(type) {
            currentFilter = type;

            // Update button states
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(\`button[onclick="filterByType('\\${type}')"\`).classList.add('active');

            filterSnippets();
        }

        function renderSnippets() {
            const container = document.getElementById('snippetList');
            container.innerHTML = generateSnippetList(filteredSnippets);
        }

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', filterSnippets);

        // Initialize
        filterSnippets();
    </script>
</body>
</html>
        `.replace('{{snippets}}', JSON.stringify(snippets));
    }

    private async refresh() {
        // This method would be implemented by the caller
        try {
            const snippets = await this.getAllSnippets();
            this._update(snippets);
        } catch (error) {
            console.error('Error refreshing snippets:', error);
        }
    }

    private async _update(snippets: Snippet[] = []) {
        this._panel.webview.html = this._getHtmlContent(snippets);
    }

    private insertSnippet(id: string) {
        vscode.postMessage({ command: 'insert', snippetId: id });
    }

    private deleteSnippet(id: string) {
        vscode.postMessage({ command: 'delete', snippetId: id });
    }

    private toggleFavorite(id: string) {
        vscode.postMessage({ command: 'favorite', snippetId: id });
    }
}

function generateSnippetList(snippets: Snippet[]): string {
    if (snippets.length === 0) {
        return `
            <div class="empty-state">
                <h3>No snippets found</h3>
                <p>Start saving snippets with Ctrl+Shift+S</p>
            </div>
        `;
    }

    return snippets.map((snippet, index) => `
        <div class="snippet-card" data-index="${index}">
            <div class="snippet-header">
                <div class="snippet-title">
                    ${snippet.title}
                    <span class="favorite ${snippet.isFavorited ? 'active' : ''}">★</span>
                </div>
                <div class="snippet-meta">
                    <span class="language">${snippet.language}</span>
                    <span class="usage">${snippet.useCount} uses</span>
                    <span class="quality">${snippet.qualityScore}/10</span>
                </div>
            </div>

            <div class="snippet-preview">
                <pre><code>${escapeHtml(snippet.content.substring(0, 200))}${snippet.content.length > 200 ? '...' : ''}</code></pre>
            </div>

            <div class="tags">
                ${snippet.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>

            <div class="actions">
                <button onclick="insert()">Insert</button>
                <button onclick="copy()">Copy</button>
                <button onclick="delete()">Delete</button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}