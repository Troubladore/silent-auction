/**
 * Debug test to isolate the final save issue in rapid succession scenarios
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Final Save Issue Debug', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should debug the final save operation timing', async ({ page }) => {
        console.log('=== FINAL SAVE DEBUG ===');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Track all network requests to save_bid.php
        const saveRequests = [];
        page.on('request', request => {
            if (request.url().includes('/api/save_bid.php')) {
                saveRequests.push({
                    timestamp: Date.now(),
                    type: 'request',
                    method: request.method()
                });
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/save_bid.php')) {
                saveRequests.push({
                    timestamp: Date.now(),
                    type: 'response',
                    status: response.status()
                });
            }
        });

        // Sequence of 3 rapid edits similar to the failing test
        const edits = [
            { bidder: '1', price: '100.00', name: 'First edit' },
            { bidder: '2', price: '150.00', name: 'Second edit' },
            { bidder: '3', price: '125.00', name: 'Final edit' }
        ];

        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            console.log(`\\n--- ${edit.name} ---`);
            
            const startTime = Date.now();
            
            // Check for existing bid and enter edit mode
            const hasExistingBid = await page.locator('.edit-bid-btn, .delete-bid-btn').count() > 0;
            if (hasExistingBid) {
                console.log('Found existing bid, entering edit mode...');
                await page.click('.edit-bid-btn');
                await page.waitForTimeout(300);
            }
            
            // Make the edit
            await page.fill('#bidder-id', edit.bidder);
            await page.waitForTimeout(400);
            
            const dropdownItems = page.locator('.lookup-item:not(.no-results)');
            if (await dropdownItems.count() > 0) {
                await dropdownItems.first().click();
                await page.waitForTimeout(200);
            }
            
            await page.fill('#winning-price', edit.price);
            
            // Count requests before save
            const requestsBefore = saveRequests.filter(r => r.type === 'request').length;
            const responsesBefore = saveRequests.filter(r => r.type === 'response').length;
            
            // Save the bid
            console.log(`Saving bid: Bidder ${edit.bidder}, Price $${edit.price}`);
            await page.click('#save-bid');
            
            // Wait for save completion with longer timeout for final edit
            const isLastEdit = i === edits.length - 1;
            const waitTime = isLastEdit ? 3000 : 1500;
            await page.waitForTimeout(waitTime);
            
            // Count requests after save
            const requestsAfter = saveRequests.filter(r => r.type === 'request').length;
            const responsesAfter = saveRequests.filter(r => r.type === 'response').length;
            
            const processingTime = Date.now() - startTime;
            console.log(`Processing time: ${processingTime}ms`);
            console.log(`Requests: ${requestsBefore} -> ${requestsAfter} (+${requestsAfter - requestsBefore})`);
            console.log(`Responses: ${responsesBefore} -> ${responsesAfter} (+${responsesAfter - responsesBefore})`);
            
            // Check JavaScript state after save
            const jsState = await page.evaluate(() => {
                const item = window.auctionItems[0];
                return {
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price,
                    winner_name: item.winner_name
                };
            });
            console.log(`JS state after save:`, jsState);
            
            // If this is the final edit, add extra verification
            if (isLastEdit) {
                console.log('\\n--- FINAL EDIT VERIFICATION ---');
                
                // Wait for any pending requests to complete
                console.log('Waiting for all pending requests to complete...');
                await page.waitForTimeout(2000);
                
                const finalRequests = saveRequests.filter(r => r.type === 'request').length;
                const finalResponses = saveRequests.filter(r => r.type === 'response').length;
                console.log(`Final request/response count: ${finalRequests}/${finalResponses}`);
                
                if (finalRequests !== finalResponses) {
                    console.log('WARNING: Request/response mismatch - some requests may still be pending');
                    
                    // Wait a bit more and check again
                    await page.waitForTimeout(3000);
                    const veryFinalRequests = saveRequests.filter(r => r.type === 'request').length;
                    const veryFinalResponses = saveRequests.filter(r => r.type === 'response').length;
                    console.log(`After additional wait: ${veryFinalRequests}/${veryFinalResponses}`);
                }
            }
            
            // Simulate some of the test's navigation behavior
            if (i < edits.length - 1) {
                console.log('Simulating brief navigation...');
                await page.goto(`${baseUrl}/pages/index.php`);
                await page.waitForTimeout(500);
                await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
                await page.waitForTimeout(1000);
            }
        }
        
        console.log('\\n--- FINAL RELOAD TEST ---');
        
        // Show all save operations that occurred
        console.log('All save operations:');
        for (let i = 0; i < saveRequests.length; i += 2) {
            const req = saveRequests[i];
            const res = saveRequests[i + 1];
            if (req && res) {
                console.log(`${Math.floor((i + 2) / 2)}. Request -> Response (${res.status}) in ${res.timestamp - req.timestamp}ms`);
            }
        }
        
        // Final page reload
        await page.reload();
        await page.waitForTimeout(2000);
        
        // Check final loaded state
        const finalState = await page.evaluate(() => {
            const item = window.auctionItems[0];
            return {
                bidder_id: item.bidder_id,
                winning_price: item.winning_price,
                winner_name: item.winner_name
            };
        });
        
        console.log('Final state after reload:', finalState);
        console.log(`Expected: bidder_id: 3, winning_price: 125.00`);
        
        // Also check if there's any bid display
        const bidDisplay = await page.locator('.current-bid, .selected-bidder').textContent().catch(() => '');
        console.log('Final bid display text:', bidDisplay.trim());
        
        if (!finalState.bidder_id || !finalState.winning_price) {
            console.log('❌ PERSISTENCE FAILURE: Final bid data missing after reload');
            throw new Error('Final bid data missing - persistence failed');
        } else if (finalState.bidder_id !== 3 || parseFloat(finalState.winning_price) !== 125.00) {
            console.log(`❌ INCORRECT DATA: Expected bidder 3 price 125.00, got bidder ${finalState.bidder_id} price ${finalState.winning_price}`);
            throw new Error('Final bid data incorrect - wrong values persisted');
        } else {
            console.log('✅ SUCCESS: Final bid persisted correctly');
        }
    });
});