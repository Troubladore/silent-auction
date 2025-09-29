<?php
// Test Bootstrap File

// Set up error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Define test environment constants
define('TEST_MODE', true);

// Start session for tests that need it
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include the main application files
require_once __DIR__ . '/../includes/functions.php';

// Test database connection function - using SQLite for testing
function getTestConnection() {
    try {
        // Use in-memory SQLite database for fast testing
        $pdo = new PDO('sqlite::memory:', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        
        // Enable foreign key constraints in SQLite
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception("Test database connection failed: " . $e->getMessage());
    }
}

// Override the main getConnection function for tests
function getConnection() {
    // Use the test database created in TestCase
    if (isset($GLOBALS['test_pdo'])) {
        return $GLOBALS['test_pdo'];
    }
    return getTestConnection();
}

// Test helper functions
function createTestDatabase() {
    try {
        $pdo = getTestConnection();
        
        // Create SQLite schema (adapted from MySQL schema)
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
        
        -- Sample data for testing
        INSERT INTO bidders (first_name, last_name, phone, email) VALUES
        ('John', 'Smith', '5551234567', 'john@email.com'),
        ('Jane', 'Doe', '5559876543', 'jane@email.com'),
        ('Bob', 'Johnson', '5554567890', 'bob@email.com');
        
        INSERT INTO auctions (auction_date, auction_description) VALUES
        (date('now'), 'Community Benefit Auction 2024'),
        ('2024-12-15', 'Holiday Charity Auction');
        
        INSERT INTO items (item_name, item_description, item_quantity) VALUES
        ('Wine Gift Basket', 'Selection of local wines with gourmet snacks', 1),
        ('Garden Tool Set', 'Complete set of hand gardening tools', 1),
        ('Artwork Print', 'Local artist landscape print, framed', 1),
        ('Restaurant Gift Card', '$100 gift card to downtown bistro', 1),
        ('Spa Day Package', 'Full day spa treatment package', 1);
        ";
        
        $statements = explode(';', $sqliteSchema);
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (!empty($statement) && !preg_match('/^--/', $statement)) {
                $pdo->exec($statement);
            }
        }
        
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception("Failed to create test database: " . $e->getMessage());
    }
}

function clearTestDatabase() {
    // For SQLite in-memory database, we just recreate the schema
    // since each test gets a fresh in-memory database anyway
    return createTestDatabase();
}

function dropTestDatabase() {
    // For in-memory SQLite, nothing needed - database disappears when connection closes
    return;
}

// Include all class files directly
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/Bidder.php';
require_once __DIR__ . '/../classes/Item.php';
require_once __DIR__ . '/../classes/Auction.php';
require_once __DIR__ . '/../classes/Report.php';

// Autoload classes for namespaced test classes
spl_autoload_register(function ($class) {
    if (strpos($class, 'AuctionSystem\\Tests\\') === 0) {
        $class = str_replace('AuctionSystem\\Tests\\', '', $class);
        $file = __DIR__ . '/' . str_replace('\\', '/', $class) . '.php';
        if (file_exists($file)) {
            require_once $file;
        }
    }
});

// Create test database on bootstrap
createTestDatabase();