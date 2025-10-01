const { test, expect } = require('@playwright/test');

test.describe('Bidder Field Validation', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/login.php');
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/pages/index.php');

        // Navigate to bid entry for auction 80
        await page.goto('http://localhost:8080/pages/bid_entry.php?auction_id=80');
        await page.waitForSelector('#bid-form');
    });

    test('should prevent tab out with invalid non-numeric bidder value', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Type invalid non-numeric value
        await bidderInput.fill('h');

        // Try to tab to next field
        await bidderInput.press('Tab');

        // Should still be focused on bidder field
        await expect(bidderInput).toBeFocused();

        // Should NOT be on price field
        await expect(priceInput).not.toBeFocused();

        // Should show error message
        await expect(page.locator('.field-error-message')).toBeVisible();
        await expect(page.locator('.field-error-message')).toContainText('Invalid bidder entry');
    });

    test('should highlight invalid value for easy replacement', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');

        // Type invalid value
        await bidderInput.fill('xyz');
        await bidderInput.press('Tab');

        // Value should be selected (highlighted)
        const isSelected = await bidderInput.evaluate(el => {
            return el.selectionStart === 0 && el.selectionEnd === el.value.length;
        });
        expect(isSelected).toBe(true);
    });

    test('should allow tab out with valid numeric bidder ID', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Type valid numeric bidder ID
        await bidderInput.fill('1');
        await bidderInput.press('Tab');

        // Should move to price field
        await expect(priceInput).toBeFocused();

        // Should NOT show error
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should hide dropdown when tabbing out with valid selection', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const dropdown = page.locator('#bidder-lookup');
        const dropdownItems = page.locator('#bidder-lookup .lookup-item');

        // Type to show dropdown
        await bidderInput.fill('1');
        await page.waitForTimeout(400); // Wait for debounce

        // Dropdown should be visible with items
        await expect(dropdown).toBeVisible();
        await expect(dropdownItems.first()).toBeVisible();

        // Tab to next field
        await bidderInput.press('Tab');
        await page.waitForTimeout(500); // Wait for async validation

        // Dropdown items should be hidden, confirmation should show
        await expect(dropdownItems.first()).not.toBeVisible();
        const confirmation = page.locator('#bidder-lookup .field-confirmation');
        await expect(confirmation).toBeVisible();
    });

    test('should allow empty bidder field (optional)', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Leave bidder field empty and tab
        await bidderInput.fill('');
        await bidderInput.press('Tab');

        // Should allow tab to next field (empty is valid)
        await expect(priceInput).toBeFocused();

        // Should NOT show error
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should accept bidder selection from dropdown', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Type to show dropdown
        await bidderInput.fill('1');
        await page.waitForTimeout(400);

        // Click on dropdown item
        await page.click('#bidder-lookup .lookup-item:first-child');

        // Tab to next field should work
        await bidderInput.press('Tab');
        await expect(priceInput).toBeFocused();
    });

    test('should show error on Enter key with invalid value', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');

        // Type invalid value
        await bidderInput.fill('abc');
        await bidderInput.press('Enter');

        // Should stay on bidder field
        await expect(bidderInput).toBeFocused();

        // Should show error
        await expect(page.locator('.field-error-message')).toBeVisible();
    });

    test('should auto-dismiss error message after 5 seconds', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');

        // Trigger error
        await bidderInput.fill('invalid');
        await bidderInput.press('Tab');

        // Error should be visible initially
        await expect(page.locator('.field-error-message')).toBeVisible();

        // Wait for auto-dismiss (5s + 300ms fade)
        await page.waitForTimeout(5400);

        // Error should be gone
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should replace old error with new error on subsequent invalid attempts', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');

        // First invalid attempt
        await bidderInput.fill('abc');
        await bidderInput.press('Tab');
        await expect(page.locator('.field-error-message')).toHaveCount(1);

        // Second invalid attempt
        await bidderInput.fill('xyz');
        await bidderInput.press('Tab');

        // Should still only have one error message (replaced, not added)
        await expect(page.locator('.field-error-message')).toHaveCount(1);
    });

    test('should handle multiple digit bidder IDs correctly', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Type multi-digit ID
        await bidderInput.fill('123');
        await bidderInput.press('Tab');

        // Should accept and move to next field
        await expect(priceInput).toBeFocused();
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should not interfere with Shift+Tab (backward navigation)', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const bidderInput = page.locator('#bidder-id');

        // Focus bidder field
        await bidderInput.click();

        // Try Shift+Tab with valid value
        await bidderInput.fill('1');
        await bidderInput.press('Shift+Tab');

        // Should move back to item field
        await expect(itemInput).toBeFocused();
    });

    test('should display error message next to field label, not below input', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const label = page.locator('label[for="bidder-id"]');

        // Trigger error
        await bidderInput.fill('invalid');
        await bidderInput.press('Tab');

        // Error should be visible
        const error = page.locator('.field-error-message');
        await expect(error).toBeVisible();

        // Error should be positioned after the label (as a sibling)
        const errorIsAfterLabel = await page.evaluate(() => {
            const label = document.querySelector('label[for="bidder-id"]');
            const error = document.querySelector('.field-error-message');
            return label && error && label.nextSibling === error;
        });
        expect(errorIsAfterLabel).toBe(true);
    });

    test('should dismiss error message when user starts typing', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');

        // Trigger error
        await bidderInput.fill('abc');
        await bidderInput.press('Tab');

        // Error should be visible
        await expect(page.locator('.field-error-message')).toBeVisible();

        // Start typing - error should disappear
        await bidderInput.type('1');

        // Error should be gone immediately
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should validate on every tab attempt, even after previous valid entry', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // First: enter valid bidder ID
        await bidderInput.fill('1');
        await bidderInput.press('Tab');
        await page.waitForTimeout(500); // Wait for async validation

        // Should move to price field
        await expect(priceInput).toBeFocused();

        // Go back to bidder field
        await priceInput.press('Shift+Tab');
        await expect(bidderInput).toBeFocused();

        // Change to invalid value
        await bidderInput.fill('xyz');
        await bidderInput.press('Tab');

        // Should NOT allow tab out - should stay on bidder field
        await expect(bidderInput).toBeFocused();

        // Should show error
        await expect(page.locator('.field-error-message')).toBeVisible();
        await expect(page.locator('.field-error-message')).toContainText('Invalid bidder entry');

        // Should NOT be on price field
        await expect(priceInput).not.toBeFocused();
    });

    test('should prevent click-away with invalid bidder value (blur validation)', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Enter invalid value
        await bidderInput.fill('invalid');

        // Click away to price field (triggers blur)
        await priceInput.click();

        // Wait for blur validation
        await page.waitForTimeout(300);

        // Should refocus bidder field (not allow click away)
        await expect(bidderInput).toBeFocused();

        // Should show error
        await expect(page.locator('.field-error-message')).toBeVisible();
        await expect(page.locator('.field-error-message')).toContainText('Invalid bidder entry');
    });

    test('should allow click-away with valid bidder value', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Enter valid value
        await bidderInput.fill('1');

        // Click away to price field
        await priceInput.click();

        // Wait for blur validation
        await page.waitForTimeout(300);

        // Should remain on price field (click away allowed)
        await expect(priceInput).toBeFocused();

        // Should NOT show error
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should allow click-away with empty bidder value (optional field)', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const priceInput = page.locator('#winning-price');

        // Leave empty
        await bidderInput.fill('');

        // Click away to price field
        await priceInput.click();

        // Wait for blur validation
        await page.waitForTimeout(300);

        // Should remain on price field (empty allowed)
        await expect(priceInput).toBeFocused();

        // Should NOT show error
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should show bidder typeahead dropdown when typing', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const dropdown = page.locator('#bidder-lookup');

        // Initially hidden
        await expect(dropdown).not.toBeVisible();

        // Type to trigger lookup
        await bidderInput.fill('1');

        // Wait for debounce + API response
        await page.waitForTimeout(500);

        // Dropdown should be visible with results
        await expect(dropdown).toBeVisible();

        // Should have lookup items
        const items = dropdown.locator('.lookup-item');
        await expect(items.first()).toBeVisible();
    });
});

