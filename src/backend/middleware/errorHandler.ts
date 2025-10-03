import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}

export const errorHandler = (
    error: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Default error
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    let code = error.code || 'INTERNAL_ERROR';

    console.error('API Error:', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            statusCode: error.statusCode
        },
        request: {
            method: req.method,
            url: req.url,
            body: req.body,
            query: req.query,
            params: req.params
        }
    });

    // Mongoose validation error
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        code = 'VALIDATION_ERROR';
    }

    // MongoDB duplicate key error
    if (error.code === 11000) {
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_RESOURCE';
    }

    // MongoDB cast error
    if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
        code = 'INVALID_ID';
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }

    if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }

    // Axios errors for external API calls
    if (error.response?.status) {
        statusCode = error.response.status;
        message = error.response.data?.message || error.response.statusText;
        code = 'EXTERNAL_API_ERROR';
    }

    // Known error patterns from our codebase
    switch (error.message) {
        case 'SNIPPET_NOT_FOUND':
            statusCode = 404;
            message = 'Snippet not found';
            code = 'SNIPPET_NOT_FOUND';
            break;
        case 'INVALID_SNIPPET_FORMAT':
            statusCode = 400;
            message = 'Invalid snippet format';
            code = 'INVALID_FORMAT';
            break;
        case 'RATE_LIMIT_EXCEEDED':
            statusCode = 429;
            message = 'Rate limit exceeded';
            code = 'RATE_LIMITED';
            break;
    }

    // Don't leak stack traces in production
    const response: any = {
        success: false,
        error: {
            message,
            code,
            statusCode
        }
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = error.stack;
        response.error.details = error.details || error;
    }

    res.status(statusCode).json(response);
};