import * as vscode from 'vscode';

export class LanguageDetector {
    private readonly languageMap: Map<string, string> = new Map([
        ['js', 'javascript'],
        ['jsx', 'javascript'],
        ['ts', 'typescript'],
        ['tsx', 'typescript'],
        ['py', 'python'],
        ['java', 'java'],
        ['cpp', 'cpp'],
        ['c', 'c'],
        ['cs', 'csharp'],
        ['php', 'php'],
        ['rb', 'ruby'],
        ['go', 'go'],
        ['rs', 'rust'],
        ['swift', 'swift'],
        ['kt', 'kotlin'],
        ['scala', 'scala'],
        ['dart', 'dart'],
        ['lua', 'lua'],
        ['pl', 'perl'],
        ['html', 'html'],
        ['htm', 'html'],
        ['css', 'css'],
        ['scss', 'scss'],
        ['sass', 'scss'],
        ['less', 'less'],
        ['sql', 'sql'],
        ['sh', 'shell'],
        ['bash', 'shell'],
        ['ps1', 'powershell'],
        ['json', 'json'],
        ['yaml', 'yaml'],
        ['yml', 'yaml'],
        ['xml', 'xml'],
        ['Dockerfile', 'dockerfile'],
        ['dockerfile', 'dockerfile'],
        ['r', 'r'],
        ['m', 'matlab'],
        ['jl', 'julia'],
        ['elixir', 'elixir'],
        ['ex', 'elixir'],
        ['exs', 'elixir'],
        ['clj', 'clojure'],
        ['hs', 'haskell'],
        ['erl', 'erlang'],
        ['hrl', 'erlang']
    ]);

    // VS Code language ID to unified language name mapping
    private readonly vscodeLanguageMap: Map<string, string> = new Map([
        ['javascript', 'javascript'],
        ['typescript', 'typescript'],
        ['python', 'python'],
        ['java', 'java'],
        ['cpp', 'cpp'],
        ['c', 'c'],
        ['csharp', 'csharp'],
        ['php', 'php'],
        ['ruby', 'ruby'],
        ['go', 'go'],
        ['rust', 'rust'],
        ['swift', 'swift'],
        ['kotlin', 'kotlin'],
        ['scala', 'scala'],
        ['dart', 'dart'],
        ['lua', 'lua'],
        ['sql', 'sql'],
        ['powershell', 'powershell'],
        ['shellscript', 'shell'],
        ['html', 'html'],
        ['css', 'css'],
        ['scss', 'scss'],
        ['less', 'less'],
        ['json', 'json'],
        ['yaml', 'yaml'],
        ['xml', 'xml'],
        ['dockerfile', 'dockerfile'],
        ['r', 'r'],
        ['julia', 'julia'],
        ['clojure', 'clojure'],
        ['haskell', 'haskell'],
        ['erlang', 'erlang']
    ]);

    /**
     * Detect the programming language based on VS Code language ID and filename
     */
    detectLanguage(vscodeLanguageId: string, filename?: string): string {
        // 1. Try VS Code language ID first
        const mappedLanguage = this.vscodeLanguageMap.get(vscodeLanguageId.toLowerCase());
        if (mappedLanguage) {
            return mappedLanguage;
        }

        // 2. Try to detect from filename extension
        if (filename) {
            const extension = this.getFileExtension(filename);
            const extensionLanguage = this.languageMap.get(extension.toLowerCase());
            if (extensionLanguage) {
                return extensionLanguage;
            }
        }

        // 3. Fallback to detecting from content or use a generic type
        if (filename) {
            const extension = this.getFileExtension(filename);
            if (extension) {
                return extension; // Return the extension itself as fallback
            }
        }

        // 4. Worst case - use plain text
        return this.getFallbackLanguage(vscodeLanguageId);
    }

    /**
     * Get file extension and handle common edge cases
     */
    private getFileExtension(filename: string): string {
        const basename = filename.split('/').pop() || filename;
        const parts = basename.split('.');

        if (parts.length <= 1) {
            return parts[0]; // No extension
        }

        // Handle special cases
        const extension = parts[parts.length - 1].toLowerCase();

        // Handle React JSX/TSX
        if (extension === 'jsx' && vscodeLanguageId === 'javascriptreact') return 'javascript';
        if (extension === 'tsx' && vscodeLanguageId === 'typescriptreact') return 'typescript';

        // Handle Docker
        if (basename.toLowerCase().includes('dockerfile')) return 'dockerfile';

        // Handle Makefile
        if (basename === 'Makefile' || basename.toLowerCase() === 'makefile') return 'makefile';

        return extension;
    }

