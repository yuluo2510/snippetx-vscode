import * as vscode from 'vscode';

export class AITagger {
    private isEnabled: boolean = true;

    constructor(private config: vscode.WorkspaceConfiguration) {
        // AI services are optional in development
        this.isEnabled = !!config.get('enableAI', true);
    }

    async generateTags(code: string, title: string): Promise<string[]> {
        if (!this.isEnabled) {
            return this.generateBasicTags(code, title);
        }

        try {
            // In development mode, use basic analysis
            // In production, this would call OpenAI API:
            // const response = await this.callOpenAI(code, title);
            // return response.tags;

            return this.generateIntelligentTags(code, title);
        } catch (error) {
            console.warn('AI tagger failed, falling back to basic tagging:', error);
            return this.generateBasicTags(code, title);
        }
    }

    private generateIntelligentTags(code: string, title: string): Promise<string[]> {
        return new Promise((resolve) => {
            const tags = new Set<string>();
            const content = code.toLowerCase();
            const snippetTitle = title.toLowerCase();

            // Analyze code for patterns and concepts
            const patterns = {
                // Frontend frameworks
                'react': /react|usestate|useeffect|jsx|component|props/i,
                'vue': /vue|ref|reactive|computed|v-model|v-if/i,
                'angular': /angular|@component|ngfor|ngif|observable/i,
                'nextjs': /next\s*js|getserversideprops|getstaticprops/i,
                'svelte': /svelte|reactive|store/i,

                // Backend technologies
                'express': /express|app\.get|app\.post/i,
                'fastapi': /fastapi|@app\.\w+\(}/i,
                'nestjs': /@nestjs|@controller|@get|@post/i,
                'spring': /@springboot|spring\s*boot|@controller/i,

                // State management
                'redux': /redux|@redux\/toolkit|createSlice|redux-thunk/i,
                'mobx': /mobx|observable|action|computed/i,
                'zustand': /zustand|create|setState|getState/i,

                // Database operations
                'database': /sqlite|postgres|mysql|mongodb|redis/i,
                'orm': /sequelize|typeorm|prisma|mongoose|sqlalchemy/i,
                'query': /select|insert|update|delete|find|aggregate/i,

                // Testing
                'testing': /jest|mocha|chai|vitest|testing-library/i,
                'unit-test': /describe|it\(|test\(|assert|expect/i,
                'integration-test': /supertest|jest-mock-extended/i,

                // API and networking
                'api': /axios|fetch|api|request|response|endpoint/i,
                'rest': /rest\s*api|get|post|put|delete/i,
                'graphql': /graphql|apollo|query|mutation|subscription/i,

                // Error handling
                'error-handling': /try|catch|finally|throw|error|exception/i,
                'validation': /validate|check|required|regex|validator/i,

                // Security
                'auth': /auth|jwt|token|session|login|oauth|password/i,
                'security': /encrypt|decrypt|hash|salt|certificate|https/i,

                // Performance
                'performance': /performance|optimization|cache|async|await|promise/i,
                'caching': /cache|redis|memcached|ttl|expires/i,

                // File operations
                'file-io': /readfile|writefile|stream|buffer/i,
                'filesystem': /fs|path|mkdir|rm|stat/i,

                // UI/UX
                'ui': /css|scss|tailwind|bootstrap|mui|chakra/i,
                'responsive': /responsive|mobile|tablet|grid|flexbox/i,

                // React specific
                'hooks': /usestate|useeffect|usecontext|usememo|usecallback/i,
                'hoc': /higher\s*order\s*component|with\w+component/i,

                // CSS specific
                'animation': /animate|transition|keyframes|transform/i,
                'flexbox': /display:\s*flex|flex-direction|justify-content/i,
                'grid': /display:\s*grid|grid-template|grid-areas/i,

                // Node.js
                'nodejs': /node|process|fs|path|os|module|require|exports/i,
                'express': /express\.Router|app\.use|middleware|app\.listen/i,

                // DevOps
                'docker': /dockerfile|container|volume|network/i,
                'ci-cd': /github-actions|jenkins|travis|circleci|docker-compose/i,

                // Utilities
                'utility': /utility|helper|utils|common/i,
                'configuration': /config|settings|environment|dotenv/i,
                'logging': /log|console\.log|debug|winston/i
            };

            // Add environment-based tags
            if (code.includes('useState') || code.includes('useEffect')) tags.add('react');
            if (code.includes('v-for') || code.includes('@click')) tags.add('vue');
            if (code.includes('def ') || code.includes('import ') || code.includes('class ')) {
                tags.add('python');
            }
            if (code.includes('public class') || code.includes('private ') || code.includes('System.out')) {
                tags.add('java');
            }
            if (code.includes('#include') && code.includes('int main')) {
                if (code.includes('iostream') || code.includes('std::')) tags.add('cpp');
                else tags.add('c');
            }
            if (code.includes('package main') && code.includes('func main')) tags.add('go');
            if (code.includes('async') || code.includes('await')) tags.add('async');
            if (code.includes('promise') || code.includes('.then(')) tags.add('promise');
            if (code.includes('try') || code.includes('catch')) tags.add('error-handling');
            if (code.includes('console.log') || code.includes('console.error')) tags.add('debugging');
            if (code.includes('function') || code.includes('() =>')) tags.add('function');
            if (code.includes('class ') || code.includes('constructor')) tags.add('class');

            // Apply patterns with priorities
            for (const [tag, pattern] of Object.entries(patterns)) {
                if (pattern.test(content) || pattern.test(snippetTitle)) {
                    tags.add(tag);
                }
            }

            // Smart inference based on combination of patterns
            if (tags.has('react') && tags.has('api')) tags.add('react-api');
            if (tags.has('python') && tags.has('database')) tags.add('python-backend');
            if (tags.has('express') && tags.has('database')) tags.add('express-api');
            if (tags.has('error-handling') && tags.has('validation')) tags.add('robust-validation');

            // Remove generic tags when more specific ones are present
            if (tags.has('react-hooks')) tags.delete('react');
            if (tags.has('error-handling') && tags.has('validation')) tags.delete('validation');

            resolve(Array.from(tags).slice(0, 5)); // Return top 5 tags
        });
    }

    private generateBasicTags(code: string, title: string): string[] {
        const tags = new Set<string>();
        const content = code.toLowerCase();

        // Language-agnostic basic patterns
        if (code.includes('console.log') || code.includes('print(')) tags.add('debugging');
        if (code.includes('function') || code.includes('def ') || code.includes('func ')) tags.add('function');
        if (code.includes('class ') || code.includes('struct')) tags.add('class');
        if (code.includes('try') || code.includes('catch')) tags.add('error-handling');
        if (code.includes('import') || code.includes('require(')) tags.add('imports');
        if (code.includes('if(') || code.includes('if ')) tags.add('conditionals');
        if (code.includes('for(') || code.includes('for ') || code.includes('while(')) tags.add('loops');
        if (code.includes('async') || code.includes('await') || code.includes('promise')) tags.add('async');
        if (code.includes('//') || code.includes('/*') || code.includes('#')) tags.add('commented');

        // Extract technical keywords from content
        const technicalWords = new Set(['config', 'setup', 'utility', 'helper', 'validation', 'logger']);
        const titleWords = title.toLowerCase().split(/\s+/);
        titleWords.forEach(word => {
            if (technicalWords.has(word)) {
                tags.add(word);
            }
        });

        return Array.from(tags).slice(0, 5);
    }

    /**
     * Generate description for the snippet using AI or basic heuristics
     */
    async generateDescription(code: string, title: string): Promise<string> {
        if (!this.isEnabled) {
            return this.generateBasicDescription(code, title);
        }

        try {
            return this.generateIntelligentDescription(code, title);
        } catch (error) {
            console.warn('AI description failed, falling back to basic:', error);
            return this.generateBasicDescription(code, title);
        }
    }

    private generateIntelligentDescription(code: string, title: string): string {
        const content = code.trim();
        const length = content.split('\n').length;

        // Extract main functionality from first few lines
        const lines = content.split('\n').slice(0, 3).join(' ').trim();

        if (length <= 3) {
            return `Small utility snippet dealing with ${this.extractMainConcept(lines, title)}`;
        } else if (length <= 10) {
            return `Compact ${length}-line snippet for ${this.extractMainConcept(lines, title)}`;
        } else {
            return `Comprehensive implementation of ${this.extractMainConcept(lines, title)} spanning ${length} lines`;
        }
    }

    private generateBasicDescription(code: string, title: string): string {
        const lines = code.split('\n').length;
        const chars = code.length;

        if (lines === 1 && chars < 50) {
            return 'Single-line utility snippet';
        } else if (lines <= 5) {
            return `Short ${lines}-line helper snippet`;
        } else {
            return `Implementation of ${title.toLowerCase()} (${lines} lines)`;
        }
    }

    private extractMainConcept(content: string, title: string): string {
        const mainConcepts = [
            'data validation', 'api calls', 'authentication', 'data processing',
            'user interface components', 'error handling', 'file operations',
            'database operations', 'configuration management', 'logging utilities'
        ];

        const contentLower = content.toLowerCase();

        for (const concept of mainConcepts) {
            if (contentLower.includes(concept.split(' ')[0])) {
                return concept;
            }
        }

        return title.toLowerCase().includes('function') ? 'helper functionality' : 'utility code';
    }

    /**
     * Validate if code appears to be valid (basic syntax check)
     */
    validateCodeQuality(code: string, language: string): boolean {
        if (!code || code.trim().length < 5) return false;

        const trimmed = code.trim();

        switch (language.toLowerCase()) {
            case 'javascript':
            case 'typescript':
                // Check for balanced braces
                const openBraces = (trimmed.match(/\{/g) || []).length;
                const closeBraces = (trimmed.match(/\}/g) || []).length;
                const openParens = (trimmed.match(/\(/g) || []).length;
                const closeParens = (trimmed.match(/\)/g) || []).length;
                return openBraces === closeBraces && openParens === closeParens;

            case 'python':
                // Check indentation level is consistent
                const lines = trimmed.split('\n');
                const indentation = lines.map(line => line.match(/^\s*/)?.[0]?.length || 0);
                return lines.length <= 2 || indentation.every(indentation[0] === 0);

            case 'javascript':
            case 'html':
                return !trimmed.includes('<script>') || trimmed.includes('</script>');

            default:
                return true; // Allow all other languages by default
        }
    }
}