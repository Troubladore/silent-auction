const { test, expect } = require('@playwright/test');

test.describe('Price and Quantity Validation', () => {
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

    test.describe('Price Field Validation', () => {
        test('should allow valid decimal price', async ({ page }) => {
            const priceInput = page.locator('#winning-price');
            const quantityInput = page.locator('#quantity-won');

            await priceInput.click();
            await priceInput.fill('25.50');
            await priceInput.press('Tab');
            await page.waitForTimeout(200);

            // Should move to quantity
            await expect(quantityInput).toBeFocused();

            // No error should be visible
            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).not.toBeVisible();
        });

        test('should allow valid integer price', async ({ page }) => {
            const priceInput = page.locator('#winning-price');
            const quantityInput = page.locator('#quantity-won');

            await priceInput.click();
            await priceInput.fill('100');
            await priceInput.press('Tab');
            await page.waitForTimeout(200);

            // Should move to quantity
            await expect(quantityInput).toBeFocused();
        });

        test('should allow empty price field', async ({ page }) => {
            const priceInput = page.locator('#winning-price');
            const quantityInput = page.locator('#quantity-won');

            await priceInput.click();
            await priceInput.press('Tab');
            await page.waitForTimeout(200);

            // Should allow tab to quantity
            await expect(quantityInput).toBeFocused();
        });

        test('HTML5 validation prevents invalid input automatically', async ({ page }) => {
            const priceInput = page.locator('#winning-price');

            // HTML5 number input with min="0" prevents negative values
            await priceInput.click();

            // Browser automatically filters non-numeric input
            // This test verifies the input type is set correctly
            const inputType = await priceInput.getAttribute('type');
            expect(inputType).toBe('number');

            const minValue = await priceInput.getAttribute('min');
            expect(minValue).toBe('0');

            const step = await priceInput.getAttribute('step');
            expect(step).toBe('0.01');
        });

        test('should prevent tab with invalid price characters', async ({ page }) => {
            const priceInput = page.locator('#winning-price');
            const quantityInput = page.locator('#quantity-won');

            await priceInput.click();
            // Type 'a' - HTML5 number input may or may not accept it
            // Our JS validation should catch it on blur/tab
            await page.keyboard.type('a');
            await page.waitForTimeout(100);

            // Try to tab away
            await page.keyboard.press('Tab');
            await page.waitForTimeout(200);

            // If 'a' got into the field, validation should prevent tab
            const priceValue = await priceInput.inputValue();
            if (priceValue === 'a' || priceValue.includes('a')) {
                // Should show error and stay on price field
                const errorMessage = page.locator('.field-error-message');
                await expect(errorMessage).toBeVisible();
                await expect(errorMessage).toContainText('valid dollar amount');
                await expect(priceInput).toBeFocused();
            } else {
                // Browser prevented 'a', field should be empty and tab allowed
                await expect(quantityInput).toBeFocused();
            }
        });
    });

    test.describe('Quantity Field Validation', () => {
        test('should prevent tab with non-integer quantity', async ({ page }) => {
            const quantityInput = page.locator('#quantity-won');

            await quantityInput.click();
            await quantityInput.fill('2.5');
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            // Should show error
            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).toBeVisible();
            await expect(errorMessage).toContainText('whole number');

            // Focus should stay on quantity input
            await expect(quantityInput).toBeFocused();
        });

        test('should prevent tab with zero quantity', async ({ page }) => {
            const quantityInput = page.locator('#quantity-won');

            await quantityInput.click();
            await quantityInput.fill('0');
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).toBeVisible();
            await expect(errorMessage).toContainText('at least 1');
        });

        test('should prevent tab with negative quantity', async ({ page }) => {
            const quantityInput = page.locator('#quantity-won');

            await quantityInput.click();
            await quantityInput.fill('-5');
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).toBeVisible();
        });

        test('should default empty quantity to 1', async ({ page }) => {
            const quantityInput = page.locator('#quantity-won');

            // Clear the field
            await quantityInput.click();
            await quantityInput.fill('');
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            // Should default to 1
            await expect(quantityInput).toHaveValue('1');
        });

        test('should allow valid integer quantity', async ({ page }) => {
            const quantityInput = page.locator('#quantity-won');

            await quantityInput.click();
            await quantityInput.fill('3');
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            // No error
            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).not.toBeVisible();
        });
    });

    test.describe('Inventory Validation', () => {
        test('should prevent quantity exceeding available inventory', async ({ page }) => {
            const itemInput = page.locator('#item-id');
            const quantityInput = page.locator('#quantity-won');
            const dropdown = page.locator('#item-lookup');

            // Select item with known quantity (item 16 has quantity 2)
            await itemInput.click();
            await itemInput.fill('16');
            await page.waitForTimeout(500);

            // Select from dropdown to get quantity info
            await expect(dropdown).toBeVisible();
            const firstItem = dropdown.locator('.lookup-item').first();
            await firstItem.click();
            await page.waitForTimeout(200);

            // Try to enter quantity higher than available
            await quantityInput.click();
            await quantityInput.fill('99');
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            // Should show inventory error
            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).toBeVisible();
            await expect(errorMessage).toContainText('available in inventory');
        });

        test('should allow quantity within inventory limits', async ({ page }) => {
            const itemInput = page.locator('#item-id');
            const quantityInput = page.locator('#quantity-won');
            const dropdown = page.locator('#item-lookup');

            // Select item 16 (has quantity 2)
            await itemInput.click();
            await itemInput.fill('16');
            await page.waitForTimeout(500);

            await expect(dropdown).toBeVisible();
            const firstItem = dropdown.locator('.lookup-item').first();
            await firstItem.click();
            await page.waitForTimeout(200);

            // Enter valid quantity
            await quantityInput.click();
            await quantityInput.fill('2');
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            // No error
            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).not.toBeVisible();
        });
    });

    test.describe('Error Message Behavior', () => {
        test('quantity error should dismiss when typing', async ({ page }) => {
            const quantityInput = page.locator('#quantity-won');

            await quantityInput.click();
            await quantityInput.clear();
            await quantityInput.type('0'); // Invalid: zero
            await quantityInput.press('Tab');
            await page.waitForTimeout(200);

            const errorMessage = page.locator('.field-error-message');
            await expect(errorMessage).toBeVisible();

            // Start typing valid value
            await quantityInput.clear();
            await quantityInput.type('1');
            await page.waitForTimeout(100);

            // Error should be gone
            await expect(errorMessage).not.toBeVisible();
        });
    });
});
