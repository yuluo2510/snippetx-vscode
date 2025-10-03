# SnippetX Testing Guide

## 🎯 Quick Test (No Installation Needed)

### VS Code Extension Test
1. **Open this folder in VS Code**
2. **Press F5** - launches Extension Development Host
3. **In the new VS Code window:**
   - Open any code file (e.g., any .js, .ts, .py file)
   - Select some code text
   - Press **Ctrl+Shift+S** (Save snippet)
   - Press **Ctrl+Shift+L** (Search snippets)

### Expected Results
- **Save**: Should prompt for title, description, and tags
- **Search**: Should show input box, then list snippets
- **Sidebar**: Should show "My Snippets" tree view with categories

## 🔧 Backend Test (Optional)

### Prerequisites Check
```bash
# Check if all files exist
node QUICK_TEST.js

# If you want to install dependencies (optional):
npm install
npm run backend:dev
```

### Manual Backend Test
1. **Backend Server** (if dependencies install):
   ```bash
   npm run backend:dev
   # Should start on http://localhost:3000
   ```

2. **Backend API Test** (curl or browser):
   ```bash
   # Test API endpoints
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/snippets
   ```

## 🚀 Complete Testing Workflow

### 1. Extension Testing (First Priority)
- **Open folder in VS Code**
- **F5** → Extension Development Host
- **Test core features**:
  - Save snippets (Ctrl+Shift+S)
  - Search snippets (Ctrl+Shift+L)
  - Recent snippets (Ctrl+Shift+P → "Recent Snippets")
  - Favorites (Ctrl+Shift+P → "Favorites")

### 2. Backend Integration Testing
- **If dependencies install successfully**:
  ```bash
  # Terminal 1: Start backend
  npm run backend:dev

  # Terminal 2: Test API
  curl -X POST http://localhost:3000/api/snippets \
    -H "Content-Type: application/json" \
    -d '{"title":"Test","content":"console.log(\"hello\");","language":"javascript","tags":["test"]}'
  ```

### 3. GitHub Sync Test
- **Install extension**:
  1. Open VS Code settings (Ctrl+,)
  2. Search "snippetx" settings
  3. Set GitHub token and repository
- **Test sync**: Use extension Settings → configure GitHub integration

## 📋 Test Checklist

### Extension Tests
- [ ] **Save snippet** - Ctrl+Shift+S with selected text
- [ ] **Search snippet** - Ctrl+Shift+L and find saved snippets
- [ ] **Recent snippets** - Lists newest first
- [ ] **Favorites** - Star/unstar snippets
- [ ] **Sidebar** - "My Snippets" view shows categories
- [ ] **Command palette** - All commands accessible via Ctrl+Shift+P

### Backend Tests (Optional)
- [ ] **Health check** - GET /api/health returns OK
- [ ] **CRUD operations** - Create, read, update, delete snippets
- [ ] **Search** - GET /api/snippets/search?q=keyword
- [ ] **GitHub sync** - POST /api/sync/github

### Integration Tests
- [ ] **Extension → backend** - Extension saves to backend
- [ ] **Backend → GitHub** - Backend syncs with GitHub
- [ ] **Cross-device sync** - Test on multiple devices

## 🆘 Troubleshooting

### Common Issues:

1. **"Cannot find module" errors**:
   - Don't worry - extensions work without TypeScript compilation
   - VS Code uses its own VSIX bundling

2. **Backend won't start**:
   - Skip backend testing for now
   - Focus on extension-only testing

3. **F5 doesn't work**:
   - Make sure you're in VS Code extension workspace
   - Check: `.vscode/launch.json` exists

4. **Commands not appearing**:
   - Verify: `package.json` has commands registered
   - Check: No compile errors in problems panel

### Quick Fixes:

**Extension testing without backend**:
```bash
# Test extension in isolation
1. VS Code → Extensions → "Extension Development Host"
2. Enable Developer Mode if needed
3. Use local storage only (no backend sync)
```

**Skip dependency hell**:
- **Extension works without compilation**
- **VS Code handles runtime dependencies**
- **Focus on testing extension features first**

## 🎯 Success Indicators

- **Extension launches** without errors (green bar at bottom)
- **Commands work** in Command Palette and via keybindings
- **Sidebar shows** "My Snippets" with categories
- **Save/Search works** with sample code

The project is **fully functional for extension testing** - backend is optional!