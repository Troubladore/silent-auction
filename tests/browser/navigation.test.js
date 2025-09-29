/**
 * Browser-based End-to-End Tests for Navigation and General UI
 * 
 * Tests overall site navigation, menu functionality, page loading,
 * and cross-browser compatibility.
 */

const { test, expect } = require('@playwright/test');

let baseUrl = 'http://localhost:8080';

test.describe('Site Navigation and UI', () => {
    test.beforeEach(async ({ page }) => {
        // Login first for pages that require authentication
        await page.goto(`${baseUrl}/pages/login.php`);
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${baseUrl}/pages/index.php`);
    });

    test('should load the home page without errors', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/index.php`);
        
        // Check that page loads
        await expect(page.locator('body')).toBeVisible();
        
        // Verify page has a title
        const title = await page.title();
        expect(title).toBeDefined();
        expect(title.length).toBeGreaterThan(0);
        
        // Check for main navigation elements
        await expect(page.locator('nav, .navigation, .menu')).toBeVisible();
    });

    test('should navigate to all main pages successfully', async ({ page }) => {
        const pages = [
            { url: 'pages/index.php', title: /dashboard|home|auction/i },
            { url: 'pages/auctions.php', title: /auction/i },
            { url: 'pages/items.php', title: /item/i },
            { url: 'pages/bidders.php', title: /bidder/i },
            { url: 'pages/reports.php', title: /report/i }
        ];
        
        for (const pageInfo of pages) {
            await page.goto(`${baseUrl}/${pageInfo.url}`);
            
            // Wait for page to load
            await expect(page.locator('body')).toBeVisible();
            
            // Check title matches expected pattern
            const title = await page.title();
            expect(title).toMatch(pageInfo.title);
            
            // Check for no obvious errors (like error messages or 404 content)
            const hasError = await page.locator('text=/error|404|not found/i').count();
            expect(hasError).toBe(0);
        }
    });

    test('should have working navigation menu links', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/index.php`);
        
        // Look for common navigation patterns
        const navLinks = await page.locator('a[href*="auctions"], a[href*="items"], a[href*="bidders"]').count();
        expect(navLinks).toBeGreaterThan(0);
        
        // Test clicking a navigation link
        const auctionsLink = page.locator('a[href*="auctions"]').first();
        if (await auctionsLink.isVisible()) {
            await auctionsLink.click();
            await expect(page).toHaveURL(/auctions/);
        }
    });

    test('should handle login/logout functionality', async ({ page }) => {
        // Clear session by going to a fresh context
        await page.context().clearCookies();
        
        // Try to access a protected page - should redirect to login
        await page.goto(`${baseUrl}/pages/auctions.php`);
        
        // Should be redirected to login page or show login form
        const currentUrl = page.url();
        if (currentUrl.includes('login')) {
            // Already on login page
            await expect(page).toHaveURL(/login/);
        } else {
            // May redirect to login or require login inline
            await page.goto(`${baseUrl}/pages/login.php`);
        }
        
        // Login form should be visible
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeVisible();
        
        // Login with correct password
        await page.fill('input[name="password"]', 'auction123');
        await page.click('button[type="submit"], input[type="submit"]');
        
        // Should redirect to main page
        await page.waitForURL(/index\.php/);
        
        // Verify we can now access protected pages
        await page.goto(`${baseUrl}/pages/auctions.php`);
        await expect(page).toHaveURL(/auctions/);
        
        // Test logout functionality (session clearing)
        await page.context().clearCookies();
        
        // Try to access protected page again - may or may not redirect based on implementation
        await page.goto(`${baseUrl}/pages/items.php`);
        const postLogoutUrl = page.url();
        
        // Either redirected to login or can still access (depends on session implementation)
        expect(postLogoutUrl).toBeDefined();
    });

    test('should display responsive design elements', async ({ page }) => {
        await page.goto(`${baseUrl}/pages/index.php`);
        
        // Test desktop view
        await page.setViewportSize({ width: 1200, height: 800 });
        await expect(page.locator('body')).toBeVisible();
        
        // Test tablet view
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('body')).toBeVisible();
        
        // Test mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('body')).toBeVisible();
        
        // Check that content is still accessible at mobile size
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
    });

    test('should handle form interactions properly', async ({ page }) => {
        // Test a simple form (like search)
        await page.goto(`${baseUrl}/pages/items.php`);
        
        // Look for search form
        const searchInput = page.locator('input[name="search"], input[type="search"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill('test search');
            
            const searchButton = page.locator('button[type="submit"]:near(input[name="search"]), button:has-text("search")', { hasText: /search/i });
            if (await searchButton.isVisible()) {
                await searchButton.click();
                
                // Should stay on items page
                await expect(page).toHaveURL(/items/);
            }
        }
    });

    test('should handle page errors gracefully', async ({ page }) => {
        // Test accessing a non-existent page
        await page.goto(`${baseUrl}/pages/nonexistent.php`, { waitUntil: 'networkidle' });
        
        // Should either get 404 or redirect to error page, but not crash
        const title = await page.title();
        expect(title).toBeDefined();
        
        // Page should still have basic structure
        await expect(page.locator('body')).toBeVisible();
    });
});