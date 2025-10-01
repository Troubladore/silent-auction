/**
 * Bid Entry Tests - Using working item creation method
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Bid Entry Workflow - Fixed Item Association', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should create auction and properly associate items', async ({ page }) => {
        // Create auction first
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Working Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/auctions\.php\?action=edit&id=\d+/);
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Create item first via regular items page
        await page.goto(`${baseUrl}/pages/items.php?action=add`);
        await page.fill('input[name="item_name"]', 'Working Test Item');
        await page.fill('textarea[name="item_description"]', 'This should work');
        await page.fill('input[name="item_quantity"]', '1');
        await page.click('button[type="submit"]');
        
        // Go back to auction edit page and add the item
        await page.goto(`${baseUrl}/pages/auctions.php?action=edit&id=${auctionId}`);
        
        // Look for the item in the "Add Items" section
        const addItemsSection = page.locator('text=Working Test Item');
        if (await addItemsSection.count() > 0) {
            // Check the checkbox for our item
            const itemCheckbox = page.locator('input[type="checkbox"][value*="Working Test Item"], input[type="checkbox"]:near(text("Working Test Item"))').first();
            if (await itemCheckbox.count() > 0) {
                await itemCheckbox.check();
                await page.click('button:has-text("Add Selected Items")');
                
                // Wait for page refresh
                await page.waitForTimeout(1000);
            }
        }
        
        // Now test bid entry
        await page.goto(`${baseUrl}/pages/bid_entry.php`);
        
        // Should see our auction card with items
        const auctionCard = page.locator('.auction-card', { hasText: 'Working Test Auction' });
        await expect(auctionCard).toBeVisible();
        
        // Should show that it has items (not "No items in auction")  
        await expect(auctionCard.locator('text=No items in auction')).not.toBeVisible();
        
        // Click to start bid entry
        await auctionCard.locator('a:has-text("Start Bid Entry")').click();
        
        // Should navigate to bid entry interface
        await expect(page).toHaveURL(new RegExp(`bid_entry\\.php\\?auction_id=${auctionId}`));
        
        // Check if auctionItems is now populated
        const hasItems = await page.evaluate(() => {
            return window.auctionItems && window.auctionItems.length > 0;
        });
        
        console.log('Auction items available:', hasItems);
        
        if (hasItems) {
            // Test the bidder lookup functionality
            await page.fill('#bidder-id', '1');
            await page.waitForTimeout(500);
            
            // Should not error out
            await expect(page.locator('#bid-form')).toBeVisible();
        }
    });

    test('should create complete working scenario', async ({ page }) => {
        // Create bidder first
        await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
        await page.fill('input[name="first_name"]', 'Working');
        await page.fill('input[name="last_name"]', 'TestBidder');
        await page.fill('input[name="phone"]', '5551234567');
        await page.fill('input[name="email"]', 'working@test.com');
        await page.click('button[type="submit"]');
        
        // Create item
        await page.goto(`${baseUrl}/pages/items.php?action=add`);
        await page.fill('input[name="item_name"]', 'Complete Test Item');
        await page.fill('textarea[name="item_description"]', 'For complete test');
        await page.click('button[type="submit"]');
        
        // Create auction
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Complete Test Auction');
        await page.fill('input[name="auction_date"]', '2024-02-01');
        await page.click('button[type="submit"]');
        
        const auctionId = page.url().match(/id=(\d+)/)[1];
        
        // Associate item with auction via auction edit page
        // (Page should already be on the edit page after creation)
        
        // Find and select the item we created
        const itemCheckbox = page.locator('input[name="item_ids[]"]').first();
        if (await itemCheckbox.count() > 0) {
            await itemCheckbox.check();
            await page.click('button:has-text("Add Selected Items")');
            await page.waitForTimeout(1000);
        }
        
        // Now go to bid entry
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=${auctionId}`);
        
        // Verify the JavaScript environment
        const jsDebug = await page.evaluate(() => {
            return {
                hasBidEntry: typeof BidEntry !== 'undefined',
                hasAuctionItems: typeof window.auctionItems !== 'undefined',
                itemsLength: window.auctionItems ? window.auctionItems.length : 0,
                items: window.auctionItems || null
            };
        });
        
        console.log('JavaScript debug info:', jsDebug);
        
        // Should have items now
        expect(jsDebug.hasAuctionItems).toBe(true);
        expect(jsDebug.itemsLength).toBeGreaterThan(0);
        
        // Should be able to interact with form
        if (jsDebug.itemsLength > 0) {
            await expect(page.locator('#item-info')).toContainText('Complete Test Item');
            
            // Test bidder ID input
            await page.fill('#bidder-id', '1');
            await page.fill('#winning-price', '25.00');
            
            // Form should be interactive
            await expect(page.locator('#save-bid')).toBeEnabled();
        }
    });
});