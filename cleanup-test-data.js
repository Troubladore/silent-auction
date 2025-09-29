#!/usr/bin/env node
/**
 * Standalone test data cleanup script
 * Usage: node cleanup-test-data.js
 */

const TestCleanup = require('./tests/browser/test-cleanup');

async function main() {
    console.log('🧹 Starting test data cleanup...');
    
    const cleanup = new TestCleanup();
    try {
        await cleanup.cleanupTestData();
        console.log('✅ Cleanup completed successfully');
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    } finally {
        await cleanup.close();
    }
}

main();