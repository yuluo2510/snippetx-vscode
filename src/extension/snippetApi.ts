import * as vscode from 'vscode';
import axios from 'axios';

export class SnippetApi {
    private apiUrl: string;
    private isDev = false;

    constructor(private config: vscode.WorkspaceConfiguration) {
        this.apiUrl = this.config.get('apiUrl', 'http://localhost:3000/api');

        // Check if we're in development mode
        this.isDev = !this.apiUrl.includes('snippetx.dev');
    }

    private async getHeaders() {
        const headers: any = {
            'Content-Type': 'application/json',
            'User-Agent': 'SnippetX-Extension'
        };

        // Add API key for authentication
        const apiKey = this.config.get('apiKey');
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }

        return headers;
    }

    private handleApiError(error: any, action: string): string {
        if (error.response) {
            // The request was made and the server responded with a status code
            const { status, data } = error.response;
            return `API ${action} failed: ${data.message || data.error || error.message} (${status})`;
        } else if (error.request) {
            // The request was made but no response was received
            return `API ${action} failed: No response from server. Check your internet connection.`;
        } else {
            // Something happened in setting up the request
            return `API ${action} failed: ${error.message}`;
        }
    }

    async saveSnippet(snippet: any): Promise<any> {
        try {
            const response = await axios.post(`${this.apiUrl}/snippets`, snippet, {
                headers: await this.getHeaders()
            });
            return response.data;
        } catch (error: any) {
            if (this.isDev) {
                console.warn('Using local storage - API unavailable:', this.handleApiError(error, 'save'));
                return { local: true, ...snippet };
            }
            throw new Error(this.handleApiError(error, 'save'));
        }
    }

    async searchSnippets(query: string, filters?: any): Promise<any[]> {
        try {
            const params = new URLSearchParams();
            params.append('q', query);

            if (filters?.language) params.append('language', filters.language);
            if (filters?.tags) params.append('tags', filters.tags.join(','));
            if (filters?.limit) params.append('limit', filters.limit.toString());

            const response = await axios.get(`${this.apiUrl}/snippets/search?${params.toString()}`, {
                headers: await this.getHeaders()
            });
            return response.data.data || [];
        } catch (error: any) {
            if (this.isDev) {
                console.warn('Using local search - API unavailable:', this.handleApiError(error, 'search'));
                return [];
            }
            throw new Error(this.handleApiError(error, 'search'));
        }
    }

    async getRecentSnippets(limit: number = 10): Promise<any[]> {
        try {
            const response = await axios.get(`${this.apiUrl}/snippets?sort=recent&limit=${limit}`, {
                headers: await this.getHeaders()
            });
            return response.data.data || [];
        } catch (error: any) {
            if (this.isDev) {
                console.warn('Using local storage - API unavailable');
                return [];
            }
            throw new Error(this.handleApiError(error, 'get recent'));
        }
    }

    async getFavoriteSnippets(): Promise<any[]> {
        try {
            const response = await axios.get(`${this.apiUrl}/snippets?favorite=true`, {
                headers: await this.getHeaders()
            });
            return response.data.data || [];
        } catch (error: any) {
            if (this.isDev) {
                console.warn('Using local storage - API unavailable');
                return [];
            }
            throw new Error(this.handleApiError(error, 'get favorites'));
        }
    }

    async deleteSnippet(id: string): Promise<boolean> {
        try {
            await axios.delete(`${this.apiUrl}/snippets/${id}`, {
                headers: await this.getHeaders()
            });
            return true;
        } catch (error: any) {
            if (this.isDev) {
                console.warn('API unavailable for deletion, removing locally');
                return true;
            }
            throw new Error(this.handleApiError(error, 'delete'));
        }
    }

    async updateSnippet(id: string, updates: any): Promise<any> {
        try {
            const response = await axios.put(`${this.apiUrl}/snippets/${id}`, updates, {
                headers: await this.getHeaders()
            });
            return response.data;
        } catch (error: any) {
            if (this.isDev) {
                console.warn('API unavailable for update, updating locally');
                return updates;
            }
            throw new Error(this.handleApiError(error, 'update'));
        }
    }

    async syncWithGitHub(repository: string, snippets: any[]): Promise<any> {
        try {
            const response = await axios.post(`${this.apiUrl}/sync/github`, {
                repository,
                snippets
            }, {
                headers: await this.getHeaders()
            });
            return response.data;
        } catch (error: any) {
            if (this.isDev) {
                console.warn('GitHub sync unavailable');
                return { synced: false, reason: 'Development mode' };
            }
            throw new Error(this.handleApiError(error, 'GitHub sync'));
        }
    }

    async checkGitHubConnection(): Promise<any> {
        try {
            const response = await axios.post(`${this.apiUrl}/sync/test`, {}, {
                headers: await this.getHeaders()
            });
            return response.data;
        } catch (error: any) {
            return { connected: false, error: this.handleApiError(error, 'GitHub check') };
        }
    }

    // Utility method for handling network connectivity
    async ping(): Promise<boolean> {
        try {
            await axios.get(`${this.apiUrl}/health`, {
                headers: await this.getHeaders(),
                timeout: 5000
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}