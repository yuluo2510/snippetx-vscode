-- Create database for SnippetX
CREATE DATABASE snippetx;
\c snippetx;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Performance monitoring

-- Users table (for multi-user support)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    github_id VARCHAR(100) UNIQUE,
    avatar_url TEXT,
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'team')),
    total_snippets_allowed INTEGER DEFAULT 1000,
    current_storage_bytes BIGINT DEFAULT 0,
    github_token_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table (for team collaboration)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    subscription_tier VARCHAR(20) DEFAULT 'team' CHECK (subscription_tier IN ('team', 'enterprise')),
    total_storage_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member')),
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Snippets table
CREATE TABLE snippets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

    -- Core content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    language VARCHAR(50) NOT NULL,

    -- AI-generated metadata
    tags TEXT[] DEFAULT '{}',
    ai_tags TEXT[] DEFAULT '{}',
    quality_score DECIMAL(3,1) DEFAULT 5.0 CHECK (quality_score >= 0 AND quality_score <= 10),

    -- Usage tracking
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Permissions and sharing
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    team_permissions JSONB DEFAULT '{"edit": true, "delete": false}',

    -- Storage information
    storage_size_bytes BIGINT NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Full-text search configuration
CREATE INDEX idx_snippets_search ON snippets USING GIN (
    to_tsvector('english',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        array_to_string(tags, ' ') || ' ' ||
        array_to_string(ai_tags, ' ')
    )
);

-- Trigram index for fuzzy search
CREATE INDEX idx_snippets_content_trigram ON snippets USING GIN (content gin_trgm_ops);

-- Performance indexes
CREATE INDEX idx_snippets_user_id ON snippets(user_id);
CREATE INDEX idx_snippets_team_id ON snippets(team_id);
CREATE INDEX idx_snippets_language ON snippets(language);
CREATE INDEX idx_snippets_visibility ON snippets(visibility);
CREATE INDEX idx_snippets_created_at ON snippets(created_at DESC);
CREATE INDEX idx_snippets_last_used_at ON snippets(last_used_at DESC);
CREATE INDEX idx_snippets_quality_score ON snippets(quality_score DESC);
CREATE INDEX idx_snippets_use_count ON snippets(use_count DESC);
CREATE INDEX idx_snippets_user_language ON snippets(user_id, language);
CREATE INDEX idx_snippets_team_language ON snippets(team_id, language);

-- Helper indexes for arrays
CREATE INDEX idx_snippets_tags ON snippets USING GIN (tags);
CREATE INDEX idx_snippets_ai_tags ON snippets USING GIN (ai_tags);

-- Snippet bookmarks/favorites
CREATE TABLE snippet_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    snippet_id UUID REFERENCES snippets(id) ON DELETE CASCADE,
    folder VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, snippet_id)
);

-- Snippet folders for organization
CREATE TABLE snippet_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_folder_id UUID REFERENCES snippet_folders(id),
    color VARCHAR(7),
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snippet to folder mappings
CREATE TABLE snippet_folder_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES snippet_folders(id) ON DELETE CASCADE,
    snippet_id UUID REFERENCES snippets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(folder_id, snippet_id)
);

-- Snippet usage history for analytics
CREATE TABLE snippet_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snippet_id UUID REFERENCES snippets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    usage_type VARCHAR(20) DEFAULT 'view' CHECK (usage_type IN ('view', 'insert', 'copy', 'edit')),
    context JSONB DEFAULT '{}', -- Store metadata about usage
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GitHub sync configuration
CREATE TABLE github_sync_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    repository_name VARCHAR(255) NOT NULL,
    repository_owner VARCHAR(255) NOT NULL,
    path_prefix VARCHAR(255) DEFAULT 'snippets',
    branch VARCHAR(255) DEFAULT 'main',
    is_auto_sync BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{"read": true, "write": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, repository_owner, repository_name)
);

-- Sync history
CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    sync_type VARCHAR(20) DEFAULT 'github' CHECK (sync_type IN ('github', 'manual', 'api')),
    direction VARCHAR(10) CHECK (direction IN ('push', 'pull')),
    status VARCHAR(20) CHECK (status IN ('success', 'failed', 'partial')),
    details JSONB DEFAULT '{}',
    files_processed INTEGER DEFAULT 0,
    snippets_updated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance optimization indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_snippets_created_date ON snippets(DATE(created_at));
CREATE INDEX idx_snippets_used_last_30_days ON snippets(last_used_at) WHERE last_used_at > NOW() - INTERVAL '30 days';

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_snippets_updated_at BEFORE UPDATE ON snippets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON snippet_folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_github_configs_updated_at BEFORE UPDATE ON github_sync_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();