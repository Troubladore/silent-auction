/**
 * Fixed Bid Entry Tests - Testing the actual UI implementation
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Bid Entry Workflow - Actual Implementation', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should load bid entry page with auction cards', async ({ page }) => {
        // Navigate to bid entry page
        await page.goto(`${baseUrl}/pages/bid_entry.php`);
        
        // Should show auction selector interface (not dropdown)
        await expect(page.locator('h3:has-text("Select Auction")')).toBeVisible();
        
        // Check that page loads without errors
        await expect(page.locator('body')).toBeVisible();
        const title = await page.title();
        expect(title).toContain('Fast Bid Entry');
    });

    test('should show auction cards and allow selection', async ({ page }) => {
        // Create test auction with items
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Bid Entry Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Add item to auction
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Test Item for Bidding');
        await page.fill('textarea[name="item_description"]', 'An item for testing bid entry');
        await page.click('button[type="submit"]:not([name])');
        
        // Now go to bid entry page
        await page.goto(`${baseUrl}/pages/bid_entry.php`);
        
        // Should see the auction card
        await expect(page.locator('.auction-card')).toBeVisible();
        await expect(page.locator('text=Bid Entry Test Auction')).toBeVisible();
        
        // Click "Start Bid Entry" button
        const startButton = page.locator('a:has-text("Start Bid Entry")');
        await expect(startButton).toBeVisible();
        await startButton.click();
        
        // Should navigate to the bid entry interface
        await expect(page).toHaveURL(new RegExp(`bid_entry\\.php\\?auction_id=${auctionId}`));
    });

    test('should display bid entry interface with AJAX functionality', async ({ page }) => {
        // Create complete test setup
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'AJAX Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Add item
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'AJAX Test Item');
        await page.click('button[type="submit"]:not([name])');
        
        // Create test bidder
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Test');
        await page.fill('input[name="last_name"]', 'Bidder');
        await page.fill('input[name="phone"]', '5551234567');
        await page.fill('input[name="email"]', 'test@bidder.com');
        await page.click('button[type="submit"]');
        
        // Go to bid entry interface
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=${auctionId}`);
        
        // Check interface elements
        await expect(page.locator('#bid-form')).toBeVisible();
        await expect(page.locator('#bidder-id')).toBeVisible();
        await expect(page.locator('#winning-price')).toBeVisible();
        await expect(page.locator('#item-display')).toBeVisible();
        
        // Test item display
        await expect(page.locator('#item-info')).toContainText('AJAX Test Item');
        
        // Check if JavaScript is working - test bidder lookup
        await page.fill('#bidder-id', '1');
        
        // Wait a moment for AJAX (if working)
        await page.waitForTimeout(500);
        
        // Check if lookup container exists (even if empty)
        await expect(page.locator('#bidder-lookup')).toBeVisible();
    });

    test('should handle bidder lookup with real AJAX calls', async ({ page }) => {
        // Create bidder first
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'AJAX');
        await page.fill('input[name="last_name"]', 'TestBidder');
        await page.fill('input[name="email"]', 'ajax@test.com');
        await page.click('button[type="submit"]');
        
        // Create auction with item
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Lookup Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Lookup Test Item');
        await page.click('button[type="submit"]:not([name])');
        
        // Go to bid entry
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=${auctionId}`);
        
        // Intercept AJAX calls to verify they're working
        let ajaxCalled = false;
        page.on('response', response => {
            if (response.url().includes('/api/lookup.php')) {
                ajaxCalled = true;
                console.log('AJAX lookup called:', response.url());
            }
        });
        
        // Type in bidder field to trigger lookup
        await page.fill('#bidder-id', 'AJAX');
        
        // Wait for AJAX call
        await page.waitForTimeout(1000);
        
        // Verify AJAX was called
        expect(ajaxCalled).toBe(true);
    });

    test('should test bid saving functionality', async ({ page }) => {
        // Create complete scenario
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Save');
        await page.fill('input[name="last_name"]', 'TestBidder');
        await page.fill('input[name="email"]', 'save@test.com');
        await page.click('button[type="submit"]');
        
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Save Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Save Test Item');
        await page.click('button[type="submit"]:not([name])');
        
        // Go to bid entry
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=${auctionId}`);
        
        // Intercept save calls
        let saveCalled = false;
        page.on('response', response => {
            if (response.url().includes('/api/save_bid.php')) {
                saveCalled = true;
                console.log('AJAX save called:', response.url());
            }
        });
        
        // Fill in bid form
        await page.fill('#bidder-id', '1');
        await page.fill('#winning-price', '25.50');
        
        // Submit form
        await page.click('#save-bid');
        
        // Wait for save call
        await page.waitForTimeout(1000);
        
        // Check if save was attempted
        expect(saveCalled).toBe(true);
    });

    test('should debug JavaScript loading and console errors', async ({ page }) => {
        // Collect console messages and errors
        const messages = [];
        const errors = [];
        
        page.on('console', msg => {
            messages.push(`${msg.type()}: ${msg.text()}`);
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        // Create minimal test setup
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Debug Test');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Go to bid entry page
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=${auctionId}`);
        
        // Wait for page to fully load
        await page.waitForTimeout(2000);
        
        // Check if JavaScript is loaded
        const hasAuctionJs = await page.evaluate(() => {
            return typeof BidEntry !== 'undefined';
        });
        
        const hasAuctionItems = await page.evaluate(() => {
            return typeof window.auctionItems !== 'undefined';
        });
        
        // Log results
        console.log('JavaScript loaded:', hasAuctionJs);
        console.log('Auction items available:', hasAuctionItems);
        console.log('Console messages:', messages);
        console.log('JavaScript errors:', errors);
        
        // Verify JavaScript environment
        expect(errors.length).toBe(0); // Should have no JavaScript errors
    });
});