/**
 * Focused Bid Preservation Debugging
 * Isolate the exact cause of bid disappearance
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Bid Preservation Root Cause Analysis', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should trace complete bid lifecycle with detailed logging', async ({ page }) => {
        console.log('=== BID LIFECYCLE TRACE ===');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Enable console logging
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[BidEntry]') || text.includes('DEBUG:')) {
                logs.push(`${new Date().toISOString()}: ${text}`);
                console.log(text);
            }
        });

        // Monitor all network requests
        const requests = [];
        page.on('request', request => {
            if (request.url().includes('save_bid') || request.url().includes('bid_entry')) {
                requests.push({
                    url: request.url(),
                    method: request.method(),
                    timestamp: new Date().toISOString(),
                    type: 'request'
                });
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('save_bid') || response.url().includes('bid_entry')) {
                requests.push({
                    url: response.url(),
                    status: response.status(),
                    timestamp: new Date().toISOString(),
                    type: 'response'
                });
            }
        });

        // Step 1: Initial state check
        console.log('\n=== STEP 1: Initial State Check ===');
        const initialItems = await page.evaluate(() => {
            return window.auctionItems ? window.auctionItems.map(item => ({
                id: item.item_id,
                name: item.item_name,
                bidder_id: item.bidder_id,
                winning_price: item.winning_price
            })) : [];
        });
        console.log('Initial items:', JSON.stringify(initialItems, null, 2));

        // Step 2: Create first bid
        console.log('\n=== STEP 2: Creating First Bid ===');
        await page.fill('#bidder-id', '1');
        await page.waitForTimeout(400);
        
        // Auto-select or click dropdown
        const dropdownItems = page.locator('.lookup-item:not(.no-results)');
        if (await dropdownItems.count() > 0) {
            await dropdownItems.first().click();
            await page.waitForTimeout(200);
        }
        
        await page.fill('#winning-price', '100.00');
        await page.click('#save-bid');
        await page.waitForTimeout(2000);

        // Check JavaScript state after first save
        const afterFirstSave = await page.evaluate(() => {
            return {
                items: window.auctionItems ? window.auctionItems.map(item => ({
                    id: item.item_id,
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price
                })) : [],
                activityLog: window.bidEntryInstance ? window.bidEntryInstance.getActivityLog().slice(-5) : []
            };
        });
        console.log('After first save - JS items:', JSON.stringify(afterFirstSave.items, null, 2));
        console.log('Activity log:', JSON.stringify(afterFirstSave.activityLog, null, 2));

        // Step 3: Navigate away and back
        console.log('\n=== STEP 3: Navigation Test ===');
        await page.goto(`${baseUrl}/pages/index.php`);
        await page.waitForTimeout(1000);
        console.log('Navigated to index page');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(2000);
        console.log('Navigated back to bid entry');

        // Check state after navigation
        const afterNavigation = await page.evaluate(() => {
            return {
                items: window.auctionItems ? window.auctionItems.map(item => ({
                    id: item.item_id,
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price
                })) : []
            };
        });
        console.log('After navigation - JS items:', JSON.stringify(afterNavigation.items, null, 2));

        // Step 4: Check database directly via AJAX
        console.log('\n=== STEP 4: Database Verification ===');
        const dbCheck = await page.evaluate(async () => {
            try {
                const response = await fetch('../api/debug_bid_check.php?auction_id=80');
                return await response.json();
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log('Database check result:', JSON.stringify(dbCheck, null, 2));

        // Step 5: Page reload test
        console.log('\n=== STEP 5: Page Reload Test ===');
        await page.reload();
        await page.waitForTimeout(2000);

        const afterReload = await page.evaluate(() => {
            return {
                items: window.auctionItems ? window.auctionItems.map(item => ({
                    id: item.item_id,
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price
                })) : []
            };
        });
        console.log('After reload - JS items:', JSON.stringify(afterReload.items, null, 2));

        // Step 6: Summary
        console.log('\n=== SUMMARY ===');
        console.log('Network requests:', requests.length);
        requests.forEach(req => console.log(`${req.type}: ${req.url} (${req.status || req.method})`));
        
        console.log('\nConsole logs count:', logs.length);
        
        // Verify the final state
        const hasBidInJSState = afterReload.items.some(item => item.bidder_id || item.winning_price);
        console.log('Has bid in final JS state:', hasBidInJSState);
        
        if (!hasBidInJSState) {
            throw new Error('BID PRESERVATION FAILURE: Bid disappeared from JavaScript state');
        }
    });

    test('should test API persistence directly', async ({ page }) => {
        console.log('=== DIRECT API PERSISTENCE TEST ===');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Step 1: Save bid via API directly
        const saveResult = await page.evaluate(async () => {
            const bidData = {
                auction_id: 80,
                item_id: window.auctionItems[0].item_id,
                bidder_id: 1,
                winning_price: 150.00,
                quantity_won: 1,
                action: 'save'
            };
            
            console.log('Sending bid data:', bidData);
            
            const response = await fetch('../api/save_bid.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bidData)
            });
            
            const result = await response.json();
            console.log('Save response:', result);
            return { status: response.status, result };
        });
        
        console.log('API save result:', saveResult);

        // Step 2: Immediately check if it persisted
        await page.waitForTimeout(500);
        
        // Reload the page to get fresh data
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1500);

        const freshData = await page.evaluate(() => {
            return {
                items: window.auctionItems ? window.auctionItems.map(item => ({
                    id: item.item_id,
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price,
                    winner_name: item.winner_name
                })) : []
            };
        });
        
        console.log('Fresh data after API save:', JSON.stringify(freshData, null, 2));
        
        const hasPersisted = freshData.items.some(item => 
            item.bidder_id === 1 && parseFloat(item.winning_price) === 150.00
        );
        
        console.log('Bid persisted in database:', hasPersisted);
        
        if (!hasPersisted) {
            throw new Error('DIRECT API PERSISTENCE FAILURE: Bid not found after direct API save');
        }
    });

    test('should test multiple bid modifications and final state', async ({ page }) => {
        console.log('=== MULTIPLE MODIFICATION TEST ===');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        const modifications = [
            { bidder: '1', price: '50.00', step: 'Initial bid' },
            { bidder: '2', price: '75.00', step: 'Update to different bidder' },
            { bidder: '2', price: '90.00', step: 'Update same bidder, new price' },
            { bidder: '3', price: '110.00', step: 'Final update to third bidder' }
        ];

        for (let i = 0; i < modifications.length; i++) {
            const mod = modifications[i];
            console.log(`\n--- ${mod.step} ---`);
            
            // Check if there's an existing bid (edit mode)
            const hasExistingBid = await page.locator('.edit-bid-btn').count() > 0;
            if (hasExistingBid) {
                console.log('Found existing bid, entering edit mode...');
                await page.click('.edit-bid-btn');
                await page.waitForTimeout(300);
            }
            
            // Make modification
            await page.fill('#bidder-id', mod.bidder);
            await page.waitForTimeout(400);
            
            const dropdownItems = page.locator('.lookup-item:not(.no-results)');
            if (await dropdownItems.count() > 0) {
                await dropdownItems.first().click();
                await page.waitForTimeout(200);
            }
            
            await page.fill('#winning-price', mod.price);
            await page.click('#save-bid');
            await page.waitForTimeout(1500);
            
            // Check JavaScript state
            const currentState = await page.evaluate(() => {
                const item = window.auctionItems[0];
                return {
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price,
                    winner_name: item.winner_name
                };
            });
            
            console.log(`State after ${mod.step}:`, currentState);
            console.log(`Expected: bidder=${mod.bidder}, price=${mod.price}`);
            
            // Verify the change
            if (currentState.bidder_id !== parseInt(mod.bidder)) {
                console.log(`WARNING: Bidder ID mismatch. Expected ${mod.bidder}, got ${currentState.bidder_id}`);
            }
            
            if (parseFloat(currentState.winning_price) !== parseFloat(mod.price)) {
                console.log(`WARNING: Price mismatch. Expected ${mod.price}, got ${currentState.winning_price}`);
            }
        }

        // Final persistence test
        console.log('\n--- Final Persistence Test ---');
        await page.reload();
        await page.waitForTimeout(2000);

        const finalState = await page.evaluate(() => {
            const item = window.auctionItems[0];
            return {
                bidder_id: item.bidder_id,
                winning_price: item.winning_price,
                winner_name: item.winner_name
            };
        });

        console.log('Final state after reload:', finalState);
        const lastMod = modifications[modifications.length - 1];
        console.log(`Expected final state: bidder=${lastMod.bidder}, price=${lastMod.price}`);

        if (!finalState.bidder_id || !finalState.winning_price) {
            throw new Error('FINAL STATE FAILURE: Bid data missing after multiple modifications');
        }
    });
});