const { test, expect } = require('@playwright/test');

test('Debug bid editing - capture console logs', async ({ page }) => {
    // Capture all console messages
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture errors
    const errors = [];
    page.on('pageerror', error => {
        errors.push(`PAGE ERROR: ${error.message}`);
    });

    // Login
    await page.goto('http://localhost:8080/login.php');
    await page.fill('input[name="password"]', 'auction123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/pages/index.php');

    // Navigate to bid entry
    await page.goto('http://localhost:8080/pages/bid_entry.php?auction_id=80');
    await page.waitForSelector('#bid-form');
    await page.waitForTimeout(500);

    console.log('\n=== Testing Item 17 ===');

    // Try item 17 (user mentioned this one)
    await page.fill('#item-id', '17');
    await page.press('#item-id', 'Tab');
    await page.waitForTimeout(2000); // Wait for all async operations

    // Check what happened
    const bidderValue = await page.locator('#bidder-id').inputValue();
    const priceValue = await page.locator('#winning-price').inputValue();
    const quantityValue = await page.locator('#quantity-won').inputValue();

    const lookupHTML = await page.locator('#item-lookup').innerHTML();
    const saveButtonText = await page.locator('button[type="submit"]').textContent();

    console.log('\n=== Form State After Selecting Item 17 ===');
    console.log('Bidder:', bidderValue);
    console.log('Price:', priceValue);
    console.log('Quantity:', quantityValue);
    console.log('Save Button:', saveButtonText.trim());
    console.log('Lookup HTML:', lookupHTML.substring(0, 200));

    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== Errors ===');
    if (errors.length > 0) {
        errors.forEach(err => console.log(err));
    } else {
        console.log('No errors');
    }

    // Try item 13 as well
    console.log('\n\n=== Testing Item 13 ===');
    consoleLogs.length = 0; // Clear logs

    await page.fill('#item-id', '13');
    await page.press('#item-id', 'Tab');
    await page.waitForTimeout(2000);

    const bidderValue2 = await page.locator('#bidder-id').inputValue();
    const priceValue2 = await page.locator('#winning-price').inputValue();
    const lookupHTML2 = await page.locator('#item-lookup').innerHTML();
    const saveButtonText2 = await page.locator('button[type="submit"]').textContent();

    console.log('\n=== Form State After Selecting Item 13 ===');
    console.log('Bidder:', bidderValue2);
    console.log('Price:', priceValue2);
    console.log('Save Button:', saveButtonText2.trim());
    console.log('Lookup HTML:', lookupHTML2.substring(0, 200));

    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    // Check if there are any winning_bids in the database
    console.log('\n\n=== Checking Database ===');
    const dbCheck = await page.evaluate(async () => {
        try {
            const response = await fetch('../api/check_inventory.php?item_id=13&auction_id=80', {
                credentials: 'same-origin'
            });
            const text = await response.text();
            console.log('[DEBUG] Raw response:', text.substring(0, 500));

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                return {
                    status: response.status,
                    parseError: e.message,
                    rawText: text.substring(0, 200)
                };
            }

            return {
                status: response.status,
                data: data
            };
        } catch (error) {
            return { error: error.message };
        }
    });

    console.log('API Response for item 13:', JSON.stringify(dbCheck, null, 2));

    // Always pass so we can see the output
    expect(true).toBe(true);
});
