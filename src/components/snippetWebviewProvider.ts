import * as vscode from 'vscode';

export class SnippetWebviewProvider implements vscode.WebviewViewProvider {

    constructor(private extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'saveSnippet':
                    vscode.commands.executeCommand('snippetx.saveSnippet');
                    break;
                case 'searchSnippets':
                    vscode.commands.executeCommand('snippetx.searchSnippets');
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnippetX Dashboard</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
        }
        .welcome {
            text-align: center;
            padding: 20px;
        }
        .actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 3px;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="welcome">
        <h2>SnippetX</h2>
        <p>Your intelligent code snippet manager</p>
    </div>
    <div class="actions">
        <button onclick="saveSnippet()">Save Code Snippet</button>
        <button onclick="searchSnippets()">Search Snippets</button>
        <button onclick="showRecent()">Recent Snippets</button>
        <button onclick="showFavorites()">Favorites</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function saveSnippet() {
            vscode.postMessage({ type: 'saveSnippet' });
        }

        function searchSnippets() {
            vscode.postMessage({ type: 'searchSnippets' });
        }

        function showRecent() {
            vscode.postMessage({ type: 'recentSnippets' });
        }

        function showFavorites() {
            vscode.postMessage({ type: 'favorites' });
        }
    </script>
</body>
</html>`;
    }
}