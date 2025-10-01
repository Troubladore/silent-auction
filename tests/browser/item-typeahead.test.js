/**
 * Test Item ID Typeahead Functionality
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Item ID Typeahead Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should show item lookup dropdown when typing item ID', async ({ page }) => {
        console.log('Testing item typeahead functionality...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(2000);
        
        // Check that item-id field exists and is focused
        const itemInput = page.locator('#item-id');
        await expect(itemInput).toBeVisible();
        
        console.log('Item input found, testing typeahead...');
        
        // Type item ID
        await itemInput.fill('57');
        await page.waitForTimeout(1000);
        
        // Check if dropdown appears
        const dropdown = page.locator('#item-lookup');
        await expect(dropdown).toBeVisible();
        
        // Check if results appear
        const items = page.locator('.lookup-item:not(.no-results)');
        const count = await items.count();
        console.log(`Found ${count} item results`);
        
        if (count > 0) {
            const firstItem = items.first();
            const text = await firstItem.textContent();
            console.log('First item text:', text.trim());
            
            // Test clicking on first item
            await firstItem.click();
            await page.waitForTimeout(500);
            
            // Check if item was selected
            const selectedDisplay = page.locator('.selected-item');
            if (await selectedDisplay.count() > 0) {
                const selectedText = await selectedDisplay.textContent();
                console.log('Selected item display:', selectedText.trim());
            }
            
            // Check if focus moved to bidder field
            const bidderInput = page.locator('#bidder-id');
            const isFocused = await bidderInput.evaluate(el => el === document.activeElement);
            console.log('Bidder field focused after item selection:', isFocused);
        }
    });
    
    test('should support direct item ID entry without dropdown', async ({ page }) => {
        console.log('Testing direct item ID entry...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(2000);
        
        // Test tab behavior with direct numeric input
        const itemInput = page.locator('#item-id');
        await itemInput.fill('57');
        
        // Press tab to move to next field
        await page.keyboard.press('Tab');
        
        // Check if bidder field is now focused
        const bidderInput = page.locator('#bidder-id');
        const isFocused = await bidderInput.evaluate(el => el === document.activeElement);
        console.log('Bidder field focused after tab from item field:', isFocused);
        
        // Check if item ID was accepted
        const itemValue = await itemInput.inputValue();
        console.log('Item ID value after tab:', itemValue);
        expect(itemValue).toBe('57');
    });
    
    test('should show keypad workflow with full bid entry', async ({ page }) => {
        console.log('Testing complete keypad workflow...');
        
        await page.goto(`${baseUrl}/pages/bid_entry.php?auction_id=80`);
        await page.waitForTimeout(2000);
        
        // Simulate keypad entry: 57 > tab > 1 > tab > 100.00 > tab > 1 > enter
        await page.fill('#item-id', '57');
        await page.keyboard.press('Tab');
        
        await page.fill('#bidder-id', '1');
        await page.keyboard.press('Tab');
        
        await page.fill('#winning-price', '100.00');
        await page.keyboard.press('Tab');
        
        await page.fill('#quantity-won', '1');
        await page.keyboard.press('Enter');
        
        // Wait for save operation
        await page.waitForTimeout(3000);
        
        // Check for success message or form clear
        const itemInput = page.locator('#item-id');
        const itemValue = await itemInput.inputValue();
        console.log('Item field value after save (should be empty):', itemValue);
        
        // Check if success message appeared
        const successMessage = page.locator('#success-message');
        if (await successMessage.count() > 0) {
            const messageText = await successMessage.textContent();
            console.log('Success message:', messageText);
        }
    });
});