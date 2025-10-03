import express from 'express';
import axios from 'axios';
import { config } from '../config';

const router = express.Router();

interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    download_url: string;
    type: string;
}

// Sync with GitHub repository
router.post('/github', async (req, res) => {
    try {
        const { repository, branch = 'main', snippets } = req.body;

        if (!repository) {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'repository is required (format: owner/repo)'
            });
        }

        if (!config.github.token) {
            return res.status(500).json({
                error: 'Configuration error',
                message: 'GitHub token not configured'
            });
        }

        // Split repository into owner and repo
        const [owner, repo] = repository.split('/');
        if (!owner || !repo) {
            return res.status(400).json({
                error: 'Invalid repository format',
                message: 'Repository must be in format: owner/repo'
            });
        }

        const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/snippets`;
        const headers = {
            'Authorization': `token ${config.github.token}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        let existingFiles: GitHubFile[] = [];
        try {
            const response = await axios.get(githubUrl, { headers });
            existingFiles = response.data.filter((file: any) => file.type === 'file' && file.name.endsWith('.json'));
        } catch (error: any) {
            if (error.response?.status !== 404) {
                throw error;
            }
            // Directory doesn't exist, we'll create it
        }

        // Base64 encode the snippets
        const snippetFile = {
            name: `snippets-collection-${Date.now()}.json`,
            path: `snippets/snippets-collection-${Date.now()}.json`,
            content: Buffer.from(JSON.stringify(snippets, null, 2)).toString('base64'),
            message: `Add/update snippets collection - ${new Date().toISOString()}`
        };

        // Create or update the file
        const uploadResponse = await axios({
            method: 'PUT',
            url: `https://api.github.com/repos/${owner}/${repo}/contents/${snippetFile.path}`,
            headers,
            data: {
                message: snippetFile.message,
                content: snippetFile.content,
                branch
            }
        });

        res.json({
            success: true,
            data: {
                url: uploadResponse.data.content.html_url,
                sha: uploadResponse.data.content.sha,
                downloadUrl: uploadResponse.data.content.download_url
            },
            message: 'Successfully synced with GitHub'
        });
    } catch (error: any) {
        console.error('Error syncing with GitHub:', error);
        let message = 'Failed to sync with GitHub';

        if (error.response?.data?.message) {
            message += ': ' + error.response.data.message;
        }

        res.status(500).json({
            error: 'GitHub sync error',
            message
        });
    }
});

// Download snippets from GitHub
router.get('/github', async (req, res) => {
    try {
        const { repository, branch = 'main' } = req.query;

        if (!repository || typeof repository !== 'string') {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'repository is required (format: owner/repo)'
            });
        }

        if (!config.github.token) {
            return res.status(500).json({
                error: 'Configuration error',
                message: 'GitHub token not configured'
            });
        }

        const [owner, repo] = repository.split('/');
        if (!owner || !repo) {
            return res.status(400).json({
                error: 'Invalid repository format',
                message: 'Repository must be in format: owner/repo'
            });
        }

        const headers = {
            'Authorization': `token ${config.github.token}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        // Get contents of snippets directory
        const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/snippets?ref=${branch}`;
        const response = await axios.get(githubUrl, { headers });

        const jsonFiles = response.data.filter((file: any) => file.type === 'file' && file.name.endsWith('.json'));

        const allSnippets: any[] = [];

        // Download and parse each JSON file
        for (const file of jsonFiles) {
            try {
                const fileResponse = await axios.get(file.download_url);
                const snippets = fileResponse.data;

                if (Array.isArray(snippets)) {
                    allSnippets.push(...snippets);
                } else {
                    allSnippets.push(snippets);
                }
            } catch (error) {
                console.warn(`Failed to download file ${file.name}:`, error);
            }
        }

        res.json({
            success: true,
            data: allSnippets,
            message: `Successfully downloaded ${allSnippets.length} snippets from GitHub`
        });
    } catch (error: any) {
        console.error('Error downloading from GitHub:', error);
        let message = 'Failed to download from GitHub';

        if (error.response?.status === 404) {
            message = 'No snippets found in repository';
        } else if (error.response?.data?.message) {
            message += ': ' + error.response.data.message;
        }

        res.status(500).json({
            error: 'GitHub download error',
            message
        });
    }
});

// Get sync status
router.get('/status', async (req, res) => {
    try {
        const { repository } = req.query;

        if (!repository || typeof repository !== 'string') {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'repository is required'
            });
        }

        // Basic status check - can be expanded with actual sync tracking
        const status = {
            repository,
            lastSync: new Date().toISOString(),
            syncActive: !!config.github.token,
            source: 'github',
            status: 'connected'
        };

        res.json({
            success: true,
            data: status,
            message: 'Sync status retrieved successfully'
        });
    } catch (error: any) {
        console.error('Error getting sync status:', error);
        res.status(500).json({
            error: 'Status check error',
            message: 'Failed to check sync status'
        });
    }
});

// Test GitHub connection
router.post('/test', async (req, res) => {
    try {
        if (!config.github.token) {
            return res.status(500).json({
                success: false,
                message: 'GitHub token not configured',
                connected: false
            });
        }

        const response = await axios.get('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${config.github.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        res.json({
            success: true,
            data: {
                connected: true,
                user: response.data.login,
                avatar: response.data.avatar_url
            },
            message: 'GitHub connection successful'
        });
    } catch (error: any) {
        console.error('Error testing GitHub connection:', error);
        res.status(500).json({
            success: false,
            connected: false,
            message: 'Failed to connect to GitHub'
        });
    }
});

export default router;