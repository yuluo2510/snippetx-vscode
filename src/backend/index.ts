// Entry point for SnippetX backend
import app from './app';
import { config } from './config';

const port = config.port;

app.listen(port, () => {
    console.log(`🚀 SnippetX backend server running on port ${port}`);
    console.log(`📡 Environment: ${config.env}`);
    console.log(`🔗 API base URL: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});