test.describe('Item Field Validation (auction-specific)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080/login.php');
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/pages/index.php');
        await page.goto('http://localhost:8080/pages/bid_entry.php?auction_id=80');
        await page.waitForSelector('#bid-form');
    });

    test('should show item typeahead dropdown when typing', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        // Initially hidden
        await expect(dropdown).not.toBeVisible();

        // Debug: Test API directly first
        const apiResponse = await page.evaluate(async () => {
            const response = await fetch('../api/lookup.php?type=item&term=57&auction_id=80', {
                credentials: 'same-origin'
            });
            const data = await response.json();
            return {status: response.status, data};
        });
        console.log('Direct API call:', JSON.stringify(apiResponse));

        // Focus the field first to avoid blur issues
        await itemInput.click();

        // Type full ID to trigger lookup (57 is definitely in auction 80)
        await itemInput.pressSequentially('57');

        // Wait for: input debounce (300ms) + API call + blur delay (200ms)
        await page.waitForTimeout(1000);

        // Debug: Check dropdown content
        const dropdownHTML = await dropdown.innerHTML();
        const dropdownDisplay = await dropdown.evaluate(el => window.getComputedStyle(el).display);
        console.log('Dropdown display:', dropdownDisplay);
        console.log('Dropdown HTML:', dropdownHTML);

        // Dropdown should be visible with results
        await expect(dropdown).toBeVisible();

        // Should have lookup items
        const items = dropdown.locator('.lookup-item');
        await expect(items.first()).toBeVisible();
    });

    test('should allow valid auction item IDs', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const bidderInput = page.locator('#bidder-id');

        // Item 57 is in auction 80
        await itemInput.fill('57');
        await itemInput.press('Tab');

        // Should move to bidder field
        await expect(bidderInput).toBeFocused();

        // Should NOT show error
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should reject item IDs NOT in this auction', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const bidderInput = page.locator('#bidder-id');

        // Item 3 exists in database but is NOT in auction 80
        await itemInput.fill('3');
        await itemInput.press('Tab');

        // Should stay on item field
        await expect(itemInput).toBeFocused();

        // Should NOT move to bidder field
        await expect(bidderInput).not.toBeFocused();

        // Should show error message
        await expect(page.locator('.field-error-message')).toBeVisible();
        await expect(page.locator('.field-error-message')).toContainText('not part of this auction');
    });

    test('should highlight invalid item ID for replacement', async ({ page }) => {
        const itemInput = page.locator('#item-id');

        // Type invalid item (not in auction 80)
        await itemInput.fill('3');
        await itemInput.press('Tab');

        // Wait for async validation to complete
        await page.waitForTimeout(500);

        // Value should be selected
        const isSelected = await itemInput.evaluate(el => {
            return el.selectionStart === 0 && el.selectionEnd === el.value.length;
        });
        expect(isSelected).toBe(true);
    });

    test('should hide item dropdown after successful tab', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdownItems = page.locator('#item-lookup .lookup-item');
        const confirmation = page.locator('#item-lookup .field-confirmation');

        // Type to show dropdown (57 is valid)
        await itemInput.fill('57');
        await page.waitForTimeout(400);

        // Tab to next field
        await itemInput.press('Tab');

        // Wait for validation and selectItem to complete
        await page.waitForTimeout(1000);

        // Dropdown items should be hidden, simple confirmation should show
        await expect(dropdownItems.first()).not.toBeVisible();
        await expect(confirmation).toBeVisible();
        await expect(confirmation).toContainText('✓');
        await expect(confirmation).toContainText('SOMETHIGN bEST');
    });

    test('should prevent entering non-numeric item values', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const bidderInput = page.locator('#bidder-id');

        // Type non-numeric
        await itemInput.fill('abc');
        await itemInput.press('Tab');

        // Should stay on item field
        await expect(itemInput).toBeFocused();

        // Should show error
        await expect(page.locator('.field-error-message')).toBeVisible();
    });

    test('should display item error message next to label', async ({ page }) => {
        const itemInput = page.locator('#item-id');

        // Trigger error (item 3 not in auction 80)
        await itemInput.fill('3');
        await itemInput.press('Tab');

        // Wait for async validation
        await page.waitForTimeout(500);

        // Error should be visible and positioned after label
        const errorIsAfterLabel = await page.evaluate(() => {
            const label = document.querySelector('label[for="item-id"]');
            const error = document.querySelector('.field-error-message');
            return label && error && label.nextSibling === error;
        });
        expect(errorIsAfterLabel).toBe(true);
    });

    test('should dismiss item error when user types', async ({ page }) => {
        const itemInput = page.locator('#item-id');

        // Trigger error
        await itemInput.fill('3');
        await itemInput.press('Tab');
        await page.waitForTimeout(500);

        // Error should be visible
        await expect(page.locator('.field-error-message')).toBeVisible();

        // Start typing - error should disappear
        await itemInput.press('Backspace');
        await itemInput.type('5');

        // Error should be gone
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });

    test('should prevent click-away with invalid item (not in auction)', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const bidderInput = page.locator('#bidder-id');

        // Enter item not in auction 80
        await itemInput.fill('3');

        // Click away to bidder field (triggers blur)
        await bidderInput.click();

        // Wait for async blur validation
        await page.waitForTimeout(500);

        // Should refocus item field (not allow click away)
        await expect(itemInput).toBeFocused();

        // Should show error
        await expect(page.locator('.field-error-message')).toBeVisible();
        await expect(page.locator('.field-error-message')).toContainText('not part of this auction');
    });

    test('should prevent click-away with non-numeric item value', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const bidderInput = page.locator('#bidder-id');

        // Enter non-numeric
        await itemInput.fill('abc');

        // Click away to bidder field
        await bidderInput.click();

        // Wait for blur validation
        await page.waitForTimeout(300);

        // Should refocus item field
        await expect(itemInput).toBeFocused();

        // Should show error
        await expect(page.locator('.field-error-message')).toBeVisible();
        await expect(page.locator('.field-error-message')).toContainText('Invalid item entry');
    });

    test('should allow click-away with valid item in auction', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const bidderInput = page.locator('#bidder-id');

        // Enter valid item (57 is in auction 80)
        await itemInput.fill('57');

        // Click away to bidder field
        await bidderInput.click();

        // Wait for async blur validation
        await page.waitForTimeout(500);

        // Should remain on bidder field (click away allowed)
        await expect(bidderInput).toBeFocused();

        // Should NOT show error
        await expect(page.locator('.field-error-message')).not.toBeVisible();
    });
});