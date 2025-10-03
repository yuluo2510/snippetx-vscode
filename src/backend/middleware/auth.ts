import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username?: string;
        email?: string;
    };
}

export const validateApiKey = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Skip auth for health check and documentation
        if (req.path === '/health' || req.path === '/') {
            return next();
        }

        // Check API key from query param or header
        const apiKey = req.query.apiKey as string ||
                      req.headers['x-api-key'] as string ||
                      req.headers.authorization?.replace('Bearer ', '');

        if (!apiKey) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'API key is required'
            });
        }

        // In development, accept dev-api-key
        if (config.env === 'development' && apiKey === 'dev-api-key') {
            req.user = { id: 'dev-user' };
            return next();
        }

        // In production, validate against configured API key
        if (apiKey === config.apiKey) {
            req.user = { id: 'admin-user' };
            return next();
        }

        // For future JWT support
        if (apiKey.startsWith('Bearer ') || apiKey.split('.').length === 3) {
            // JWT validation would go here
            req.user = { id: 'jwt-user' };
            return next();
        }

        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key'
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Authentication failed'
        });
    }
};