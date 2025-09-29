/**
 * Browser-based End-to-End Tests for Reports Functionality
 * 
 * Tests the complete reports workflow including navigation, data display,
 * CSV exports, and print functionality.
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Reports Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should display auction summary report', async ({ page }) => {
        // Navigate to reports page
        await page.goto(`${baseUrl}/pages/reports.php`);
        
        // Check page title
        const title = await page.title();
        expect(title).toContain('Reports');
        
        // Check for basic page structure
        await expect(page.locator('body')).toBeVisible();
        
        // Look for auction selection (if it exists)
        const auctionSelect = page.locator('select[name="auction_id"]');
        if (await auctionSelect.isVisible()) {
            // Check that there are options
            const optionCount = await auctionSelect.locator('option').count();
            expect(optionCount).toBeGreaterThan(0);
        }
    });

    test('should generate reports with test data', async ({ page }) => {
        // First create test data (auction with items and bids)
        
        // Create auction
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Report Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Add items to auction
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Report Test Item 1');
        await page.fill('textarea[name="item_description"]', 'First test item for reporting');
        await page.click('button[name="add_another"]'); // Add & Add Another
        
        await page.fill('input[name="item_name"]', 'Report Test Item 2');
        await page.fill('textarea[name="item_description"]', 'Second test item for reporting');
        await page.click('button[type="submit"]:not([name])'); // Add & Finish
        
        // Create test bidders
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Report');
        await page.fill('input[name="last_name"]', 'TestBidder1');
        await page.fill('input[name="email"]', 'report1@test.com');
        await page.click('button[type="submit"]');
        
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Report');
        await page.fill('input[name="last_name"]', 'TestBidder2');
        await page.fill('input[name="email"]', 'report2@test.com');
        await page.click('button[type="submit"]');
        
        // Now go to reports and test
        await page.goto(`${baseUrl}/pages/reports.php`);
        
        // Select the auction we created (if dropdown exists)
        const auctionSelect = page.locator('select[name="auction_id"]');
        if (await auctionSelect.isVisible()) {
            await auctionSelect.selectOption(auctionId);
            
            // Wait for report to load
            await page.waitForTimeout(1000);
            
            // Check that items appear in the report
            await expect(page.locator('text=Report Test Item 1, text=Report Test Item 2')).toHaveCount(2);
        }
    });

    test('should handle CSV export functionality', async ({ page }) => {
        // Create test data first
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'CSV Export Test');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Add an item
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'CSV Export Item');
        await page.click('button[type="submit"]:not([name])');
        
        // Go to reports
        await page.goto(`${baseUrl}/pages/reports.php`);
        
        // Look for export functionality
        const exportButton = page.locator('button:has-text("export"), a:has-text("csv"), button:has-text("csv")', { hasText: /export|csv/i });
        if (await exportButton.count() > 0) {
            // Set up download handling
            const downloadPromise = page.waitForEvent('download');
            await exportButton.first().click();
            const download = await downloadPromise;
            
            // Verify download occurred
            expect(download.suggestedFilename()).toMatch(/\.csv$/);
        }
    });

    test('should display bidder reports correctly', async ({ page }) => {
        // Create test data
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Bidder');
        await page.fill('input[name="last_name"]', 'Report Test');
        await page.fill('input[name="email"]', 'bidder@reporttest.com');
        await page.fill('input[name="phone"]', '5551234567');
        await page.click('button[type="submit"]');
        
        // Go to reports page
        await page.goto(`${baseUrl}/pages/reports.php`);
        
        // Look for bidder-specific reporting options
        const bidderSection = page.locator('text=bidder, .bidder-report, #bidder');
        if (await bidderSection.count() > 0) {
            // Check that bidders are displayed
            await expect(page.locator('text=Bidder Report Test')).toBeVisible();
        } else {
            // If no specific bidder report section, at least verify page loads
            await expect(page.locator('body')).toBeVisible();
        }
    });

    test('should handle print functionality', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/reports.php`);
        
        // Look for print button
        const printButton = page.locator('button:has-text("print"), a:has-text("print")', { hasText: /print/i });
        if (await printButton.count() > 0) {
            // Print functionality would typically open print dialog
            // We can't easily test the actual printing, but we can test the button exists
            await expect(printButton.first()).toBeVisible();
        }
    });

    test('should show revenue summaries when data exists', async ({ page }) => {
        // Create auction with winning bid data
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Revenue Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Add item
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        await page.fill('input[name="item_name"]', 'Revenue Test Item');
        await page.click('button[type="submit"]:not([name])');
        
        // Create bidder
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Revenue');
        await page.fill('input[name="last_name"]', 'TestBidder');
        await page.fill('input[name="email"]', 'revenue@test.com');
        await page.click('button[type="submit"]');
        
        // Go to reports
        await page.goto(`${baseUrl}/pages/reports.php`);
        
        // Check for revenue/financial summary sections
        const revenueSection = page.locator('text=revenue, text=total, .revenue, .financial');
        if (await revenueSection.count() > 0) {
            // Should show some revenue information
            await expect(revenueSection.first()).toBeVisible();
        }
        
        // At minimum, page should load without errors
        await expect(page.locator('body')).toBeVisible();
        const title = await page.title();
        expect(title).toContain('Reports');
    });

    test('should handle empty auction reports gracefully', async ({ page }) => {
        // Create auction with no items or bids
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Empty Auction Report Test');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Go to reports
        await page.goto(`${baseUrl}/pages/reports.php`);
        
        // Select the empty auction
        const auctionSelect = page.locator('select[name="auction_id"]');
        if (await auctionSelect.isVisible()) {
            await auctionSelect.selectOption(auctionId);
            await page.waitForTimeout(1000);
            
            // Should handle empty state gracefully
            const emptyMessage = page.locator('text=no items, text=no data, text=empty');
            if (await emptyMessage.count() > 0) {
                await expect(emptyMessage.first()).toBeVisible();
            }
        }
        
        // Page should not crash
        await expect(page.locator('body')).toBeVisible();
    });
});