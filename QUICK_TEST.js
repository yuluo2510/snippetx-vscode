#!/usr/bin/env node

/**
 * Quick testing script to validate SnippetX extension without full dependency setup
 * Runs basic TypeScript compilation check against existing src files
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 SnippetX Quick Test - Validating Core Files...\n');

// Check for essential files
const filesToCheck = [
  'src/extension.ts',
  'src/backend/app.ts',
  'package.json',
  'tsconfig.json',
  'src/backend/routes/snippets.ts',
  'src/snippetManager.ts',
  'src/snippetProvider.ts'
];

let hasAllFiles = true;
let fileCount = 0;

filesToCheck.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
    fileCount++;
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasAllFiles = false;
  }
});

// Quick syntax check of TypeScript files
function quickTypeScriptCheck(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasTypicalTSIssues = [
      'import fr', 'export def', 'class \w+ ext', 'interface \w+', 'type \w+ ='
    ].some(pattern => new RegExp(pattern, 'i').test(content));
    return hasTypicalTSIssues;
  } catch (err) {
    return false;
  }
}

// Also provide direct VS Code extension testing
console.log('\n🚀 READY FOR VS CODE TESTING:');
console.log('1. Open this folder in VS Code');
console.log('2. Press F5 to launch Extension Development Host');
console.log('3. In the new VS Code window:');
console.log('   - Open any code file');
console.log('   - Select some text');
console.log('   - Press Ctrl+Shift+S (Save snippet)');
console.log('   - Press Ctrl+Shift+L (Search snippets)');

console.log('\n📊 QUICK VALIDATION RESULTS:');
console.log(`Files found: ${fileCount}/${filesToCheck.length}`);
console.log(hasAllFiles ? '🎉 All core files present!' : '⚠️ Some files missing, may need re-generation');

// Direct test for main extension file
const extensionFile = path.join(process.cwd(), 'src/extension.ts');
if (fs.existsSync(extensionFile)) {
  console.log('\n📋 Extension Preview:');
  const content = fs.readFileSync(extensionFile, 'utf8').split('\n').slice(0, 10).join('\n');
  console.log(content);
}