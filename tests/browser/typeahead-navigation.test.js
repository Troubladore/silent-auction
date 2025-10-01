const { test, expect } = require('@playwright/test');

test.describe('Typeahead Arrow Key Navigation', () => {
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

    test('Item field: should show scrollable dropdown when typing "1"', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500); // Wait for debounce

        // Dropdown should be visible
        await expect(dropdown).toBeVisible();

        // Should have multiple items (auction 80 has items like 13, 14, 16, 17, 19)
        const items = dropdown.locator('.lookup-item');
        const count = await items.count();
        console.log(`Found ${count} items for search "1"`);
        expect(count).toBeGreaterThan(0);

        // Check if dropdown is scrollable (has overflow)
        const hasScroll = await dropdown.evaluate(el => {
            return el.scrollHeight > el.clientHeight;
        });
        console.log(`Dropdown scrollable: ${hasScroll}`);
    });

    test('Item field: ArrowDown should highlight first item', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        // Press ArrowDown
        await itemInput.press('ArrowDown');
        await page.waitForTimeout(100);

        // First item should be highlighted
        const firstItem = dropdown.locator('.lookup-item').first();
        await expect(firstItem).toHaveClass(/highlighted/);
    });

    test('Item field: Multiple ArrowDowns should navigate through list', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        const items = dropdown.locator('.lookup-item');
        const count = await items.count();

        // Press ArrowDown twice
        await itemInput.press('ArrowDown');
        await page.waitForTimeout(100);
        await itemInput.press('ArrowDown');
        await page.waitForTimeout(100);

        // Second item should be highlighted
        const secondItem = items.nth(1);
        await expect(secondItem).toHaveClass(/highlighted/);

        // First item should NOT be highlighted
        const firstItem = items.first();
        await expect(firstItem).not.toHaveClass(/highlighted/);
    });

    test('Item field: ArrowUp should navigate backwards', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        const items = dropdown.locator('.lookup-item');

        // Go down twice, then up once
        await itemInput.press('ArrowDown');
        await page.waitForTimeout(100);
        await itemInput.press('ArrowDown');
        await page.waitForTimeout(100);
        await itemInput.press('ArrowUp');
        await page.waitForTimeout(100);

        // First item should be highlighted again
        const firstItem = items.first();
        await expect(firstItem).toHaveClass(/highlighted/);
    });

    test('Item field: Enter on highlighted item should select it', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        // Get the first item's ID
        const firstItem = dropdown.locator('.lookup-item').first();
        const itemId = await firstItem.getAttribute('data-id');

        // Press ArrowDown then Enter
        await itemInput.press('ArrowDown');
        await page.waitForTimeout(100);
        await itemInput.press('Enter');
        await page.waitForTimeout(200);

        // Item input should have the selected ID
        await expect(itemInput).toHaveValue(itemId);

        // Dropdown should be hidden
        await expect(dropdown).not.toBeVisible();
    });

    test('Item field: Escape should close dropdown', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        // Press Escape
        await itemInput.press('Escape');
        await page.waitForTimeout(100);

        // Dropdown should be hidden
        await expect(dropdown).not.toBeVisible();
    });

    test('Bidder field: should show scrollable dropdown when typing', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const dropdown = page.locator('#bidder-lookup');

        await bidderInput.click();
        await bidderInput.fill('smith');
        await page.waitForTimeout(500);

        // Dropdown should be visible
        await expect(dropdown).toBeVisible();

        // Should have items
        const items = dropdown.locator('.lookup-item');
        const count = await items.count();
        expect(count).toBeGreaterThan(0);
    });

    test('Bidder field: ArrowDown should highlight first bidder', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const dropdown = page.locator('#bidder-lookup');

        await bidderInput.click();
        await bidderInput.fill('smith');
        await page.waitForTimeout(500);

        // Press ArrowDown
        await bidderInput.press('ArrowDown');
        await page.waitForTimeout(100);

        // First item should be highlighted
        const firstItem = dropdown.locator('.lookup-item').first();
        await expect(firstItem).toHaveClass(/highlighted/);
    });

    test('Bidder field: Enter on highlighted bidder should select it', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const dropdown = page.locator('#bidder-lookup');

        await bidderInput.click();
        await bidderInput.fill('smith');
        await page.waitForTimeout(500);

        // Get the first bidder's ID
        const firstItem = dropdown.locator('.lookup-item').first();
        const bidderId = await firstItem.getAttribute('data-id');

        // Press ArrowDown then Enter
        await bidderInput.press('ArrowDown');
        await page.waitForTimeout(100);
        await bidderInput.press('Enter');
        await page.waitForTimeout(200);

        // Bidder input should have the selected ID
        await expect(bidderInput).toHaveValue(bidderId);

        // Dropdown should be hidden
        await expect(dropdown).not.toBeVisible();
    });

    test('Item field: typing should reset highlight', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        // Highlight first item
        await itemInput.press('ArrowDown');
        await page.waitForTimeout(100);

        const firstItem = dropdown.locator('.lookup-item').first();
        await expect(firstItem).toHaveClass(/highlighted/);

        // Type another character
        await itemInput.press('3');
        await page.waitForTimeout(500);

        // Highlight should be cleared (no highlighted items)
        const highlightedItems = dropdown.locator('.lookup-item.highlighted');
        await expect(highlightedItems).toHaveCount(0);
    });

    test('Bidder field: typing should reset highlight', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const dropdown = page.locator('#bidder-lookup');

        await bidderInput.click();
        await bidderInput.fill('j');
        await page.waitForTimeout(500);

        // Highlight first item
        await bidderInput.press('ArrowDown');
        await page.waitForTimeout(100);

        const firstItem = dropdown.locator('.lookup-item').first();
        await expect(firstItem).toHaveClass(/highlighted/);

        // Type another character
        await bidderInput.press('o');
        await page.waitForTimeout(500);

        // Highlight should be cleared
        const highlightedItems = dropdown.locator('.lookup-item.highlighted');
        await expect(highlightedItems).toHaveCount(0);
    });
});
