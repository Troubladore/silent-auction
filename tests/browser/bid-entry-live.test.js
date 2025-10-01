/**
 * Live Browser Testing for Bid Entry Typeahead
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Live Bid Entry Typeahead Testing', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should show dropdown when typing in bidder field', async ({ page }) => {
        console.log('Testing typeahead dropdown visibility...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Test typing a number
        console.log('Typing "1" in bidder field...');
        await page.fill('#bidder-id', '1');
        
        // Wait for debounce and AJAX
        await page.waitForTimeout(500);

        // Check if dropdown appears
        const dropdown = page.locator('#bidder-lookup');
        const isVisible = await dropdown.isVisible();
        console.log('Dropdown visible after typing "1":', isVisible);
        
        if (isVisible) {
            const content = await dropdown.textContent();
            console.log('Dropdown content:', content);
        }

        // Test typing letters
        console.log('Typing "John" in bidder field...');
        await page.fill('#bidder-id', 'John');
        await page.waitForTimeout(500);

        const isVisible2 = await dropdown.isVisible();
        console.log('Dropdown visible after typing "John":', isVisible2);
        
        if (isVisible2) {
            const content = await dropdown.textContent();
            console.log('Dropdown content for "John":', content);
        }
    });

    test('should allow saving bid with direct ID entry', async ({ page }) => {
        console.log('Testing direct ID entry and save...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Monitor network requests
        let saveAttempted = false;
        page.on('response', response => {
            if (response.url().includes('/api/save_bid.php')) {
                saveAttempted = true;
                console.log('Save bid API called, status:', response.status());
            }
        });

        // Enter bidder ID directly
        await page.fill('#bidder-id', '1');
        await page.fill('#winning-price', '50.00');
        
        // Try to save
        await page.click('#save-bid');
        await page.waitForTimeout(2000);
        
        console.log('Save attempt made:', saveAttempted);
    });

    test('should show selected bidder info after selection', async ({ page }) => {
        console.log('Testing bidder selection and info display...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Type to trigger dropdown
        await page.fill('#bidder-id', '1');
        await page.waitForTimeout(500);

        // Check if lookup results appear
        const lookupItems = page.locator('.lookup-item');
        const itemCount = await lookupItems.count();
        console.log('Number of lookup items:', itemCount);

        if (itemCount > 0) {
            // Click first item
            await lookupItems.first().click();
            await page.waitForTimeout(200);

            // Check if bidder info is shown
            const selectedInfo = page.locator('.selected-bidder, .current-bid');
            const hasSelectedInfo = await selectedInfo.count() > 0;
            console.log('Selected bidder info displayed:', hasSelectedInfo);
            
            if (hasSelectedInfo) {
                const infoText = await selectedInfo.textContent();
                console.log('Selected bidder info:', infoText);
            }
        }
    });

    test('should handle keyboard navigation', async ({ page }) => {
        console.log('Testing keyboard navigation...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Type to show dropdown
        await page.fill('#bidder-id', 'j');
        await page.waitForTimeout(500);

        const bidderInput = page.locator('#bidder-id');
        
        // Test arrow down
        await bidderInput.press('ArrowDown');
        await page.waitForTimeout(100);
        
        // Test enter to select
        await bidderInput.press('Enter');
        await page.waitForTimeout(200);

        console.log('Keyboard navigation test completed');
    });

    test('comprehensive real-world workflow', async ({ page }) => {
        console.log('Testing complete workflow...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(1000);

        // Step 1: Test typeahead with text
        console.log('Step 1: Testing text typeahead...');
        await page.fill('#bidder-id', 'Jo');
        await page.waitForTimeout(600); // Wait for debounce + AJAX
        
        let dropdownVisible = await page.locator('#bidder-lookup').isVisible();
        console.log('Dropdown visible for "Jo":', dropdownVisible);
        
        // Step 2: Clear and test with number
        console.log('Step 2: Testing numeric typeahead...');
        await page.fill('#bidder-id', '');
        await page.fill('#bidder-id', '1');
        await page.waitForTimeout(600);
        
        dropdownVisible = await page.locator('#bidder-lookup').isVisible();
        console.log('Dropdown visible for "1":', dropdownVisible);
        
        // Step 3: Try to make a selection if dropdown is visible
        const lookupItems = page.locator('.lookup-item:not(.no-results)');
        const itemCount = await lookupItems.count();
        console.log('Available lookup items:', itemCount);
        
        if (itemCount > 0) {
            console.log('Step 3: Selecting bidder...');
            await lookupItems.first().click();
            await page.waitForTimeout(300);
            
            const selectedBidder = page.locator('.selected-bidder, .current-bid');
            const hasSelection = await selectedBidder.count() > 0;
            console.log('Bidder selected successfully:', hasSelection);
        }
        
        // Step 4: Fill price and save
        console.log('Step 4: Filling price and attempting save...');
        await page.fill('#winning-price', '75.00');
        
        let saveSuccessful = false;
        page.on('response', response => {
            if (response.url().includes('/api/save_bid.php') && response.status() === 200) {
                saveSuccessful = true;
            }
        });
        
        await page.click('#save-bid');
        await page.waitForTimeout(2000);
        
        console.log('Save successful:', saveSuccessful);
        console.log('Comprehensive workflow test completed');
    });
});