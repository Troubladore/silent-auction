// Global test setup for browser tests using Playwright

const { chromium, firefox, webkit } = require('playwright');

// Increase test timeout for browser operations
jest.setTimeout(30000);

// Global browser and context variables
let browser;
let context;
let page;

// Set up browser before all tests
beforeAll(async () => {
  // Choose browser based on environment variable or default to chromium
  const browserType = process.env.BROWSER || 'chromium';
  const headless = !process.env.HEADED;
  const slowMo = process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0;
  
  // Launch browser
  const browserEngine = browserType === 'firefox' ? firefox : 
                       browserType === 'webkit' ? webkit : chromium;
  
  browser = await browserEngine.launch({
    headless,
    slowMo,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  // Create browser context
  context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    // Ignore HTTPS errors for local testing
    ignoreHTTPSErrors: true
  });
  
  // Global page instance
  page = await context.newPage();
  
  // Make browser, context, and page available globally
  global.browser = browser;
  global.context = context;
  global.page = page;
});

// Clean up after each test
afterEach(async () => {
  // Clear any dialogs, popups, etc.
  if (page) {
    try {
      await page.evaluate(() => {
        // Clear any open modals or dialogs
        const modals = document.querySelectorAll('.modal, .dialog, .popup');
        modals.forEach(modal => modal.remove());
      });
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
});

// Clean up after all tests
afterAll(async () => {
  if (page) await page.close();
  if (context) await context.close();
  if (browser) await browser.close();
});

// Helper functions
global.waitForSelector = async (selector, options = {}) => {
  return await page.waitForSelector(selector, {
    visible: true,
    timeout: 5000,
    ...options
  });
};

global.waitForText = async (text, timeout = 5000) => {
  await page.waitForFunction(
    (text) => document.body.innerText.includes(text),
    text,
    { timeout }
  );
};

global.fillField = async (selector, value) => {
  await page.focus(selector);
  await page.fill(selector, '');
  await page.type(selector, value);
};

global.clickAndWait = async (selector, waitSelector = null) => {
  await page.click(selector);
  if (waitSelector) {
    await page.waitForSelector(waitSelector);
  } else {
    await page.waitForTimeout(500);
  }
};

// Helper function to start PHP server if needed
global.startPHPServer = async () => {
  // This would start a PHP server process
  // For now, assume it's already running
  return 'http://localhost:8080';
};

// Helper for testing different screen sizes
global.setViewport = async (width, height) => {
  await page.setViewportSize({ width, height });
};

// Helper for taking screenshots during debugging
global.screenshot = async (name) => {
  await page.screenshot({ path: `debug-${name}.png` });
};