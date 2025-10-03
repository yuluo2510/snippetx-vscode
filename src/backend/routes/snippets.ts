import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const router = express.Router();

// In-memory storage for now - will be replaced with PostgreSQL
interface Snippet {
    id: string;
    content: string;
    language: string;
    title: string;
    tags: string[];
    description?: string;
    useCount: number;
    qualityScore: number;
    isFavorited: boolean;
    createdAt: Date;
    lastUsedAt?: Date;
    userId?: string;
}

interface CreateSnippetRequest {
    content: string;
    language: string;
    title: string;
    tags?: string[];
    description?: string;
}

const snippets: Map<string, Snippet> = new Map();

// Create a new snippet
router.post('/', async (req, res) => {
    try {
        const { content, language, title, tags, description }: CreateSnippetRequest = req.body;

        if (!content || !language || !title) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'content, language, and title are required'
            });
        }

        const snippet: Snippet = {
            id: uuidv4(),
            content: content.trim(),
            language: language.toLowerCase(),
            title: title.trim(),
            tags: tags || [],
            description: description?.trim(),
            useCount: 0,
            qualityScore: calculateQualityScore(content),
            isFavorited: false,
            createdAt: new Date()
        };

        snippets.set(snippet.id, snippet);

        res.status(201).json({
            success: true,
            data: snippet,
            message: 'Snippet created successfully'
        });
    } catch (error) {
        console.error('Error creating snippet:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create snippet'
        });
    }
});

// Search snippets with advanced filtering
router.get('/search', (req, res) => {
    try {
        const {
            q: query,
            language,
            tags,
            favorite,
            limit = 50,
            offset = 0
        } = req.query;

        let results = Array.from(snippets.values());

        // Apply filters
        if (query && typeof query === 'string') {
            const searchTerm = query.toLowerCase();
            results = results.filter(snippet =>
                snippet.title.toLowerCase().includes(searchTerm) ||
                snippet.content.toLowerCase().includes(searchTerm) ||
                snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                snippet.description?.toLowerCase().includes(searchTerm)
            );
        }

        if (language && typeof language === 'string') {
            results = results.filter(snippet => snippet.language === language.toLowerCase());
        }

        if (tags && typeof tags === 'string') {
            const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
            results = results.filter(snippet =>
                tagList.some(tag => snippet.tags.includes(tag))
            );
        }

        if (favorite && typeof favorite === 'string') {
            const isFavorite = favorite.toLowerCase() === 'true';
            results = results.filter(snippet => snippet.isFavorited === isFavorite);
        }

        // Sort by relevance and popularity
        results.sort((a, b) => {
            if (b.useCount !== a.useCount) return b.useCount - a.useCount;
            if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });

        const total = results.length;
        const offsetNum = parseInt(String(offset), 10);
        const limitNum = parseInt(String(limit), 10);

        results = results.slice(offsetNum, offsetNum + limitNum);

        res.json({
            success: true,
            data: results,
            meta: {
                total,
                offset: offsetNum,
                limit: limitNum,
                hasMore: offsetNum + limitNum < total
            }
        });
    } catch (error) {
        console.error('Error searching snippets:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to search snippets'
        });
    }
});

// Get all snippets with pagination
router.get('/', (req, res) => {
    try {
        const { limit = 50, offset = 0, language, tags } = req.query;

        let results = Array.from(snippets.values());

        if (language && typeof language === 'string') {
            results = results.filter(snippet => snippet.language === language.toLowerCase());
        }

        if (tags && typeof tags === 'string') {
            const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
            results = results.filter(snippet =>
                tagList.some(tag => snippet.tags.includes(tag))
            );
        }

        // Sort by creation date
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const total = results.length;
        const offsetNum = parseInt(String(offset), 10);
        const limitNum = parseInt(String(limit), 10);

        results = results.slice(offsetNum, offsetNum + limitNum);

        res.json({
            success: true,
            data: results,
            meta: {
                total,
                offset: offsetNum,
                limit: limitNum,
                hasMore: offsetNum + limitNum < total
            }
        });
    } catch (error) {
        console.error('Error fetching snippets:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch snippets'
        });
    }
});

// Get a specific snippet by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const snippet = snippets.get(id);

        if (!snippet) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Snippet not found'
            });
        }

        // Update use count
        snippet.useCount++;
        snippet.lastUsedAt = new Date();

        res.json({
            success: true,
            data: snippet
        });
    } catch (error) {
        console.error('Error fetching snippet:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch snippet'
        });
    }
});

// Update a snippet
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { content, language, title, tags, description } = req.body;

        const existingSnippet = snippets.get(id);
        if (!existingSnippet) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Snippet not found'
            });
        }

        const updatedSnippet: Snippet = {
            ...existingSnippet,
            content: content || existingSnippet.content,
            language: language || existingSnippet.language,
            title: title || existingSnippet.title,
            tags: tags || existingSnippet.tags,
            description: description || existingSnippet.description
        };

        snippets.set(id, updatedSnippet);

        res.json({
            success: true,
            data: updatedSnippet,
            message: 'Snippet updated successfully'
        });
    } catch (error) {
        console.error('Error updating snippet:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update snippet'
        });
    }
});

// Delete a snippet
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (!snippets.has(id)) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Snippet not found'
            });
        }

        snippets.delete(id);

        res.json({
            success: true,
            message: 'Snippet deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting snippet:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to delete snippet'
        });
    }
});

// Get supported languages
router.get('/languages', (req, res) => {
    res.json({
        success: true,
        data: config.uploads.allowedLanguages,
        message: 'Supported languages retrieved successfully'
    });
});

// Bulk operations for syncing
router.post('/bulk', (req, res) => {
    try {
        const { snippets: snippetsData }: { snippets: Snippet[] } = req.body;

        if (!Array.isArray(snippetsData)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'snippets must be an array'
            });
        }

        const saved: Snippet[] = [];
        const errors: any[] = [];

        snippetsData.forEach(data => {
            try {
                const snippet: Snippet = {
                    id: data.id || uuidv4(),
                    content: data.content.trim(),
                    language: data.language.toLowerCase(),
                    title: data.title.trim(),
                    tags: data.tags || [],
                    description: data.description?.trim(),
                    useCount: data.useCount || 0,
                    qualityScore: data.qualityScore || calculateQualityScore(data.content),
                    isFavorited: data.isFavorited || false,
                    createdAt: new Date(data.createdAt) || new Date()
                };

                snippets.set(snippet.id, snippet);
                saved.push(snippet);
            } catch (error) {
                errors.push({ data, error: error.message });
            }
        });

        res.json({
            success: true,
            data: { saved, errors },
            message: `Successfully saved ${saved.length} snippets, ${errors.length} errors`
        });
    } catch (error) {
        console.error('Error bulk creating snippets:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to bulk create snippets'
        });
    }
});

// Helper function to calculate quality score
function calculateQualityScore(content: string): number {
    let score = 5.0;

    // Length considerations
    if (content.length < 20) score -= 2.0;
    else if (content.length > 200) score += 1.0;

    // Comment bonus
    if (content.includes('//') || content.includes('/*') || content.includes('# ')) score += 1.0;

    // Documentation bonus
    if (content.includes('@param') || content.includes('@return') || content.includes('/**')) score += 1.0;

    // Error handling bonus
    if (content.includes('try') || content.includes('catch')) score += 0.5;

    return Math.min(score, 10.0);
}

export default router;