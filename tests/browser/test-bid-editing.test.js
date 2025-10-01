const { test, expect } = require('@playwright/test');

test.describe('Bid Editing and Deletion', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/login.php');
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/pages/index.php');

        // Navigate to bid entry page with auction 80
        await page.goto('http://localhost:8080/pages/bid_entry.php?auction_id=80');
        await page.waitForSelector('#bid-form');

        // Create a test bid on item 13 for testing edit/delete
        page.on('dialog', dialog => dialog.accept()); // Auto-accept alerts
        await page.fill('#item-id', '13');
        await page.press('#item-id', 'Tab');
        await page.waitForTimeout(1000);
        await page.fill('#bidder-id', '1');
        await page.press('#bidder-id', 'Tab');
        await page.waitForTimeout(500);
        await page.fill('#winning-price', '50.00');
        await page.fill('#quantity-won', '1');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
    });

    test('should auto-populate form when selecting item with existing bid', async ({ page }) => {
        // Item 13 now has bid from beforeEach
        await page.fill('#item-id', '13');
        await page.press('#item-id', 'Tab');
        await page.waitForTimeout(1500); // Wait for selectItem to complete

        // Check that form is auto-populated with the bid we created
        const bidderValue = await page.locator('#bidder-id').inputValue();
        const priceValue = await page.locator('#winning-price').inputValue();
        const quantityValue = await page.locator('#quantity-won').inputValue();

        expect(bidderValue).toBe('1');
        expect(priceValue).toBe('50.00');
        expect(quantityValue).toBe('1');

        // Button should show UPDATE BID
        const saveButton = page.locator('button[type="submit"]');
        await expect(saveButton).toContainText('UPDATE BID');

        // Should show editing confirmation message
        const editMessage = page.locator('.confirmation-text');
        await expect(editMessage).toBeVisible();
        await expect(editMessage).toContainText('editing existing bid');

        // Should show delete button (now with id instead of class)
        const deleteButton = page.locator('#delete-bid-btn');
        await expect(deleteButton).toBeVisible();
    });

    test('should update existing bid when changes are saved', async ({ page }) => {
        // Select item with existing bid
        await page.fill('#item-id', '13');
        await page.press('#item-id', 'Tab');
        await page.waitForTimeout(1500);

        // Verify form is populated with our test bid (50.00)
        const originalPrice = await page.locator('#winning-price').inputValue();
        expect(originalPrice).toBe('50.00');

        // Change the price
        await page.fill('#winning-price', '99.99');

        // Click UPDATE BID (alert auto-accepted by beforeEach)
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000); // Wait for update API call and form reset

        // Form should be cleared and button reset
        const saveButton = page.locator('button[type="submit"]');
        await expect(saveButton).toContainText('SAVE BID');

        // Item field should be cleared
        const itemValue = await page.locator('#item-id').inputValue();
        expect(itemValue).toBe('');

        // Verify price was updated by selecting item again
        await page.fill('#item-id', '13');
        await page.press('#item-id', 'Tab');
        await page.waitForTimeout(1500);

        const newPrice = await page.locator('#winning-price').inputValue();
        expect(newPrice).toBe('99.99');
    });

    test('should delete bid when delete button is clicked', async ({ page }) => {
        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            if (msg.text().includes('Error') || msg.text().includes('delet')) {
                logs.push(`[${msg.type()}] ${msg.text()}`);
            }
        });

        // Select item with existing bid
        await page.fill('#item-id', '13');
        await page.press('#item-id', 'Tab');
        await page.waitForTimeout(1500);

        // Verify delete button is visible (now with id instead of class)
        const deleteButton = page.locator('#delete-bid-btn');
        await expect(deleteButton).toBeVisible();

        // Click delete (alert auto-accepted by beforeEach)
        await deleteButton.click();
        await page.waitForTimeout(3000); // Wait longer for delete API call and form reset

        // Log captured messages
        if (logs.length > 0) {
            console.log('Delete operation logs:', logs);
        }

        // After deletion, form should be cleared and button reset
        const saveButton = page.locator('button[type="submit"]');
        const buttonText = await saveButton.textContent();
        console.log('Button text after delete:', buttonText);

        await expect(saveButton).toContainText('SAVE BID');

        // Item field should be cleared
        const itemValue = await page.locator('#item-id').inputValue();
        expect(itemValue).toBe('');

        // Form should be empty
        const bidderValue = await page.locator('#bidder-id').inputValue();
        expect(bidderValue).toBe('');
    });

    test('should cancel editing when Escape is pressed', async ({ page }) => {
        // Select item with existing bid
        await page.fill('#item-id', '13');
        await page.press('#item-id', 'Tab');
        await page.waitForTimeout(1500);

        // Verify we're in editing mode
        const saveButton = page.locator('button[type="submit"]');
        await expect(saveButton).toContainText('UPDATE BID');

        // Press Escape to clear the form
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Should exit editing mode
        await expect(saveButton).toContainText('SAVE BID');

        // Item field should be cleared
        const itemValue = await page.locator('#item-id').inputValue();
        expect(itemValue).toBe('');

        // Form should be cleared
        const bidderValue = await page.locator('#bidder-id').inputValue();
        expect(bidderValue).toBe('');
    });
});
