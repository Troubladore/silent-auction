const { test, expect } = require('@playwright/test');

test.describe('Item Search Completeness', () => {
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

    test('should include item #16 when searching for "1"', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500); // Wait for debounce

        // Dropdown should be visible
        await expect(dropdown).toBeVisible();

        // Get all item IDs from dropdown
        const items = dropdown.locator('.lookup-item');
        const itemIds = [];
        const count = await items.count();

        for (let i = 0; i < count; i++) {
            const id = await items.nth(i).getAttribute('data-id');
            itemIds.push(id);
        }

        console.log('Found item IDs:', itemIds.join(', '));

        // Should include item #16 (starts with "1")
        expect(itemIds).toContain('16');

        // Should also include other items with "1" in name or ID
        expect(itemIds).toContain('13'); // Existing Item 1
        expect(itemIds).toContain('17'); // Existing Item 1
        expect(itemIds).toContain('14'); // Existing Item 2 (has "1" in name)
        expect(itemIds).toContain('19'); // Has "1" in both ID and name
    });

    test('should show item #16 first when searching for "1" (ID prefix match)', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        const items = dropdown.locator('.lookup-item');
        const firstItemId = await items.first().getAttribute('data-id');

        console.log('First item ID:', firstItemId);

        // Item #16 should be first because it starts with "1" (CAST match)
        expect(firstItemId).toBe('16');
    });

    test('should prioritize exact ID match over partial match', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        // Search for exact item ID
        await itemInput.click();
        await itemInput.fill('13');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        const items = dropdown.locator('.lookup-item');
        const firstItemId = await items.first().getAttribute('data-id');

        console.log('First item ID for "13":', firstItemId);

        // Item #13 should be first (exact match takes priority)
        expect(firstItemId).toBe('13');
    });

    test('should show all items starting with "1" when typing "1"', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        const items = dropdown.locator('.lookup-item');
        const count = await items.count();

        console.log('Total items found for "1":', count);

        // Auction 80 has items: 13, 14, 16, 17, 19, 57
        // Searching "1" should match:
        // - 16 (ID starts with "1")
        // - 17 (ID starts with "1")
        // - 13 (ID starts with "1")
        // - 19 (ID starts with "1")
        // - 14 (name has "1": "Existing Item 2")
        // Total: at least 5 items
        expect(count).toBeGreaterThanOrEqual(5);
    });

    test('should match partial item IDs (e.g., "5" matches "57")', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('5');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        const items = dropdown.locator('.lookup-item');
        const itemIds = [];
        const count = await items.count();

        for (let i = 0; i < count; i++) {
            const id = await items.nth(i).getAttribute('data-id');
            itemIds.push(id);
        }

        console.log('Found item IDs for "5":', itemIds.join(', '));

        // Should include item #57 (starts with "5")
        expect(itemIds).toContain('57');
    });

    test('should handle "16" exact match and show item #16 first', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        await itemInput.click();
        await itemInput.fill('16');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        const items = dropdown.locator('.lookup-item');
        const firstItemId = await items.first().getAttribute('data-id');

        console.log('First item ID for "16":', firstItemId);

        // Item #16 should be first (exact match)
        expect(firstItemId).toBe('16');
    });
});
