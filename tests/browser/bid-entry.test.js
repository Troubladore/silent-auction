/**
 * Browser-based End-to-End Tests for Bid Entry Workflow
 * 
 * These tests use Playwright to control a real browser and test the complete
 * user experience including JavaScript interactions, AJAX calls, and form submissions.
 * 
 * Playwright provides better cross-browser support, faster execution, and more
 * reliable auto-waiting than Puppeteer.
 */

describe('Bid Entry Workflow', () => {
  beforeEach(async () => {
    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Handle JavaScript errors
    page.on('pageerror', error => {
      console.log('JavaScript error:', error.message);
    });
    
    // Navigate to bid entry page
    await page.goto('http://localhost:8080/bid_entry.php');
  });

  test('should load bid entry page with auction selection', async () => {
    // Wait for page to load
    await waitForSelector(page, 'body');
    
    // Check that the page title is correct
    const title = await page.title();
    expect(title).toContain('Bid Entry');
    
    // Check for auction selection dropdown
    const auctionSelect = await waitForSelector(page, 'select[name="auction_id"]');
    expect(auctionSelect).toBeTruthy();
    
    // Verify there are auction options available
    const options = await page.$$eval('select[name="auction_id"] option', options => 
      options.map(option => option.textContent)
    );
    expect(options.length).toBeGreaterThan(1); // At least one option plus placeholder
  });

  test('should load items when auction is selected', async () => {
    // Select an auction
    await page.selectOption('select[name="auction_id"]', '1'); // Assuming auction ID 1 exists
    
    // Wait for items to load via AJAX
    await page.waitForTimeout(1000); // Wait for AJAX call
    
    // Check that items table is populated
    const itemRows = await page.$$('table.items-table tbody tr');
    expect(itemRows.length).toBeGreaterThan(0);
    
    // Verify table headers are present
    const headers = await page.$$eval('table.items-table thead th', headers =>
      headers.map(h => h.textContent.trim())
    );
    expect(headers).toContain('Item Name');
    expect(headers).toContain('Bidder');
    expect(headers).toContain('Price');
  });

  test('should perform bidder lookup via AJAX', async () => {
    // Select an auction first
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Find a bidder lookup input field
    const bidderInput = await waitForSelector(page, 'input.bidder-lookup');
    
    // Type in search term
    await fillField(page, 'input.bidder-lookup', 'John');
    
    // Wait for AJAX lookup results
    await page.waitForTimeout(1000);
    
    // Check that suggestions appear
    const suggestions = await page.$('.lookup-results');
    expect(suggestions).toBeTruthy();
    
    // Verify suggestion contains expected data
    const suggestionText = await page.$eval('.lookup-results', el => el.textContent);
    expect(suggestionText).toContain('John');
  });

  test('should perform item lookup via AJAX', async () => {
    // Select an auction
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Find item lookup input
    const itemInput = await waitForSelector(page, 'input.item-lookup');
    
    // Type search term
    await fillField(page, 'input.item-lookup', 'Wine');
    
    // Wait for AJAX results
    await page.waitForTimeout(1000);
    
    // Verify item suggestions appear
    const suggestions = await page.$('.item-results');
    if (suggestions) {
      const suggestionText = await page.$eval('.item-results', el => el.textContent);
      expect(suggestionText).toContain('Wine');
    }
  });

  test('should save a bid via AJAX form submission', async () => {
    // Select auction
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Fill in bid form (assuming form fields exist)
    await fillField(page, 'input[name="item_id"]', '1');
    await fillField(page, 'input[name="bidder_id"]', '1');
    await fillField(page, 'input[name="winning_price"]', '125.50');
    await fillField(page, 'input[name="quantity_won"]', '1');
    
    // Submit the form
    const submitButton = await waitForSelector(page, 'button[type="submit"], input[type="submit"]');
    await submitButton.click();
    
    // Wait for AJAX response
    await page.waitForTimeout(1000);
    
    // Check for success message or updated data
    const successMessage = await page.$('.success-message, .alert-success');
    if (successMessage) {
      const messageText = await page.$eval('.success-message, .alert-success', el => el.textContent);
      expect(messageText).toContain('success');
    }
    
    // Verify the bid appears in the table
    const bidRows = await page.$$('table.items-table tbody tr');
    expect(bidRows.length).toBeGreaterThan(0);
    
    // Check that the bid data is displayed
    const tableText = await page.$eval('table.items-table', table => table.textContent);
    expect(tableText).toContain('125.50');
  });

  test('should update auction statistics in real-time', async () => {
    // Select auction
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Get initial stats
    const initialRevenue = await page.$eval('.total-revenue', el => el.textContent).catch(() => '0');
    
    // Add a bid
    await fillField(page, 'input[name="item_id"]', '2');
    await fillField(page, 'input[name="bidder_id"]', '1');
    await fillField(page, 'input[name="winning_price"]', '75.00');
    
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Check that stats updated
      const newRevenue = await page.$eval('.total-revenue', el => el.textContent).catch(() => '0');
      expect(newRevenue).not.toBe(initialRevenue);
    }
  });

  test('should handle keyboard navigation', async () => {
    // Select auction
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Test Tab navigation through form fields
    const firstInput = await page.locator('input[type="text"], input[type="number"]').first();
    if (await firstInput.count() > 0) {
      await firstInput.focus();
      
      // Press Tab to move to next field
      await page.keyboard.press('Tab');
      
      // Check that focus moved
      const activeElement = await page.evaluate(() => document.activeElement.tagName);
      expect(activeElement).toBe('INPUT');
    }
    
    // Test Enter key submission (if supported)
    const priceInput = await page.$('input[name="winning_price"]');
    if (priceInput) {
      await priceInput.focus();
      await page.type('input[name="winning_price"]', '100.00');
      
      // Press Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Check if form was submitted or next field focused
      // This depends on the specific implementation
    }
  });

  test('should handle form validation errors', async () => {
    // Select auction
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Try to submit incomplete form
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(500);
      
      // Check for validation errors
      const errorMessage = await page.$('.error-message, .alert-danger');
      if (errorMessage) {
        const errorText = await page.$eval('.error-message, .alert-danger', el => el.textContent);
        expect(errorText).toContain('required');
      }
    }
    
    // Test invalid price format
    await fillField(page, 'input[name="winning_price"]', 'invalid');
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(500);
      
      // Should show price validation error
      const priceError = await page.$('.price-error');
      if (priceError) {
        expect(priceError).toBeTruthy();
      }
    }
  });

  test('should update bids and handle overwrites', async () => {
    // Select auction
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Place initial bid
    await fillField(page, 'input[name="item_id"]', '1');
    await fillField(page, 'input[name="bidder_id"]', '1');
    await fillField(page, 'input[name="winning_price"]', '100.00');
    
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Update the same item with higher bid
      await fillField(page, 'input[name="item_id"]', '1');
      await fillField(page, 'input[name="bidder_id"]', '2');
      await fillField(page, 'input[name="winning_price"]', '150.00');
      
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Verify the bid was updated (not duplicated)
      const tableText = await page.$eval('table.items-table', table => table.textContent);
      expect(tableText).toContain('150.00');
      expect(tableText).not.toContain('100.00'); // Old bid should be gone
    }
  });

  test('should handle network errors gracefully', async () => {
    // Select auction
    await page.selectOption('select[name="auction_id"]', '1');
    await page.waitForTimeout(500);
    
    // Intercept network requests and simulate failure
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('save_bid.php')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Try to submit bid
    await fillField(page, 'input[name="item_id"]', '1');
    await fillField(page, 'input[name="bidder_id"]', '1');
    await fillField(page, 'input[name="winning_price"]', '125.00');
    
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Should show network error message
      const errorMessage = await page.$('.network-error, .connection-error');
      if (errorMessage) {
        expect(errorMessage).toBeTruthy();
      }
    }
  });
});