const { test, expect } = require('@playwright/test');

test.describe('Field Confirmation Display', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/login.php');
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/pages/index.php');

        // Navigate to bid entry page with auction 80
        await page.goto('http://localhost:8080/pages/bid_entry.php?auction_id=80');
        await page.waitForSelector('#bid-form');
    });

    test.describe('Bidder Field Confirmation', () => {
        test('should show bidder name after entering valid ID', async ({ page }) => {
            const bidderInput = page.locator('#bidder-id');
            const confirmation = page.locator('#bidder-lookup .field-confirmation');

            // Type bidder ID and tab
            await bidderInput.fill('1');
            await bidderInput.press('Tab');
            await page.waitForTimeout(500); // Wait for async validation

            // Confirmation should be visible with bidder name
            await expect(confirmation).toBeVisible();
            await expect(confirmation).toContainText('✓');
            await expect(confirmation).toContainText('John Smith');
        });

        test('should clear confirmation when field is emptied', async ({ page }) => {
            const bidderInput = page.locator('#bidder-id');
            const confirmation = page.locator('#bidder-lookup .field-confirmation');

            // Enter valid bidder
            await bidderInput.fill('1');
            await bidderInput.press('Tab');
            await page.waitForTimeout(500);
            await expect(confirmation).toBeVisible();

            // Go back and clear
            await page.keyboard.press('Shift+Tab');
            await bidderInput.clear();
            await bidderInput.press('Tab');

            // Confirmation should be gone
            await expect(confirmation).not.toBeVisible();
        });

        test('should not show confirmation for invalid bidder', async ({ page }) => {
            const bidderInput = page.locator('#bidder-id');
            const confirmation = page.locator('#bidder-lookup .field-confirmation');
            const errorMessage = page.locator('.field-error-message');

            // Type invalid bidder ID
            await bidderInput.fill('9999');
            await bidderInput.press('Tab');
            await page.waitForTimeout(500);

            // Should show error, not confirmation
            await expect(errorMessage).toBeVisible();
            await expect(confirmation).not.toBeVisible();
        });
    });

    test.describe('Item Field Selection', () => {
        test('should show item info after entering valid ID', async ({ page }) => {
            const itemInput = page.locator('#item-id');
            const confirmation = page.locator('#item-lookup .field-confirmation');

            // Type item ID and tab
            await itemInput.fill('57');
            await itemInput.press('Tab');
            await page.waitForTimeout(1000); // Wait for async validation and selectItem

            // Simple confirmation should show (like bidder field)
            await expect(confirmation).toBeVisible();
            await expect(confirmation).toContainText('✓');
            await expect(confirmation).toContainText('SOMETHIGN bEST');
        });

        test('should clear confirmation when field is emptied', async ({ page }) => {
            const itemInput = page.locator('#item-id');
            const confirmation = page.locator('#item-lookup .field-confirmation');

            // Enter valid item
            await itemInput.fill('57');
            await itemInput.press('Tab');
            await page.waitForTimeout(1000);
            await expect(confirmation).toBeVisible();

            // Go back and clear the field
            await page.keyboard.press('Shift+Tab');
            await itemInput.clear();
            await itemInput.press('Tab');
            await page.waitForTimeout(200);

            // Confirmation should be gone
            await expect(confirmation).not.toBeVisible();
        });

        test('should not show confirmation for invalid item', async ({ page }) => {
            const itemInput = page.locator('#item-id');
            const confirmation = page.locator('#item-lookup .field-confirmation');
            const errorMessage = page.locator('.field-error-message');

            // Type item ID not in this auction
            await itemInput.fill('999');
            await itemInput.press('Tab');
            await page.waitForTimeout(500);

            // Should show error, not confirmation
            await expect(errorMessage).toBeVisible();
            await expect(confirmation).not.toBeVisible();
        });
    });

    test.describe('Full Workflow', () => {
        test('should show confirmations for both item and bidder in complete bid entry', async ({ page }) => {
            const itemInput = page.locator('#item-id');
            const bidderInput = page.locator('#bidder-id');
            const itemConfirmation = page.locator('#item-lookup .field-confirmation');
            const bidderConfirmation = page.locator('#bidder-lookup .field-confirmation');

            // Enter item
            await itemInput.fill('57');
            await itemInput.press('Tab');
            await page.waitForTimeout(1000);
            await expect(itemConfirmation).toBeVisible();
            await expect(itemConfirmation).toContainText('✓');
            await expect(itemConfirmation).toContainText('SOMETHIGN bEST');

            // Enter bidder
            await bidderInput.fill('1');
            await bidderInput.press('Tab');
            await page.waitForTimeout(500);
            await expect(bidderConfirmation).toBeVisible();
            await expect(bidderConfirmation).toContainText('✓');
            await expect(bidderConfirmation).toContainText('John Smith');

            // Both confirmations should still be visible
            await expect(itemConfirmation).toBeVisible();
            await expect(bidderConfirmation).toBeVisible();
        });
    });
});
