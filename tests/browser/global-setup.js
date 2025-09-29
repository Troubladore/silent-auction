/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */

const TestCleanup = require('./test-cleanup');

async function globalSetup() {
    console.log('🧹 Running global test setup - cleaning any existing test data...');
    
    const cleanup = new TestCleanup();
    try {
        await cleanup.cleanupTestData();
    } finally {
        await cleanup.close();
    }
}

module.exports = globalSetup;