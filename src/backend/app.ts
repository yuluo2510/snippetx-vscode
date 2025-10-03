import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { errorHandler } from './middleware/errorHandler';
import snippetRoutes from './routes/snippets';
import syncRoutes from './routes/sync';
import { rateLimiter } from './middleware/rateLimiter';
import { validateApiKey } from './middleware/auth';

const app = express();

// Basic security and middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: [
        'vscode-file://vscode-app',
        'http://localhost:4000', // Extension development
        'https://snippetx.dev',
        'https://www.snippetx.dev'
    ],
    credentials: true
}));

// Parser middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Documentation endpoint
app.get('/api', (_req, res) => {
    res.json({
        name: 'SnippetX API',
        version: '1.0.0',
        description: 'AI-powered code snippet management API',
        endpoints: {
            snippets: {
                create: 'POST /api/snippets',
                search: 'GET /api/snippets/search',
                get: 'GET /api/snippets/:id',
                update: 'PUT /api/snippets/:id',
                delete: 'DELETE /api/snippets/:id'
            },
            sync: {
                github: 'POST /api/sync/github',
                status: 'GET /api/sync/status'
            }
        }
    });
});

// Rate limiting for all routes
app.use('/api', rateLimiter);

// Authentication for protected routes
app.use('/api/**', validateApiKey);

// Routes
app.use('/api/v1/snippets', snippetRoutes);
app.use('/api/v1/sync', syncRoutes);

// Cache invalidation endpoint for extension
app.post('/api/v1/cache/invalidate', (_req, res) => {
    // TODO: Invalidate Redis cache
    res.json({ message: 'Cache invalidated successfully' });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

export default app;