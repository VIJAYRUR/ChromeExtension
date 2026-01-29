/**
 * Phase 1 Verification Script
 * Verifies all files and dependencies for Phase 1.1 - 1.5
 * Run: node verify-phase1.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

/**
 * Check if a file exists
 */
function checkFile(filePath, description) {
  totalChecks++;
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    log.success(`${description}: ${filePath}`);
    passedChecks++;
    return true;
  } else {
    log.error(`${description} NOT FOUND: ${filePath}`);
    failedChecks++;
    return false;
  }
}

/**
 * Check if a file contains specific text
 */
function checkFileContains(filePath, searchText, description) {
  totalChecks++;
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log.error(`${description}: File not found - ${filePath}`);
    failedChecks++;
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  if (content.includes(searchText)) {
    log.success(`${description}`);
    passedChecks++;
    return true;
  } else {
    log.error(`${description}: Text not found in ${filePath}`);
    failedChecks++;
    return false;
  }
}

/**
 * Check if package.json has a dependency
 */
function checkDependency(packageName) {
  totalChecks++;
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log.error('package.json not found');
    failedChecks++;
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  if (allDeps[packageName]) {
    log.success(`Dependency: ${packageName} (${allDeps[packageName]})`);
    passedChecks++;
    return true;
  } else {
    log.warning(`Dependency NOT installed: ${packageName}`);
    warnings++;
    return false;
  }
}

/**
 * Main verification function
 */
async function verifyPhase1() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🔍 Phase 1 Verification Script                               ║
║   Checking Phase 1.1 - 1.5 Implementation                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // ============================================================
  // Phase 1.1 - Database Models
  // ============================================================
  log.section('Phase 1.1 - Database Models');
  
  checkFile('models/Group.js', 'Group Model');
  checkFile('models/SharedJob.js', 'SharedJob Model');
  checkFile('models/GroupMember.js', 'GroupMember Model');
  checkFile('models/Comment.js', 'Comment Model');
  checkFile('models/ChatMessage.js', 'ChatMessage Model');
  
  // Check if models are exported in index.js
  checkFileContains('models/index.js', 'Group', 'Group exported in models/index.js');
  checkFileContains('models/index.js', 'SharedJob', 'SharedJob exported in models/index.js');
  checkFileContains('models/index.js', 'GroupMember', 'GroupMember exported in models/index.js');
  checkFileContains('models/index.js', 'Comment', 'Comment exported in models/index.js');
  checkFileContains('models/index.js', 'ChatMessage', 'ChatMessage exported in models/index.js');

  // ============================================================
  // Phase 1.2 - Controllers
  // ============================================================
  log.section('Phase 1.2 - Controllers');
  
  checkFile('controllers/groupController.js', 'Group Controller');
  checkFile('controllers/sharedJobController.js', 'SharedJob Controller');
  checkFile('controllers/chatController.js', 'Chat Controller');
  checkFile('controllers/groupAnalyticsController.js', 'GroupAnalytics Controller');
  
  // Check critical functions
  checkFileContains('controllers/sharedJobController.js', 'saveToMyJobs', 'saveToMyJobs function exists');
  checkFileContains('controllers/sharedJobController.js', 'descriptionHtml', 'descriptionHtml preserved in saveToMyJobs');
  checkFileContains('controllers/groupController.js', 'createGroup', 'createGroup function exists');

  // ============================================================
  // Phase 1.3 - API Routes
  // ============================================================
  log.section('Phase 1.3 - API Routes');
  
  checkFile('routes/groups.js', 'Groups Routes');
  checkFile('routes/sharedJobs.js', 'SharedJobs Routes');
  checkFile('routes/chat.js', 'Chat Routes');
  checkFile('routes/groupAnalytics.js', 'GroupAnalytics Routes');
  
  // Check if routes are mounted in index.js
  checkFileContains('routes/index.js', '/groups', 'Groups routes mounted');
  checkFileContains('routes/index.js', 'groupRoutes', 'Group routes imported');

  // ============================================================
  // Phase 1.4 - Middleware
  // ============================================================
  log.section('Phase 1.4 - Middleware');
  
  checkFile('middleware/groupAuth.js', 'Group Auth Middleware');
  checkFile('middleware/groupRole.js', 'Group Role Middleware');
  checkFile('middleware/groupRateLimiter.js', 'Group Rate Limiter Middleware');
  
  // Check middleware functions
  checkFileContains('middleware/groupAuth.js', 'checkGroupMembership', 'checkGroupMembership exists');
  checkFileContains('middleware/groupAuth.js', 'checkGroupAdmin', 'checkGroupAdmin exists');
  checkFileContains('middleware/groupRole.js', 'requireAdmin', 'requireAdmin exists');
  checkFileContains('middleware/groupRateLimiter.js', 'groupCreationLimiter', 'groupCreationLimiter exists');

  // ============================================================
  // Phase 1.5 - Socket.io Setup
  // ============================================================
  log.section('Phase 1.5 - Socket.io Setup');
  
  checkFile('socket/socketServer.js', 'Socket Server');
  checkFile('socket/chatHandlers.js', 'Chat Handlers');
  checkFile('socket/groupHandlers.js', 'Group Handlers');
  checkFile('socket/socketHelper.js', 'Socket Helper');
  
  // Check Socket.io integration in server.js
  checkFileContains('server.js', 'initializeSocketServer', 'Socket.io initialized in server.js');
  checkFileContains('server.js', 'registerChatHandlers', 'Chat handlers registered in server.js');
  checkFileContains('server.js', 'setSocketIO', 'Socket helper used in server.js');

  // ============================================================
  // Dependencies Check
  // ============================================================
  log.section('Dependencies Check');
  
  checkDependency('express');
  checkDependency('mongoose');
  checkDependency('jsonwebtoken');
  checkDependency('bcryptjs');
  checkDependency('cors');
  checkDependency('helmet');
  checkDependency('express-rate-limit');
  checkDependency('dotenv');
  checkDependency('socket.io');

  // ============================================================
  // Documentation Check
  // ============================================================
  log.section('Documentation Files');
  
  checkFile('../API_ENDPOINTS.md', 'API Endpoints Documentation');
  checkFile('../SOCKET_IO_DOCUMENTATION.md', 'Socket.io Documentation');
  checkFile('../MIDDLEWARE_DOCUMENTATION.md', 'Middleware Documentation');
  checkFile('../INSTALLATION_GUIDE.md', 'Installation Guide');

  // ============================================================
  // Summary
  // ============================================================
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   📊 Verification Summary                                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Total Checks:   ${totalChecks}`);
  log.success(`Passed:         ${passedChecks}`);
  
  if (failedChecks > 0) {
    log.error(`Failed:         ${failedChecks}`);
  }
  
  if (warnings > 0) {
    log.warning(`Warnings:       ${warnings}`);
  }

  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
  console.log(`\nSuccess Rate:   ${successRate}%\n`);

  if (failedChecks === 0 && warnings === 0) {
    log.success('🎉 ALL CHECKS PASSED! Phase 1 is complete and ready for testing!');
  } else if (failedChecks === 0 && warnings > 0) {
    log.warning('⚠️  All files present but some dependencies missing. Run: npm install socket.io');
  } else {
    log.error('❌ Some checks failed. Please review the errors above.');
  }

  console.log('');
}

// Run verification
verifyPhase1().catch(console.error);

