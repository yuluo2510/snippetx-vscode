const vscode = require('vscode');

function activate(context) {
    console.log('SnippetX extension activated!');

    // === 状态管理 ===
    let snippets = context.globalState.get('snippets', []) || [];

    // === 核心功能 ===
    const saveSnippet = vscode.commands.registerCommand('snippetx.saveSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('❌ 请先打开编辑器');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText.trim()) {
            vscode.window.showErrorMessage('❌ 请选中文本');
            return;
        }

        const title = await vscode.window.showInputBox({
            prompt: '📋 片段标题',
            placeholder: '如：React Hook'
        });

        if (!title) return;

        const description = await vscode.window.showInputBox({
            prompt: '📝 描述（可选）'
        });

        const snippet = {
            id: Date.now(),
            title: title.trim(),
            description: description || '',
            content: selectedText.trim(),
            language: editor.document.languageId || 'plaintext',
            tags: [editor.document.languageId || 'plaintext'],
            isFavorite: false,
            createdAt: new Date().toISOString()
        };

        snippets.unshift(snippet);
        context.globalState.update('snippets', snippets);

        vscode.window.showInformationMessage(`✅ 保存成功：${title}`, '查看所有').then(() => {
            vscode.commands.executeCommand('snippetx.viewAll');
        });
    });

    const viewAllSnippets = vscode.commands.registerCommand('snippetx.viewAll', async () => {
        if (snippets.length === 0) {
            vscode.window.showInformationMessage('📭 暂无任何片段');
            return;
        }

        const picks = snippets.map(s => ({
            label: s.title,
            description: `${s.language} • ${s.tags.join(', ')}`,
            detail: s.content.slice(0, 80) + (s.content.length > 80 ? '...' : ''),
            snippet: s
        }));

        const selected = await vscode.window.showQuickPick(picks, {
            placeHolder: `📂 所有片段 (${snippets.length} 个)`
        });

        if (selected) {
            vscode.workspace.openTextDocument({
                content: selected.snippet.content,
                language: selected.snippet.language
            }).then(doc => vscode.window.showTextDocument(doc));
        }
    });

    const searchSnippets = vscode.commands.registerCommand('snippetx.searchSnippets', async () => {
        const query = await vscode.window.showInputBox({
            prompt: '🔍 搜索片段',
            placeholder: '关键词...'
        });

        if (!query) return;

        const results = snippets.filter(s =>
            s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.content.toLowerCase().includes(query.toLowerCase()) ||
            s.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );

        if (results.length === 0) {
            vscode.window.showInformationMessage('🔍 无匹配结果');
            return;
        }

        const picks = results.map(s => ({
            label: s.title,
            description: `${s.language} • ${s.tags.join(', ')}`,
            detail: s.content.slice(0, 80) + '...',
            snippet: s
        }));

        const selected = await vscode.window.showQuickPick(picks, {
            placeHolder: `📊 结果 (${results.length} 个)`
        });

        if (selected) {
            vscode.workspace.openTextDocument({
                content: selected.snippet.content,
                language: selected.snippet.language
            }).then(doc => vscode.window.showTextDocument(doc));
        }
    });

    // === 注册所有命令 ===
    context.subscriptions.push(
        saveSnippet,
        searchSnippets,
        viewAllSnippets
    );

    // === 激活提示 ===
    vscode.window.showInformationMessage('🚀 SnippetX 已激活！Ctrl+Shift+S 保存片段');
    console.log('SnippetX: Extension activated');
}

function deactivate() {}

module.exports = { activate, deactivate };