    /**
     * Get fallback language based on common patterns
     */
    private getFallbackLanguage(vscodeLanguageId: string): string {
        // Normalize the language ID
        const normalized = vscodeLanguageId.toLowerCase();

        // Common fallback mappings
        const fallbackMap: { [key: string]: string } = {
            'plaintext': 'plaintext',
            'text': 'plaintext',
            'log': 'plaintext',
            'csv': 'data',
            'markdown': 'markdown',
            'xml': 'xml',
            'yaml': 'yaml',
            'json': 'json',
            'properties': 'properties',
            'ini': 'ini',
            'conf': 'config',
            'cfg': 'config',
            'config': 'config'
        };

        return fallbackMap[normalized] || normalized;
    }

    /**
     * Detect language from file content using various heuristics
     */
    detectLanguageFromContent(content: string, filename?: string): string {
        const content = content.toLowerCase();

        // JavaScript detection patterns
        if (content.includes('import') && content.includes('from') ||
            content.includes('require(') && content.includes('module.exports') ||
            content.includes('console.log') && content.includes('function')) {
            return 'javascript';
        }

        // TypeScript detection
        if (content.includes(': string') || content.includes(': number') ||
            content.includes(': boolean') || content.includes('interface')) {
            return 'typescript';
        }

        // Python detection
        if (content.includes('def ') || content.includes('import ') ||
            content.startsWith('#!/usr/bin/env python') ||
            content.includes('class ') && content.includes('__init__')) {
            return 'python';
        }

        // Java detection
        if (content.includes('public class') || content.includes('import java.') ||
            content.includes('System.out.println')) {
            return 'java';
        }

        // C++ detection
        if (content.includes('#include <iostream>') || content.includes('std::cout') ||
            content.includes('namespace std') || content.includes('int main()')) {
            return 'cpp';
        }

        // C detection
        if (content.includes('#include <stdio.h>') || content.includes('printf(') ||
            content.includes('int main()')) {
            return 'c';
        }

        // Go detection
        if (content.includes('package main') || content.includes('func main()') ||
            content.includes('import "fmt"')) {
            return 'go';
        }

        // Rust detection
        if (content.includes('fn main()') || content.includes('use std::') ||
            content.includes('let mut ')) {
            return 'rust';
        }

        // Shell detection
        if (content.startsWith('#!/bin/bash') || content.startsWith('#!/bin/sh') ||
            content.includes('echo ') || content.includes('curl ')) {
            return 'shell';
        }

        // Docker detection
        if (content.startsWith('from') || content.includes('dockerfile') ||
            filename?.toLowerCase().includes('dockerfile')) {
            return 'dockerfile';
        }

        // YAML detection
        if (content.match(/^\s*\w+:\s*\w/) || content.match(/^\s*-\s*\w/)) {
            return 'yaml';
        }

        // JSON detection
        if (content.trim().startsWith('{') && content.trim().endsWith('}') ||
            content.trim().startsWith('[') && content.trim().endsWith(']')) {
            return 'json';
        }

        // If we can't determine, use filename or generic text
        if (filename) {
            const extension = filename.split('.').pop();
            if (extension) {
                const mapped = this.languageMap.get(extension.toLowerCase());
                if (mapped) return mapped;
            }
        }

        return 'plaintext';
    }

    /**
     * Get a pretty name for the language (e.g., for UI display)
     */
    getLanguageDisplayName(language: string): string {
        const displayNames: { [key: string]: string } = {
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'python': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'csharp': 'C#',
            'php': 'PHP',
            'ruby': 'Ruby',
            'go': 'Go',
            'rust': 'Rust',
            'swift': 'Swift',
            'kotlin': 'Kotlin',
            'scala': 'Scala',
            'dart': 'Dart',
            'lua': 'Lua',
            'perl': 'Perl',
            'html': 'HTML',
            'css': 'CSS',
            'scss': 'SCSS',
            'less': 'LESS',
            'sql': 'SQL',
            'shell': 'Shell',
            'powershell': 'PowerShell',
            'dockerfile': 'Dockerfile',
            'r': 'R',
            'matlab': 'MATLAB',
            'julia': 'Julia',
            'elixir': 'Elixir',
            'clojure': 'Clojure',
            'haskell': 'Haskell',
            'erlang': 'Erlang'
        };

        return displayNames[language] || language.toUpperCase();
    }

    /**
     * Get file icon class/emoji based on language
     */
    getLanguageIcon(language: string): string {
        const icons: { [key: string]: string } = {
            'javascript': '🟨',
            'typescript': '📘',
            'python': '🐍',
            'java': '☕',
            'go': '🐹',
            'rust': '🦀',
            'php': '🐘',
            'ruby': '💎',
            'csharp': '🔷',
            'cpp': '🔵',
            'c': '⚙️',
            'swift': '🦅',
            'kotlin': '🟪',
            'dart': '🎯',
            'html': '🌐',
            'css': '🎨',
            'sql': '🗄️',
            'shell': '🐚',
            'dockerfile': '🐳',
            'yaml': '📝',
            'json': '📁',
            'markdown': '📄'
        };

        return icons[language] || '📄';
    }
}