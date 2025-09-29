const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Batch Mode UI Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('Batch mode banner text should be visible (not white on white)', async ({ page }) => {
        // First create an auction to use
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'UI Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        // Wait for redirect and get the auction ID from URL
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const url = page.url();
        const auctionId = url.match(/id=(\d+)/)[1];
        
        // Navigate to batch mode
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}`);
        
        // Check that the batch mode banner is visible
        const banner = page.locator('.batch-mode-banner');
        await expect(banner).toBeVisible();
        
        // Check that the auction context text is visible and has proper styling
        const auctionContext = page.locator('.batch-mode-banner .auction-context');
        await expect(auctionContext).toBeVisible();
        
        // Debug: Log all CSS properties and parent hierarchy
        const cssDebug = await auctionContext.evaluate(el => {
            const computed = getComputedStyle(el);
            let parent = el.parentElement;
            let parentClasses = [];
            while (parent && parentClasses.length < 3) {
                parentClasses.push(parent.className);
                parent = parent.parentElement;
            }
            return {
                color: computed.color,
                backgroundColor: computed.backgroundColor,
                background: computed.background,
                className: el.className,
                parentClasses: parentClasses,
                innerHTML: el.innerHTML.substring(0, 100),
                outerHTML: el.outerHTML.substring(0, 200),
                hasParentWithBatchClass: el.closest('.batch-mode-banner') !== null
            };
        });
        
        console.log('CSS Debug:', cssDebug);
        
        // Check computed styles - text should not be white on white background
        const textColor = cssDebug.color;
        const backgroundColor = cssDebug.backgroundColor;
        
        console.log(`✓ Text color: ${textColor}, Background: ${backgroundColor}`);
        
        // The correct expectation: White text on transparent background is OK 
        // because it sits on the green gradient banner background
        // The key is that background should NOT be white (should be transparent)
        expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
        
        // Check that the banner parent has the correct green background
        const bannerBg = await page.locator('.batch-mode-banner').evaluate(el => {
            const computed = getComputedStyle(el);
            return computed.background;
        });
        
        console.log(`✓ Banner background: ${bannerBg}`);
        expect(bannerBg).toContain('linear-gradient');
    });

    test('Add & Finish button should redirect to auction page', async ({ page }) => {
        // Create an auction first
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Test Batch Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const url = page.url();
        const auctionId = url.match(/id=(\d+)/)[1];
        
        // Go to batch mode and add an item
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${auctionId}&action=add_new`);
        
        await page.fill('input[name="item_name"]', 'Test Item for Batch');
        await page.fill('textarea[name="item_description"]', 'A test item');
        await page.fill('input[name="item_quantity"]', '1');
        
        // Click "Add & Finish" button (the one without a name attribute)
        await page.click('button[type="submit"]:not([name])');
        
        // Should redirect to auction edit page
        await expect(page).toHaveURL(new RegExp(`auctions\\.php\\?action=edit&id=${auctionId}`));
        
        // Check that item was added to auction
        await expect(page.locator('text=Test Item for Batch')).toBeVisible();
    });

    test('Adding existing items in batch mode should work', async ({ page }) => {
        // Create some items first
        await page.goto(`${baseUrl}/pages/items.php?action=add`);
        await page.fill('input[name="item_name"]', 'Pre-existing Item 1');
        await page.fill('textarea[name="item_description"]', 'Test item 1');
        await page.click('button[type="submit"]');
        
        await page.goto(`${baseUrl}/pages/items.php?action=add`);
        await page.fill('input[name="item_name"]', 'Pre-existing Item 2');
        await page.fill('textarea[name="item_description"]', 'Test item 2');
        await page.click('button[type="submit"]');
        
        // Create an auction
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Existing Items Test');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const url = page.url();
        const auctionId = url.match(/id=(\d+)/)[1];
        
        // Go to regular items page and enable batch mode
        await page.goto(`${baseUrl}/pages/items.php`);
        await page.selectOption('#batch_auction_select', auctionId);
        
        // Should show batch mode banner
        await expect(page.locator('.alert-info')).toBeVisible();
        await expect(page.locator('text=Batch Mode Active')).toBeVisible();
    });

    test('Navigation between batch modes should work', async ({ page }) => {
        // Create two auctions
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'First Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const firstUrl = page.url();
        const firstAuctionId = firstUrl.match(/id=(\d+)/)[1];
        
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Second Auction');
        await page.fill('input[name="auction_date"]', '2024-02-02');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const secondUrl = page.url();
        const secondAuctionId = secondUrl.match(/id=(\d+)/)[1];
        
        // Start in batch mode for first auction
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${firstAuctionId}`);
        await expect(page.locator('text=First Auction')).toBeVisible();
        
        // Navigate to second auction batch mode
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${secondAuctionId}`);
        await expect(page.locator('text=Second Auction')).toBeVisible();
        
        // Navigate back to first auction
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=${firstAuctionId}`);
        await expect(page.locator('text=First Auction')).toBeVisible();
    });

    test('Error handling for invalid auction ID', async ({ page }) => {
        // Try to access batch mode with invalid auction ID
        await page.goto(`${baseUrl}/pages/batch_items.php?auction_id=99999`);
        
        // Should redirect or show error
        await expect(page).toHaveURL(`${baseUrl}/pages/auctions.php`);
    });

    test('Can delete an auction', async ({ page, browserName }) => {
        // Create a test auction with timestamp to ensure uniqueness
        const timestamp = Date.now();
        const auctionName = `${browserName} Delete Test Auction ${timestamp}`;
        
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', auctionName);
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        // Go back to auction list
        await page.goto(`${baseUrl}/pages/auctions.php`);
        
        // Find the auction row and delete button
        const auctionRow = page.locator('tr', { hasText: auctionName });
        await expect(auctionRow).toBeVisible();
        
        // Set up dialog handler to accept before clicking
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
        // Create a test auction with timestamp to ensure uniqueness
        const timestamp = Date.now();
        const auctionName = `${browserName} Cancel Delete Test ${timestamp}`;
        
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', auctionName);
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        // Go back to auction list
        await page.goto(`${baseUrl}/pages/auctions.php`);
        
        // Find the auction row
        const auctionRow = page.locator('tr', { hasText: auctionName });
        await expect(auctionRow).toBeVisible();
        
        // Set up dialog handler to cancel (before clicking)
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Delete this auction');
            await dialog.dismiss();
        });
        
        // Click delete button
        await auctionRow.locator('button', { hasText: 'Delete' }).click();
        
        // Wait a moment for any potential navigation
        await page.waitForTimeout(1000);
        
        // Verify auction is still there (re-locate to avoid stale element)
        const stillThereRow = page.locator('tr', { hasText: auctionName });
        await expect(stillThereRow).toBeVisible();
    });
});