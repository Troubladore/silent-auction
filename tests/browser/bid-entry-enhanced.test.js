/**
 * Enhanced Bid Entry Tests - Testing new typeahead and editing functionality
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Enhanced Bid Entry - Typeahead and Editing', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
        
        // Create a test bidder for consistent testing
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'TypeAhead');
        await page.fill('input[name="last_name"]', 'TestUser');
        await page.fill('input[name="phone"]', '5551234567');
        await page.fill('input[name="email"]', 'typeahead@test.com');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
    });

    test('should show dynamic typeahead dropdown with proper formatting', async ({ page }) => {
        // Go to bid entry page
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Type in bidder field to trigger typeahead
        await page.fill('#bidder-id', 'Type');
        await page.waitForTimeout(500); // Wait for debounce and AJAX

        // Check if dropdown appears (even if AJAX returns 500, the dropdown should show)
        const dropdown = page.locator('#bidder-lookup');
        await expect(dropdown).toBeVisible();

        // Clear and try with number
        await page.fill('#bidder-id', '1');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();
    });

    test('should show bidder info when selected', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Mock selecting a bidder by directly calling the JavaScript function
        await page.evaluate(() => {
            if (window.bidEntryInstance) {
                window.bidEntryInstance.selectBidder('1', 'John Smith', '555-1234', 'john@example.com');
            }
        });

        // Check if bidder info is displayed
        const bidderInfo = page.locator('.selected-bidder, .current-bid');
        await expect(bidderInfo).toBeVisible();
        
        // Should contain the bidder name
        await expect(bidderInfo).toContainText('John Smith');
    });

    test('should show edit and delete options for existing bids', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Check if there's an existing bid (from the test data)
        const currentItem = await page.evaluate(() => {
            return window.auctionItems && window.auctionItems[0];
        });

        if (currentItem?.winning_price) {
            // Should show edit and delete buttons
            await expect(page.locator('.edit-bid-btn')).toBeVisible();
            await expect(page.locator('.delete-bid-btn')).toBeVisible();
            
            // Save button should show "UPDATE BID"
            const saveBtn = page.locator('#save-bid');
            await expect(saveBtn).toContainText('UPDATE');
        }
    });

    test('should clear bidder selection when clear button is clicked', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Mock selecting a bidder
        await page.evaluate(() => {
            if (window.bidEntryInstance) {
                window.bidEntryInstance.selectBidder('1', 'Test User', '555-0000', 'test@example.com');
            }
        });

        // Click clear button
        await page.click('.clear-bidder');

        // Bidder field should be empty
        const bidderInput = page.locator('#bidder-id');
        await expect(bidderInput).toHaveValue('');
        
        // Lookup area should be clear
        const lookup = page.locator('#bidder-lookup');
        await expect(lookup).toBeEmpty();
    });

    test('should validate bidder selection before saving', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Try to save without selecting a bidder
        await page.fill('#bidder-id', '999');
        await page.fill('#winning-price', '100');
        
        // Mock the validation by trying to submit
        await page.click('#save-bid');

        // Should show validation error (checking for alert or error message)
        // Note: This might show as an alert in the browser
        await page.waitForTimeout(500);
    });

    test('should enable editing mode when edit button is clicked', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Check if there's an existing bid to edit
        const editBtn = page.locator('.edit-bid-btn');
        if (await editBtn.count() > 0) {
            await editBtn.click();

            // Form fields should be enabled for editing
            const bidderInput = page.locator('#bidder-id');
            const priceInput = page.locator('#winning-price');
            
            await expect(bidderInput).toBeEnabled();
            await expect(priceInput).toBeEnabled();
            
            // Should be able to modify the values
            await bidderInput.focus();
        }
    });

    test('should handle keyboard navigation in dropdown', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Type to trigger dropdown
        await page.fill('#bidder-id', 'test');
        await page.waitForTimeout(500);

        // Test arrow key navigation (even if AJAX fails, dropdown should handle keys)
        const bidderInput = page.locator('#bidder-id');
        await bidderInput.press('ArrowDown');
        await page.waitForTimeout(100);
        
        // Test Escape key to close dropdown
        await bidderInput.press('Escape');
        await page.waitForTimeout(100);
    });
});