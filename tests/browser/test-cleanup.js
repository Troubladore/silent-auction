/**
 * Test cleanup utilities for browser tests
 * Removes test data created during browser test runs
 */

const mysql = require('mysql2/promise');

class TestCleanup {
    constructor() {
        this.connection = null;
    }

    async connect() {
        if (this.connection) return this.connection;
        
        this.connection = await mysql.createConnection({
            host: 'localhost',
            user: 'auction_user',
            password: 'auction_pass',
            database: 'silent_auction'
        });
        
        return this.connection;
    }

    async cleanupTestData() {
        const conn = await this.connect();
        
        try {
            // Delete test records created by browser tests
            // We identify test records by common test patterns
            
            // Clean up winning_bids first (foreign key dependencies)
            await conn.execute(`
                DELETE FROM winning_bids 
                WHERE auction_id IN (
                    SELECT auction_id FROM auctions 
                    WHERE auction_description LIKE '%Test%' 
                    OR auction_description LIKE '%Browser%'
                    OR auction_description LIKE '%Playwright%'
                )
            `);
            
            // Clean up auction_items
            await conn.execute(`
                DELETE FROM auction_items 
                WHERE auction_id IN (
                    SELECT auction_id FROM auctions 
                    WHERE auction_description LIKE '%Test%' 
                    OR auction_description LIKE '%Browser%'
                    OR auction_description LIKE '%Playwright%'
                )
            `);
            
            // Clean up test auctions
            await conn.execute(`
                DELETE FROM auctions 
                WHERE auction_description LIKE '%Test%' 
                OR auction_description LIKE '%Browser%'
                OR auction_description LIKE '%Playwright%'
                OR auction_description = 'Community Benefit Auction 2024'
            `);
            
            // Clean up test items
            await conn.execute(`
                DELETE FROM items 
                WHERE item_name LIKE '%Test%' 
                OR item_name LIKE '%Browser%'
                OR item_name LIKE '%Playwright%'
                OR item_description LIKE '%test%'
            `);
            
            // Clean up test bidders
            await conn.execute(`
                DELETE FROM bidders 
                WHERE first_name LIKE '%Test%' 
                OR last_name LIKE '%Test%'
                OR email LIKE '%test%'
                OR email LIKE '%playwright%'
                OR first_name = 'John' AND last_name = 'Doe'
            `);
            
            console.log('✓ Test data cleanup completed');
            
        } catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }
}

module.exports = TestCleanup;