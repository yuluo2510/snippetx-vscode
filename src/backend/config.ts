// Configuration for SnippetX backend
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),

    // Database
    database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost/snippetx',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
        ssl: process.env.NODE_ENV === 'production',
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        cacheTTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
    },

    // API Keys
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '200'),
    },

    github: {
        token: process.env.GITHUB_TOKEN || '',
        defaultRepo: process.env.GITHUB_DEFAULT_REPO || 'snippetx-backup',
        owner: process.env.GITHUB_OWNER || process.env.GITHUB_USERNAME || 'snippetx',
    },

    // Security
    apiKey: process.env.API_KEY || 'dev-api-key',
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // Limit each IP to 100 requests per windowMs
    },

    // File upload
    uploads: {
        maxSize: 50 * 1024, // 50KB max sized uploads
        allowedLanguages: [
            'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go',
            'rust', 'swift', 'kotlin', 'scala', 'dart', 'lua', 'perl', 'html', 'css', 'scss',
            'less', 'sql', 'bash', 'shell', 'json', 'yaml', 'xml', 'dockerfile', 'powershell',
            'r', 'matlab', 'julia', 'elixir', 'clojure', 'haskell', 'elixir', 'erlang'
        ],
    },

    // Features
    features: {
        aiEnabled: process.env.AI_ENABLED !== 'false',
        cachingEnabled: process.env.CACHING_ENABLED !== 'false',
        prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
    }
};