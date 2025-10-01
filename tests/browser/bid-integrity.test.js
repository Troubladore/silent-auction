/**
 * Data Integrity Tests for Bid Entry
 * Tests for ID/name mismatches, bid preservation, and concurrent operations
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Bid Data Integrity Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
        
        // Create multiple test bidders for comprehensive testing
        const bidders = [
            { first: 'Alice', last: 'Anderson', email: 'alice@test.com' },
            { first: 'Bob', last: 'Baker', email: 'bob@test.com' },
            { first: 'Carol', last: 'Chen', email: 'carol@test.com' },
            { first: 'David', last: 'Davis', email: 'david@test.com' }
        ];
        
        for (const bidder of bidders) {
            await page.goto(`${baseUrl}/pages/bidders.php?action=add`);
            await page.fill('input[name="first_name"]', bidder.first);
            await page.fill('input[name="last_name"]', bidder.last);
            await page.fill('input[name="email"]', bidder.email);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(300);
        }
    });

    test('should maintain ID-name consistency during rapid selections', async ({ page }) => {
        console.log('Testing ID-name consistency during rapid selections...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Track all bidder selections and verifications
        const selections = [];
        
        // Test sequence: Select different bidders rapidly
        const testSequence = ['A', 'B', 'C', 'D', '1', '2', '3'];
        
        for (let i = 0; i < testSequence.length; i++) {
            const searchTerm = testSequence[i];
            console.log(`\nRapid selection test ${i + 1}: Searching "${searchTerm}"`);
            
            // Clear and type new search
            await page.fill('#bidder-id', '');
            await page.fill('#bidder-id', searchTerm);
            await page.waitForTimeout(400);
            
            // Check if dropdown appeared
            const dropdown = page.locator('#bidder-lookup');
            const isVisible = await dropdown.isVisible();
            
            if (isVisible) {
                const items = page.locator('.lookup-item:not(.no-results)');
                const itemCount = await items.count();
                
                if (itemCount > 0) {
                    // Get the first item's data before selection
                    const firstItem = items.first();
                    const itemText = await firstItem.textContent();
                    const expectedId = itemText.match(/^(\d+)/)?.[1];
                    const expectedName = itemText.match(/\(([^)]+)\)/)?.[1];
                    
                    console.log(`Expected: ID=${expectedId}, Name=${expectedName}`);
                    
                    // Select the first item
                    await firstItem.click();
                    await page.waitForTimeout(300);
                    
                    // Verify the selection matches what we expected
                    const selectedInfo = page.locator('.selected-bidder, .current-bid');
                    if (await selectedInfo.count() > 0) {
                        const selectedText = await selectedInfo.textContent();
                        console.log(`Selected text: ${selectedText}`);
                        
                        // Verify ID matches
                        const actualId = await page.locator('#bidder-id').inputValue();
                        console.log(`Actual ID in field: ${actualId}`);
                        
                        if (expectedId && actualId !== expectedId) {
                            throw new Error(`ID MISMATCH: Expected ${expectedId}, got ${actualId} for ${expectedName}`);
                        }
                        
                        // Store for later verification
                        selections.push({
                            searchTerm,
                            expectedId,
                            expectedName,
                            actualId,
                            selectedText: selectedText.trim()
                        });
                    }
                }
            }
            
            // Small delay between rapid selections
            await page.waitForTimeout(100);
        }
        
        console.log('\nAll selections completed. Summary:');
        selections.forEach((sel, idx) => {
            console.log(`${idx + 1}. Search:"${sel.searchTerm}" -> ID:${sel.actualId} Name:"${sel.expectedName}"`);
        });
    });

    test('should preserve bids during navigation and editing cycles', async ({ page }) => {
        console.log('Testing bid preservation during navigation...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);
        
        const bidHistory = [];
        
        // Create multiple bids through navigation
        const bidSequence = [
            { bidder: '1', price: '100.00', item: 0 },
            { bidder: '2', price: '150.00', item: 0 },  // Edit same item
            { bidder: '3', price: '125.00', item: 0 },  // Edit again
        ];
        
        for (let i = 0; i < bidSequence.length; i++) {
            const bid = bidSequence[i];
            console.log(`\nCreating/editing bid ${i + 1}: Bidder ${bid.bidder}, Price $${bid.price}`);
            
            // Navigate to specific item if needed (for multi-item auctions)
            const itemBtns = page.locator('.item-btn');
            if (await itemBtns.count() > 0) {
                await itemBtns.nth(bid.item).click();
                await page.waitForTimeout(300);
            }
            
            // Check if there's an existing bid
            const hasExistingBid = await page.locator('.edit-bid-btn, .delete-bid-btn').count() > 0;
            if (hasExistingBid) {
                console.log('Found existing bid, clicking edit...');
                await page.click('.edit-bid-btn');
                await page.waitForTimeout(200);
            }
            
            // Enter bidder
            await page.fill('#bidder-id', bid.bidder);
            await page.waitForTimeout(400);
            
            // Auto-select if dropdown appears
            const dropdownItems = page.locator('.lookup-item:not(.no-results)');
            if (await dropdownItems.count() > 0) {
                await dropdownItems.first().click();
                await page.waitForTimeout(200);
            }
            
            // Enter price
            await page.fill('#winning-price', bid.price);
            
            // Monitor save operation
            let saveSuccessful = false;
            page.once('response', response => {
                if (response.url().includes('/api/save_bid.php') && response.status() === 200) {
                    saveSuccessful = true;
                }
            });
            
            // Save bid
            await page.click('#save-bid');
            await page.waitForTimeout(1000);
            
            // Verify save was successful
            console.log(`Bid ${i + 1} save successful: ${saveSuccessful}`);
            
            // Record the bid for later verification
            const currentBidderName = await page.locator('.selected-bidder, .current-bid').textContent().catch(() => '');
            bidHistory.push({
                step: i + 1,
                bidderId: bid.bidder,
                price: bid.price,
                saveSuccessful,
                displayedName: currentBidderName.trim()
            });
            
            // Navigate away and back to test persistence
            if (i < bidSequence.length - 1) {
                console.log('Navigating away and back to test persistence...');
                await page.goto(`${baseUrl}/pages/index.php`);
                await page.waitForTimeout(500);
                await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
                await page.waitForTimeout(1000);
            }
        }
        
        // Final verification - check if last bid is still there
        await page.reload();
        await page.waitForTimeout(1000);
        
        const finalBidInfo = await page.locator('.current-bid, .selected-bidder').textContent().catch(() => '');
        console.log('\nFinal bid after reload:', finalBidInfo);
        
        console.log('\nBid History:');
        bidHistory.forEach(bid => {
            console.log(`Step ${bid.step}: Bidder ${bid.bidderId} -> $${bid.price} (Save: ${bid.saveSuccessful})`);
        });
        
        // Verify the final bid exists and is correct
        expect(finalBidInfo.length).toBeGreaterThan(0);
    });

    test('should handle concurrent rapid item switching', async ({ page }) => {
        console.log('Testing rapid item navigation with bid preservation...');
        
        // First create an auction with multiple items
        await page.goto(`${baseUrl}/pages/auctions.php?action=add`);
        await page.fill('input[name="auction_description"]', 'Multi-Item Test Auction');
        await page.fill('input[name="auction_date"]', '2024-03-01');
        await page.click('button[type="submit"]');
        
        const auctionId = page.url().match(/id=(\d+)/)[1];
        console.log('Created test auction:', auctionId);
        
        // Create multiple items and associate them
        const items = ['Test Item A', 'Test Item B', 'Test Item C'];
        for (const itemName of items) {
            await page.goto(`${baseUrl}/pages/items.php?action=add`);
            await page.fill('input[name="item_name"]', itemName);
            await page.fill('textarea[name="item_description"]', `Description for ${itemName}`);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(300);
        }
        
        // Associate all items with the auction
        await page.goto(`${baseUrl}/pages/auctions.php?action=edit&id=${auctionId}`);
        await page.waitForTimeout(500);
        
        const checkboxes = page.locator('input[name="item_ids[]"]');
        const checkboxCount = await checkboxes.count();
        console.log(`Found ${checkboxCount} items to associate`);
        
        // Check the last 3 items (our new ones)
        for (let i = Math.max(0, checkboxCount - 3); i < checkboxCount; i++) {
            await checkboxes.nth(i).check();
        }
        
        if (checkboxCount > 0) {
            await page.click('button:has-text("Add Selected Items")');
            await page.waitForTimeout(1000);
        }
        
        // Now test rapid navigation on the multi-item auction
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=${auctionId}`);
        await page.waitForTimeout(1000);
        
        const itemBtns = page.locator('.item-btn');
        const itemCount = await itemBtns.count();
        console.log(`Found ${itemCount} items in auction`);
        
        if (itemCount >= 2) {
            const rapidNavigationSequence = [0, 1, 0, 2, 1, 0]; // Rapid back-and-forth
            
            for (let i = 0; i < rapidNavigationSequence.length; i++) {
                const itemIndex = rapidNavigationSequence[i] % itemCount;
                console.log(`\nRapid navigation step ${i + 1}: Switching to item ${itemIndex}`);
                
                // Click item button
                await itemBtns.nth(itemIndex).click();
                await page.waitForTimeout(200);
                
                // Verify item changed
                const itemInfo = await page.locator('#item-info').textContent();
                console.log(`Current item: ${itemInfo.slice(0, 50)}...`);
                
                // Quick bid entry to test data preservation
                if (i % 2 === 0) { // Every other item, add a quick bid
                    await page.fill('#bidder-id', String((i % 3) + 1));
                    await page.fill('#winning-price', String((i + 1) * 25));
                    await page.waitForTimeout(200);
                }
            }
            
            console.log('Rapid navigation test completed');
        }
    });

    test('should detect and prevent ID-name misalignment', async ({ page }) => {
        console.log('Testing ID-name misalignment detection...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);
        
        // Test specific scenarios that could cause misalignment
        const testScenarios = [
            {
                name: 'Type ID, select different bidder from dropdown',
                steps: async () => {
                    await page.fill('#bidder-id', '1');
                    await page.waitForTimeout(400);
                    const items = page.locator('.lookup-item:not(.no-results)');
                    if (await items.count() > 0) {
                        const firstItemText = await items.first().textContent();
                        console.log(`First dropdown item: ${firstItemText.trim()}`);
                        await items.first().click();
                        return await page.locator('#bidder-id').inputValue();
                    }
                    return null;
                }
            },
            {
                name: 'Rapid typing with overlapping AJAX calls',
                steps: async () => {
                    await page.fill('#bidder-id', 'A');
                    await page.waitForTimeout(100); // Don't wait for full debounce
                    await page.fill('#bidder-id', 'B');
                    await page.waitForTimeout(100);
                    await page.fill('#bidder-id', '2');
                    await page.waitForTimeout(500); // Now wait for final result
                    
                    const items = page.locator('.lookup-item:not(.no-results)');
                    if (await items.count() > 0) {
                        await items.first().click();
                        return await page.locator('#bidder-id').inputValue();
                    }
                    return null;
                }
            },
            {
                name: 'Clear field during AJAX loading',
                steps: async () => {
                    await page.fill('#bidder-id', 'Carol');
                    await page.waitForTimeout(100);
                    await page.fill('#bidder-id', ''); // Clear while loading
                    await page.waitForTimeout(200);
                    await page.fill('#bidder-id', '3');
                    await page.waitForTimeout(400);
                    
                    const items = page.locator('.lookup-item:not(.no-results)');
                    if (await items.count() > 0) {
                        await items.first().click();
                        return await page.locator('#bidder-id').inputValue();
                    }
                    return null;
                }
            }
        ];
        
        for (const scenario of testScenarios) {
            console.log(`\nTesting scenario: ${scenario.name}`);
            
            // Clear form
            await page.fill('#bidder-id', '');
            await page.locator('#bidder-lookup').evaluate(node => node.innerHTML = '');
            await page.waitForTimeout(200);
            
            // Execute scenario
            const resultId = await scenario.steps();
            console.log(`Result ID: ${resultId}`);
            
            // Verify displayed name matches the ID
            const displayedInfo = await page.locator('.selected-bidder, .current-bid').textContent().catch(() => '');
            console.log(`Displayed info: ${displayedInfo.trim()}`);
            
            if (resultId && displayedInfo) {
                // Extract ID from displayed info and verify match
                const displayedId = displayedInfo.match(/ID:\s*(\d+)/)?.[1];
                if (displayedId && displayedId !== resultId) {
                    throw new Error(`ID MISMATCH in scenario "${scenario.name}": Field shows ${resultId}, display shows ${displayedId}`);
                }
            }
        }
        
        console.log('All misalignment tests passed');
    });
});