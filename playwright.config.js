/**
 * Playwright configuration
 */

module.exports = {
    testDir: './tests/browser',
    timeout: 30000,
    globalSetup: './tests/browser/global-setup.js',
    globalTeardown: './tests/browser/global-teardown.js',
    use: {
        baseURL: 'http://localhost',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { 
                browserName: 'chromium',
                viewport: { width: 1280, height: 720 }
            }
        },
        {
            name: 'firefox',
            use: { 
                browserName: 'firefox',
                viewport: { width: 1280, height: 720 }
            }
        }
    ]
};