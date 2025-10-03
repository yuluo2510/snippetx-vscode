# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains business documentation and strategy materials for **SnippetX**, a VS Code extension project focused on intelligent code snippet management. The workspace includes product requirements, compliance analysis, sales strategy, and prospect targeting materials.

## Key Business Context

### SnippetX Product
- **Product**: VS Code extension for code snippet management
- **Target Users**: 25-35 year old full-stack/backend developers
- **Differentiator**: Zero-friction code reuse within VS Code environment
- **Pricing**: Free tier (1GB), Pro ($8/month), Team ($12/user/month)

### Sales Materials
- **Focus**: Municipal bond compliance technology for financial services
- **Market**: Regional dealers (20-500 employees)
- **Core Pain Point**: Manual MSRB compliance processes (G-37/G-40 forms)
- **Value Prop**: Reducing 25-hour quarterly compliance prep to 45 minutes

## File Structure & Purpose

### Core Documentation
- `SnippetX_需求文档.md` - Complete product requirements for VS Code extension
- `action_outreach_scripts.md` - Sales automation scripts for municipal bond compliance prospects
- `compliance_technology_landscape.md` - Market analysis for financial compliance technology
- `contact_database_detailed.md` - CFO/CCO contact database for financial services firms
- `regulatory_violations_analysis.md` - Analysis of regulatory compliance violations
- `municipal_bond_compliance_prospects.md` - Prospect targeting and outreach strategy

### Archive Files
- `SnippetX_需求文档_修复版.md` - Updated/corrected Chinese product requirements

## Technology Stack (Per SnippetX Requirements)

### Backend
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL (primary) + Redis (cache)
- **AI Services**: OpenAI API for code analysis and tag generation
- **Storage**: GitHub repositories for backup/sync
- **Deployment**: Vercel + Supabase

### Frontend
- **Extension**: VS Code Extension API
- **Web App**: React-based (implied from architecture)
- **State Management**: VS Code extension state management
- **Communication**: REST API + WebSocket for real-time updates

## Development Commands (Projected)

Since this is a documentation workspace, actual development commands would depend on the created codebase:

```bash
# Typical VS Code Extension Development
npm install                    # Install dependencies
npm run compile                # Compile TypeScript
npm run test                   # Run extension tests
npm run package                # Package extension for marketplace

# Web App Development (future)
npm run dev                    # Start development server
npm run build                  # Build for production
npm run test                   # Run unit tests
npm run lint                   # Lint code

# Database Setup
supabase start                 # Start local Supabase
supabase db push               # Push schema changes
```

## Architecture Key Points

### Extension Architecture
1. **Command Palette**: Cmd+Shift+P → "Save to SnippetX", "Search Snippets"
2. **Key Features**:
   - One-click code save (Cmd+Shift+S)
   - Instant search with tags
   - Cross-device sync via GitHub
   - AI-powered code categorization

### Data Model
```typescript
interface Snippet {
  id: string;
  content: string;
  language: string;
  title: string;
  tags: string[];
  useCount: number;
  qualityScore: number;
  isFavorited: boolean;
  description?: string;
}
```

### API Endpoints
- `POST /api/snippets` - Create snippet
- `GET /api/snippets/search?q=term` - Smart search
- `GET /api/snippets/recent` - Recent snippets
- `POST /vscode/save` - VS Code direct save

## Sales/Distribution Context

### Target Market Analysis
**Primary Users**: Financial services compliance officers
- **Stifel, Janney, Oppenheimer, Piper Sandler** - Tier 1 prospects
- **Regional dealers** - 100-500 employee firms
- **Pain Points**: Manual compliance, regulatory violations, budget constraints

### Outreach Scripts Available
- Violation-triggered outreach scripts
- Expansion opportunity targeting
- CFO/CCO direct contact strategies
- LinkedIn and email sequences

### Implementation Timeline
- **Small Firms**: 30-60 days
- **Medium Firms**: 90-120 days
- **Large Firms**: 180+ days

## Key Development Considerations

1. **Integration Priority**: Start with VS Code extension MVP
2. **Data Security**: Ensure compliance with financial data handling
3. **Performance**: <100ms for 1000 snippet searches
4. **Scalability**: Handle 10,000+ snippets efficiently
5. **Multi-platform**: Windows, macOS, Linux support

## Next Steps Context

When implementing code, prioritize:
1. VS Code extension core functionality
2. PostgreSQL schema and basic API
3. User authentication via GitHub
4. AI categorization integration
5. Basic sync functionality

This workspace serves as the strategic foundation - actual code implementation will require creating the VS Code extension and supporting services.