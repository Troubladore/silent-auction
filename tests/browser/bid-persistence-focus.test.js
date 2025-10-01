/**
 * Focused test to isolate the bid persistence issue after page reload
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Focused Bid Persistence Investigation', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should isolate the exact point where persistence fails', async ({ page }) => {
        console.log('=== FOCUSED PERSISTENCE TEST ===');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Step 1: Make a single edit and verify immediate state
        console.log('\n--- Step 1: Single Edit Test ---');
        
        // Find and click edit if there's an existing bid
        const hasExistingBid = await page.locator('.edit-bid-btn').count() > 0;
        if (hasExistingBid) {
            console.log('Found existing bid, clicking edit...');
            await page.click('.edit-bid-btn');
            await page.waitForTimeout(300);
        }
        
        // Make the modification
        await page.fill('#bidder-id', '3');
        await page.waitForTimeout(400);
        
        // Auto-select if dropdown appears
        const dropdownItems = page.locator('.lookup-item:not(.no-results)');
        if (await dropdownItems.count() > 0) {
            await dropdownItems.first().click();
            await page.waitForTimeout(200);
        }
        
        await page.fill('#winning-price', '200.00');
        
        // Monitor the save request
        let saveResponse = null;
        page.on('response', response => {
            if (response.url().includes('/api/save_bid.php')) {
                saveResponse = { status: response.status(), url: response.url() };
            }
        });
        
        // Save the bid
        await page.click('#save-bid');
        await page.waitForTimeout(2000);
        
        console.log('Save response:', saveResponse);
        
        // Step 2: Check JavaScript state immediately after save
        const jsStateAfterSave = await page.evaluate(() => {
            const item = window.auctionItems[0];
            return {
                bidder_id: item.bidder_id,
                winning_price: item.winning_price,
                winner_name: item.winner_name
            };
        });
        console.log('JS state after save:', jsStateAfterSave);
        
        // Step 3: Check database directly via API
        const dbCheckAfterSave = await page.evaluate(async () => {
            try {
                const response = await fetch('../api/debug_bid_check.php?auction_id=80');
                const data = await response.json();
                return {
                    current_bids: data.current_bids,
                    auction_items: data.auction_items
                };
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log('Database state after save:', JSON.stringify(dbCheckAfterSave, null, 2));
        
        // Step 4: Reload page and check what gets loaded
        console.log('\n--- Step 4: Page Reload Test ---');
        await page.reload();
        await page.waitForTimeout(2000);
        
        // Check what PHP loads on page reload
        const phpLoadedData = await page.evaluate(() => {
            return window.auctionItems ? window.auctionItems[0] : null;
        });
        console.log('PHP loaded data after reload:', phpLoadedData);
        
        // Step 5: Check database again after reload
        const dbCheckAfterReload = await page.evaluate(async () => {
            try {
                const response = await fetch('../api/debug_bid_check.php?auction_id=80');
                const data = await response.json();
                return {
                    current_bids: data.current_bids,
                    auction_items: data.auction_items
                };
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log('Database state after reload:', JSON.stringify(dbCheckAfterReload, null, 2));
        
        // Analysis
        console.log('\n--- ANALYSIS ---');
        console.log(`Save API status: ${saveResponse?.status || 'NO RESPONSE'}`);
        console.log(`JS state preserved: ${jsStateAfterSave.bidder_id === 3 && parseFloat(jsStateAfterSave.winning_price) === 200}`);
        console.log(`DB state after save: ${dbCheckAfterSave.current_bids?.[0]?.bidder_id === '3'}`);
        console.log(`PHP reload data: ${phpLoadedData?.bidder_id === 3}`);
        console.log(`DB state after reload: ${dbCheckAfterReload.current_bids?.[0]?.bidder_id === '3'}`);
        
        // Determine the exact failure point
        if (saveResponse?.status !== 200) {
            throw new Error('FAILURE POINT: API save request failed');
        }
        
        if (jsStateAfterSave.bidder_id !== 3) {
            throw new Error('FAILURE POINT: JavaScript state not updated after save');
        }
        
        if (!dbCheckAfterSave.current_bids?.[0] || dbCheckAfterSave.current_bids[0].bidder_id !== '3') {
            throw new Error('FAILURE POINT: Database not updated after save');
        }
        
        if (!phpLoadedData || phpLoadedData.bidder_id !== 3) {
            throw new Error('FAILURE POINT: PHP not loading correct data on page reload');
        }
        
        console.log('✅ All persistence checks passed!');
    });
    
    test('should test rapid successive updates', async ({ page }) => {
        console.log('=== RAPID UPDATE TEST ===');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        const updates = [
            { bidder: '1', price: '100.00' },
            { bidder: '2', price: '150.00' },
            { bidder: '1', price: '175.00' },
        ];
        
        for (let i = 0; i < updates.length; i++) {
            const update = updates[i];
            console.log(`\\nUpdate ${i + 1}: Bidder ${update.bidder}, Price $${update.price}`);
            
            // Find and click edit if there's an existing bid
            const hasExistingBid = await page.locator('.edit-bid-btn').count() > 0;
            if (hasExistingBid) {
                await page.click('.edit-bid-btn');
                await page.waitForTimeout(200);
            }
            
            await page.fill('#bidder-id', update.bidder);
            await page.waitForTimeout(300);
            
            const dropdownItems = page.locator('.lookup-item:not(.no-results)');
            if (await dropdownItems.count() > 0) {
                await dropdownItems.first().click();
                await page.waitForTimeout(200);
            }
            
            await page.fill('#winning-price', update.price);
            await page.click('#save-bid');
            await page.waitForTimeout(1500);
            
            // Check state after each update
            const currentState = await page.evaluate(() => {
                const item = window.auctionItems[0];
                return {
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price
                };
            });
            
            console.log(`State after update ${i + 1}:`, currentState);
            
            if (currentState.bidder_id !== parseInt(update.bidder)) {
                throw new Error(`Update ${i + 1} failed: Expected bidder ${update.bidder}, got ${currentState.bidder_id}`);
            }
        }
        
        // Final reload test
        console.log('\\n--- Final Reload Test ---');
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
        
        const lastUpdate = updates[updates.length - 1];
        if (finalState.bidder_id !== parseInt(lastUpdate.bidder) || 
            parseFloat(finalState.winning_price) !== parseFloat(lastUpdate.price)) {
            throw new Error(`Final persistence failed: Expected bidder ${lastUpdate.bidder} price ${lastUpdate.price}, got bidder ${finalState.bidder_id} price ${finalState.winning_price}`);
        }
        
        console.log('✅ Rapid updates and persistence successful!');
    });
});