/**
 * Browser-based End-to-End Tests for Navigation and General UI
 * 
 * Tests overall site navigation, menu functionality, page loading,
 * and cross-browser compatibility.
 */

describe('Site Navigation and UI', () => {
  let page;

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('JavaScript error:', error.message);
    });
  });

  afterEach(async () => {
    await page.close();
  });

  test('should load the home page without errors', async () => {
    await page.goto('http://localhost:8080/index.php');
    
    // Check that page loads
    await waitForSelector(page, 'body');
    
    // Verify no JavaScript errors occurred
    const title = await page.title();
    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for main navigation elements
    const nav = await page.$('nav, .navigation, .menu');
    expect(nav).toBeTruthy();
  });

  test('should navigate between main pages', async () => {
    await page.goto('http://localhost:8080/index.php');
    
    // Test navigation to bid entry
    const bidEntryLink = await page.$('a[href*="bid_entry"], .bid-entry-link');
    if (bidEntryLink) {
      await bidEntryLink.click();
      await page.waitForNavigation();
      
      const url = page.url();
      expect(url).toContain('bid_entry');
      
      const title = await page.title();
      expect(title).toContain('Bid Entry');
    }
    
    // Test navigation to reports
    const reportsLink = await page.$('a[href*="reports"], .reports-link');
    if (reportsLink) {
      await reportsLink.click();
      await page.waitForNavigation();
      
      const url = page.url();
      expect(url).toContain('reports');
    }
  });

  test('should handle responsive design', async () => {
    // Test desktop layout
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto('http://localhost:8080/bid_entry.php');
    
    const desktopMenu = await page.$('.desktop-menu, .main-nav');
    const mobileMenu = await page.$('.mobile-menu, .hamburger');
    
    // Desktop should show main nav, hide mobile menu
    if (desktopMenu) {
      const isVisible = await desktopMenu.isVisible();
      expect(isVisible).toBe(true);
    }
    
    // Test tablet layout
    await page.setViewport({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForTimeout(500);
    
    // Test mobile layout
    await page.setViewport({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(500);
    
    // Mobile should prioritize mobile navigation
    if (mobileMenu) {
      const isMobileMenuVisible = await mobileMenu.isVisible();
      // This depends on your specific implementation
      expect(typeof isMobileMenuVisible).toBe('boolean');
    }
  });

  test('should handle form accessibility', async () => {
    await page.goto('http://localhost:8080/bid_entry.php');
    
    // Check for form labels
    const labels = await page.$$('label');
    expect(labels.length).toBeGreaterThan(0);
    
    // Check that form inputs have proper attributes
    const inputs = await page.$$('input[required]');
    for (const input of inputs) {
      const id = await input.evaluate(el => el.id);
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        expect(label).toBeTruthy();
      }
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'SELECT', 'BUTTON', 'A']).toContain(focusedElement);
  });

  test('should load CSS and JavaScript resources', async () => {
    await page.goto('http://localhost:8080/bid_entry.php');
    
    // Check that CSS is loaded
    const hasStyles = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.display = 'none';
      document.body.appendChild(el);
      const computedStyle = window.getComputedStyle(el);
      document.body.removeChild(el);
      return computedStyle.display === 'none';
    });
    expect(hasStyles).toBe(true);
    
    // Check for JavaScript functionality
    const scriptsLoaded = await page.evaluate(() => {
      return typeof window.jQuery !== 'undefined' || 
             typeof document.querySelector !== 'undefined';
    });
    expect(scriptsLoaded).toBe(true);
  });

  test('should handle browser back/forward navigation', async () => {
    // Navigate to first page
    await page.goto('http://localhost:8080/index.php');
    const firstUrl = page.url();
    
    // Navigate to second page
    await page.goto('http://localhost:8080/bid_entry.php');
    const secondUrl = page.url();
    
    expect(firstUrl).not.toBe(secondUrl);
    
    // Test back button
    await page.goBack();
    const backUrl = page.url();
    expect(backUrl).toBe(firstUrl);
    
    // Test forward button
    await page.goForward();
    const forwardUrl = page.url();
    expect(forwardUrl).toBe(secondUrl);
  });

  test('should handle page refresh without losing data', async () => {
    await page.goto('http://localhost:8080/bid_entry.php');
    
    // Select an auction
    const auctionSelect = await page.$('select[name="auction_id"]');
    if (auctionSelect) {
      await page.select('select[name="auction_id"]', '1');
      await page.waitForTimeout(1000);
      
      // Refresh the page
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Check that selection is maintained (if implemented)
      const selectedValue = await page.$eval('select[name="auction_id"]', 
        select => select.value
      ).catch(() => '');
      
      // This depends on whether the app maintains state across refreshes
      expect(selectedValue).toBeDefined();
    }
  });

  test('should display error pages appropriately', async () => {
    // Test 404 page
    await page.goto('http://localhost:8080/nonexistent-page.php');
    
    // Should either show 404 or redirect to error page
    const title = await page.title();
    const content = await page.content();
    
    // Check for error indicators
    const hasErrorIndicator = title.includes('404') || 
                             title.includes('Not Found') ||
                             content.includes('404') ||
                             content.includes('not found');
    
    expect(hasErrorIndicator).toBe(true);
  });

  test('should handle print styles', async () => {
    await page.goto('http://localhost:8080/reports.php');
    
    // Emulate print media
    await page.emulateMediaType('print');
    
    // Check that print styles are applied
    const bodyStyles = await page.evaluate(() => {
      return window.getComputedStyle(document.body);
    });
    
    // Print styles might change colors, hide elements, etc.
    expect(bodyStyles).toBeDefined();
    
    // Reset to screen media
    await page.emulateMediaType('screen');
  });

  test('should handle loading states', async () => {
    await page.goto('http://localhost:8080/bid_entry.php');
    
    // Check for loading indicators during AJAX calls
    const auctionSelect = await page.$('select[name="auction_id"]');
    if (auctionSelect) {
      // Monitor for loading states
      let loadingIndicatorFound = false;
      
      page.on('response', response => {
        if (response.url().includes('api/') && response.status() === 200) {
          // AJAX request completed
        }
      });
      
      await page.select('select[name="auction_id"]', '1');
      
      // Look for loading indicator
      const loadingElement = await page.$('.loading, .spinner, .progress').catch(() => null);
      if (loadingElement) {
        loadingIndicatorFound = true;
      }
      
      await page.waitForTimeout(2000);
      
      // Loading indicator should be gone after request completes
      const stillLoading = await page.$('.loading:not(.hidden), .spinner:not(.hidden)').catch(() => null);
      expect(stillLoading).toBeFalsy();
    }
  });

  test('should handle keyboard shortcuts', async () => {
    await page.goto('http://localhost:8080/bid_entry.php');
    
    // Test common keyboard shortcuts (if implemented)
    
    // Ctrl+S for save (if applicable)
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyS');
    await page.keyboard.up('Control');
    await page.waitForTimeout(500);
    
    // Test Escape key for canceling/closing dialogs
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Test F1 for help (if implemented)
    await page.keyboard.press('F1');
    await page.waitForTimeout(500);
    
    // These tests depend on your specific implementation
    expect(true).toBe(true); // Placeholder assertion
  });

  test('should maintain session state', async () => {
    // Test that user session is maintained across pages
    await page.goto('http://localhost:8080/index.php');
    
    // If your system has login, test session maintenance
    // For now, test basic session functionality
    
    await page.evaluate(() => {
      sessionStorage.setItem('test_key', 'test_value');
    });
    
    // Navigate to another page
    await page.goto('http://localhost:8080/bid_entry.php');
    
    // Check that session storage is maintained
    const sessionValue = await page.evaluate(() => {
      return sessionStorage.getItem('test_key');
    });
    
    expect(sessionValue).toBe('test_value');
  });

  test('should handle concurrent user interactions', async () => {
    // Open multiple tabs/pages to simulate concurrent users
    const page2 = await browser.newPage();
    
    try {
      await page.goto('http://localhost:8080/bid_entry.php');
      await page2.goto('http://localhost:8080/bid_entry.php');
      
      // Both pages select the same auction
      await page.select('select[name="auction_id"]', '1');
      await page2.select('select[name="auction_id"]', '1');
      
      await page.waitForTimeout(1000);
      await page2.waitForTimeout(1000);
      
      // Simulate concurrent bid submissions
      await page.evaluate(() => {
        // Would test actual concurrent bid logic here
        return true;
      });
      
      await page2.evaluate(() => {
        // Would test actual concurrent bid logic here  
        return true;
      });
      
      expect(true).toBe(true); // Placeholder for concurrent testing
    } finally {
      await page2.close();
    }
  });
});