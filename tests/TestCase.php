<?php

namespace AuctionSystem\Tests;

use PHPUnit\Framework\TestCase as BaseTestCase;
use PDO;

abstract class TestCase extends BaseTestCase
{
    protected static $testPdo;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a fresh test database for each test
        self::$testPdo = $this->createFreshTestDatabase();
        
        // Set global variable for getConnection() override
        $GLOBALS['test_pdo'] = self::$testPdo;
    }
    
    protected function createFreshTestDatabase()
    {
        $pdo = new PDO('sqlite::memory:', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        
        // Enable foreign key constraints in SQLite
        $pdo->exec('PRAGMA foreign_keys = ON');
        
        // Create the schema
        $sqliteSchema = "
        CREATE TABLE bidders (
            bidder_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            email VARCHAR(255),
            address1 VARCHAR(255),
            address2 VARCHAR(255),
            city VARCHAR(100),
            state VARCHAR(50),
            postal_code VARCHAR(20),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE auctions (
            auction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            auction_date DATE NOT NULL,
            auction_description TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'completed')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE items (
            item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name VARCHAR(255) NOT NULL,
            item_description TEXT,
            item_quantity INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE auction_items (
            auction_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            auction_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (auction_id) REFERENCES auctions(auction_id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
            UNIQUE(auction_id, item_id)
        );
        
        CREATE TABLE winning_bids (
            bid_id INTEGER PRIMARY KEY AUTOINCREMENT,
            auction_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            bidder_id INTEGER NOT NULL,
            winning_price DECIMAL(10,2),
            quantity_won INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (auction_id) REFERENCES auctions(auction_id),
            FOREIGN KEY (item_id) REFERENCES items(item_id),
            FOREIGN KEY (bidder_id) REFERENCES bidders(bidder_id),
            UNIQUE(auction_id, item_id)
        );
        ";
        
        $statements = explode(';', $sqliteSchema);
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (!empty($statement)) {
                $pdo->exec($statement);
            }
        }
        
        return $pdo;
    }
    
    protected function tearDown(): void
    {
        // Clean up after each test
        clearTestDatabase();
        
        parent::tearDown();
    }
    
    /**
     * Create a test bidder with default or custom data
     */
    protected function createTestBidder($data = [])
    {
        $defaultData = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '5551234567',
            'email' => 'john@example.com',
            'address1' => '123 Main St',
            'city' => 'Anytown',
            'state' => 'NY',
            'postal_code' => '12345'
        ];
        
        $bidder = new \Bidder();
        $result = $bidder->create(array_merge($defaultData, $data));
        
        if (!$result['success']) {
            $this->fail('Failed to create test bidder: ' . implode(', ', $result['errors']));
        }
        
        return $result['id'];
    }
    
    /**
     * Create a test item with default or custom data
     */
    protected function createTestItem($data = [])
    {
        $defaultData = [
            'item_name' => 'Test Item',
            'item_description' => 'A test item for testing',
            'item_quantity' => 1
        ];
        
        $item = new \Item();
        $result = $item->create(array_merge($defaultData, $data));
        
        if (!$result['success']) {
            $this->fail('Failed to create test item: ' . implode(', ', $result['errors']));
        }
        
        return $result['id'];
    }
    
    /**
     * Create a test auction with default or custom data
     */
    protected function createTestAuction($data = [])
    {
        $defaultData = [
            'auction_date' => date('Y-m-d'),
            'auction_description' => 'Test Auction',
            'status' => 'planning'
        ];
        
        $auction = new \Auction();
        $result = $auction->create(array_merge($defaultData, $data));
        
        if (!$result['success']) {
            $this->fail('Failed to create test auction: ' . implode(', ', $result['errors']));
        }
        
        return $result['id'];
    }
    
    /**
     * Create a complete test scenario with bidder, item, auction, and association
     */
    protected function createTestScenario($itemData = [], $bidderData = [], $auctionData = [])
    {
        $bidderId = $this->createTestBidder($bidderData);
        $itemId = $this->createTestItem($itemData);
        $auctionId = $this->createTestAuction($auctionData);
        
        // Associate item with auction
        $item = new \Item();
        $item->addToAuction($itemId, $auctionId);
        
        return [
            'bidder_id' => $bidderId,
            'item_id' => $itemId,
            'auction_id' => $auctionId
        ];
    }
    
    /**
     * Assert that a database table has a specific number of records
     */
    protected function assertDatabaseCount($table, $expectedCount, $message = '')
    {
        $db = new \Database();
        $actualCount = $db->count($table);
        
        $this->assertEquals(
            $expectedCount, 
            $actualCount, 
            $message ?: "Expected {$expectedCount} records in {$table}, found {$actualCount}"
        );
    }
    
    /**
     * Assert that a database record exists with specific data
     */
    protected function assertDatabaseHas($table, $data, $message = '')
    {
        $db = new \Database();
        
        $whereClause = [];
        $params = [];
        foreach ($data as $field => $value) {
            $whereClause[] = "{$field} = :{$field}";
            $params[$field] = $value;
        }
        
        $sql = "SELECT COUNT(*) as count FROM {$table} WHERE " . implode(' AND ', $whereClause);
        $result = $db->fetch($sql, $params);
        
        $this->assertGreaterThan(
            0,
            $result['count'],
            $message ?: "Expected to find record in {$table} with data: " . json_encode($data)
        );
    }
    
    /**
     * Assert that a database record does not exist with specific data
     */
    protected function assertDatabaseMissing($table, $data, $message = '')
    {
        $db = new \Database();
        
        $whereClause = [];
        $params = [];
        foreach ($data as $field => $value) {
            $whereClause[] = "{$field} = :{$field}";
            $params[$field] = $value;
        }
        
        $sql = "SELECT COUNT(*) as count FROM {$table} WHERE " . implode(' AND ', $whereClause);
        $result = $db->fetch($sql, $params);
        
        $this->assertEquals(
            0,
            $result['count'],
            $message ?: "Expected NOT to find record in {$table} with data: " . json_encode($data)
        );
    }
}