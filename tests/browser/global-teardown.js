/**
 * Global teardown for Playwright tests
 * Runs once after all tests complete
 */

const TestCleanup = require('./test-cleanup');

async function globalTeardown() {
    console.log('🧹 Running global test teardown - cleaning test data...');
    
    const cleanup = new TestCleanup();
    try {
        await cleanup.cleanupTestData();
    } finally {
        await cleanup.close();
    }
}

module.exports = globalTeardown;