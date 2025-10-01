const { test, expect } = require('@playwright/test');

test.describe('Scrollbar Threshold Calculation', () => {
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

    test('should calculate item height and scrollbar threshold', async ({ page }) => {
        const itemInput = page.locator('#item-id');
        const dropdown = page.locator('#item-lookup');

        // Search for "1" to get multiple items
        await itemInput.click();
        await itemInput.fill('1');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        // Get dropdown and item measurements
        const dropdownHeight = await dropdown.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                maxHeight: styles.maxHeight,
                actualHeight: el.offsetHeight,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                hasScroll: el.scrollHeight > el.clientHeight
            };
        });

        console.log('Dropdown measurements:', JSON.stringify(dropdownHeight, null, 2));

        const items = dropdown.locator('.lookup-item');
        const itemCount = await items.count();
        console.log('Number of items:', itemCount);

        if (itemCount > 0) {
            const firstItemHeight = await items.first().evaluate(el => {
                const styles = window.getComputedStyle(el);
                return {
                    height: el.offsetHeight,
                    padding: styles.padding,
                    fontSize: styles.fontSize,
                    lineHeight: styles.lineHeight
                };
            });

            console.log('First item measurements:', JSON.stringify(firstItemHeight, null, 2));

            // Calculate threshold
            const maxHeight = parseFloat(dropdownHeight.maxHeight);
            const itemHeight = firstItemHeight.height;
            const threshold = Math.floor(maxHeight / itemHeight);

            console.log('\n=== SCROLLBAR THRESHOLD CALCULATION ===');
            console.log(`Max dropdown height: ${maxHeight}px`);
            console.log(`Average item height: ${itemHeight}px`);
            console.log(`Items before scrollbar appears: ~${threshold} items`);
            console.log(`Current item count: ${itemCount}`);
            console.log(`Scrollbar visible: ${dropdownHeight.hasScroll}`);
            console.log('======================================\n');
        }
    });

    test('should show scrollbar with many results', async ({ page }) => {
        const bidderInput = page.locator('#bidder-id');
        const dropdown = page.locator('#bidder-lookup');

        // Search for a common letter to get many results
        await bidderInput.click();
        await bidderInput.fill('j');
        await page.waitForTimeout(500);

        await expect(dropdown).toBeVisible();

        const measurements = await dropdown.evaluate(el => {
            return {
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                hasScroll: el.scrollHeight > el.clientHeight,
                itemCount: el.querySelectorAll('.lookup-item').length
            };
        });

        console.log('Bidder dropdown with "j":', JSON.stringify(measurements, null, 2));

        // If there are enough items, should have scroll
        if (measurements.itemCount > 5) {
            expect(measurements.hasScroll).toBe(true);
        }
    });
});
