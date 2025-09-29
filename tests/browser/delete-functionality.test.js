const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Delete Functionality Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('Can delete an auction', async ({ page, browserName }) => {
        // Create a test auction
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', `${browserName} Delete Test Auction`);
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        // Go back to auction list
        await page.goto(`${baseUrl}/pages/auctions.php`);
        
        // Find the auction row and delete button
        const auctionRow = page.locator('tr', { hasText: `${browserName} Delete Test Auction` });
        await expect(auctionRow).toBeVisible();
        
        // Set up dialog handler to accept
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Delete this auction');
            await dialog.accept();
        });
        
        // Click delete button (form submit)
        await auctionRow.locator('button', { hasText: 'Delete' }).click();
        
        // Wait for redirect back to auction list
        await page.waitForURL(`${baseUrl}/pages/auctions.php`);
        
        // Verify auction is gone
        await expect(auctionRow).not.toBeVisible();
    });

    test('Delete confirmation can be cancelled', async ({ page, browserName }) => {
        // Create a test auction
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', `${browserName} Cancel Delete Test`);
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        // Go back to auction list
        await page.goto(`${baseUrl}/pages/auctions.php`);
        
        // Find the auction row
        const auctionRow = page.locator('tr', { hasText: `${browserName} Cancel Delete Test` });
        await expect(auctionRow).toBeVisible();
        
        // Set up dialog handler to cancel
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Delete this auction');
            await dialog.dismiss();
        });
        
        // Click delete button
        await auctionRow.locator('button', { hasText: 'Delete' }).click();
        
        // Wait a moment for any potential navigation
        await page.waitForTimeout(1000);
        
        // Verify auction is still there
        await expect(auctionRow).toBeVisible();
    });
});