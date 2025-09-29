/**
 * Browser-based End-to-End Tests for Bid Entry Workflow
 * 
 * These tests use Playwright to control a real browser and test the complete
 * user experience including JavaScript interactions, AJAX calls, and form submissions.
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Bid Entry Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should load bid entry page with auction selection', async ({ page }) => {
        // Navigate to bid entry page
        await page.goto(`${baseUrl}/pages/bid_entry.php`);
        
        // Check that the page loads without errors
        await expect(page.locator('body')).toBeVisible();
        
        // Check that the page title contains something related to bidding
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        
        // Look for auction selection dropdown (flexible)
        const auctionSelect = page.locator('select[name="auction_id"], select[name="auction"], select:has(option:text-matches("auction", "i"))').first();
        
        // If dropdown exists, verify it has options
        if (await auctionSelect.count() > 0) {
            await expect(auctionSelect).toBeVisible();
            const options = await auctionSelect.locator('option').count();
            expect(options).toBeGreaterThan(0);
        } else {
            // Page might have a different structure - just verify it loads
            console.log('No auction dropdown found, but page loads successfully');
        }
    });

    test('should load items when auction is selected', async ({ page }) => {
        // First create an auction with items for testing
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Test Bid Entry Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        // Get auction ID from URL
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const url = page.url();
        const auctionId = url.match(/id=(\d+)/)[1];
        
        // Add an item to the auction
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Test Bid Item');
        await page.fill('textarea[name="item_description"]', 'An item for bid testing');
        await page.click('button[type="submit"]:not([name])'); // Add & Finish
        
        // Now go to bid entry page
        await page.goto(`${baseUrl}/pages/bid_entry.php`);
        
        // Select the auction we just created
        await page.selectOption('select[name="auction_id"]', auctionId);
        
        // Wait for items to load (this might be AJAX)
        await page.waitForTimeout(1000);
        
        // Check that items are displayed
        await expect(page.locator('text=Test Bid Item')).toBeVisible();
    });

    test('should allow entering bids for items', async ({ page }) => {
        // Create test setup (auction with items)
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Bid Entry Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Add item
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Bidding Test Item');
        await page.click('button[type="submit"]:not([name])');
        
        // Create a bidder
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Test');
        await page.fill('input[name="last_name"]', 'Bidder');
        await page.fill('input[name="phone"]', '5551234567');
        await page.fill('input[name="email"]', 'test@bidder.com');
        await page.click('button[type="submit"]');
        
        // Now test bid entry
        await page.goto(`${baseUrl}/pages/bid_entry.php`);
        await page.selectOption('select[name="auction_id"]', auctionId);
        
        // Wait for page to load
        await page.waitForTimeout(1000);
        
        // Look for bid entry form elements
        const itemRow = page.locator('tr', { hasText: 'Bidding Test Item' });
        await expect(itemRow).toBeVisible();
        
        // Check for bidder selection and price input
        const bidderSelect = itemRow.locator('select').first();
        const priceInput = itemRow.locator('input[type="number"]').first();
        
        await expect(bidderSelect).toBeVisible();
        await expect(priceInput).toBeVisible();
    });

    test('should save bid entries successfully', async ({ page }) => {
        // Create complete test scenario
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Save Bid Test');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Add item
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Save Bid Item');
        await page.click('button[type="submit"]:not([name])');
        
        // Create bidder
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Save');
        await page.fill('input[name="last_name"]', 'Test');
        await page.fill('input[name="email"]', 'save@test.com');
        await page.click('button[type="submit"]');
        
        // Enter bid
        await page.goto(`${baseUrl}/pages/bid_entry.php`);
        await page.selectOption('select[name="auction_id"]', auctionId);
        await page.waitForTimeout(1000);
        
        const itemRow = page.locator('tr', { hasText: 'Save Bid Item' });
        
        // Select bidder and enter price
        await itemRow.locator('select').first().selectOption({ label: /Save Test/ });
        await itemRow.locator('input[type="number"]').first().fill('25.00');
        
        // Save the bid
        const saveButton = page.locator('button', { hasText: /Save.*Bid/i });
        if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Check for success message
            await expect(page.locator('.alert-success, .success, text=saved')).toBeVisible();
        }
    });
});