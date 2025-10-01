# Technical Specification - Silent Auction Management System

## System Architecture

### Technology Stack
- **Language**: PHP 8.1+
- **Database**: MySQL 8.0+ / MariaDB 10.6+
- **Web Server**: Apache 2.4+ / Nginx 1.18+
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Dependencies**: Minimal (PDO, Sessions)

### System Requirements
- **PHP Extensions**: PDO MySQL, Session, JSON
- **Memory**: 64MB PHP memory limit minimum
- **Storage**: 50MB minimum for application files
- **Database**: 100MB minimum for data storage
- **Browser**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)

## Database Schema

### Core Tables

#### bidders
```sql
CREATE TABLE bidders (
    bidder_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    address1 VARCHAR(255) NULL,
    address2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(50) NULL,
    postal_code VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (last_name, first_name)
);
```

#### items
```sql
CREATE TABLE items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (item_name)
);
```

#### auctions
```sql
CREATE TABLE auctions (
    auction_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_date DATE NOT NULL,
    auction_description TEXT NOT NULL,
    status ENUM('planning', 'active', 'completed') DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (auction_date),
    INDEX idx_status (status)
);
```

#### auction_items (Junction Table)
```sql
CREATE TABLE auction_items (
    auction_item_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(auction_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    UNIQUE KEY unique_auction_item (auction_id, item_id),
    INDEX idx_auction (auction_id),
    INDEX idx_item (item_id)
);
```

#### winning_bids
```sql
CREATE TABLE winning_bids (
    bid_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    item_id INT NOT NULL,
    bidder_id INT NOT NULL,
    winning_price DECIMAL(10,2) NULL,
    quantity_won INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(auction_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    FOREIGN KEY (bidder_id) REFERENCES bidders(bidder_id),
    UNIQUE KEY unique_auction_item_bid (auction_id, item_id),
    INDEX idx_auction (auction_id),
    INDEX idx_bidder (bidder_id),
    INDEX idx_item (item_id)
);
```

### Performance Indexes
```sql
-- Lookup optimization
CREATE INDEX idx_bidder_search ON bidders (bidder_id, first_name, last_name);
CREATE INDEX idx_item_search ON items (item_id, item_name);

-- Join optimization  
CREATE INDEX idx_auction_items_join ON auction_items (auction_id, item_id);
CREATE INDEX idx_bids_lookup ON winning_bids (auction_id, item_id, bidder_id);

-- Reporting optimization
CREATE INDEX idx_bidder_payments ON winning_bids (auction_id, bidder_id);
CREATE INDEX idx_item_results ON winning_bids (auction_id, item_id);
```

## PHP Class Architecture

### Database.php - Data Access Layer
```php
class Database {
    private $pdo;
    
    public function __construct()           // Initialize PDO connection
    public function query($sql, $params)    // Execute prepared statement
    public function fetch($sql, $params)    // Fetch single row
    public function fetchAll($sql, $params) // Fetch multiple rows
    public function insert($table, $data)   // Generic insert with auto-ID
    public function update($table, $data, $where, $params) // Generic update
    public function delete($table, $where, $params)        // Generic delete
    public function count($table, $where, $params)         // Count records
}
```

### Business Logic Classes

#### Bidder.php
```php
class Bidder {
    public function getAll($search, $limit, $offset)    // Paginated list with search
    public function getById($id)                        // Single bidder details
    public function search($term)                       // Fast lookup for AJAX
    public function create($data)                       // Add new bidder
    public function update($id, $data)                  // Update bidder info
    public function delete($id)                         // Remove bidder (with checks)
    public function getCount($search)                   // Total count for pagination
}
```

#### Item.php
```php
class Item {
    public function getAll($search, $limit, $offset)    // Paginated list with search
    public function getById($id)                        // Single item details
    public function search($term)                       // Fast lookup for AJAX
    public function getAvailableForAuction($auction_id) // Items not in auction
    public function getForAuction($auction_id)          // Items in specific auction
    public function create($data)                       // Add new item
    public function update($id, $data)                  // Update item info
    public function delete($id)                         // Remove item (with checks)
    public function addToAuction($item_id, $auction_id) // Associate with auction
    public function removeFromAuction($item_id, $auction_id) // Remove association
    public function getCount($search)                   // Total count for pagination
}
```

#### Auction.php
```php
class Auction {
    public function getAll($limit, $offset)             // Paginated auction list
    public function getById($id)                        // Single auction details
    public function getWithStats($id)                   // Auction with statistics
    public function create($data)                       // Create new auction
    public function update($id, $data)                  // Update auction info
    public function delete($id)                         // Remove auction (with checks)
    public function updateStatus($id, $status)          // Change auction status
    public function getItemsForBidEntry($auction_id)    // Items with bid status
    public function saveBid($auction_id, $item_id, $bidder_id, $price, $qty) // Save winning bid
    public function deleteBid($auction_id, $item_id)    // Remove winning bid
    public function getCount()                          // Total auction count
}
```

#### Report.php
```php
class Report {
    public function getAuctionSummary($auction_id)      // High-level statistics
    public function getBidderPayments($auction_id)      // Payment summary by bidder
    public function getBidderDetails($auction_id, $bidder_id) // Individual receipts
    public function getItemResults($auction_id)         // Complete item results
    public function getUnsoldItems($auction_id)         // Items without bids
    public function generateCSV($data, $headers)        // CSV export utility
    public function exportBidderPayments($auction_id)   // CSV export for payments
    public function exportItemResults($auction_id)      // CSV export for items
    public function getTopPerformers($auction_id, $limit) // Highest-value items
}
```

## API Endpoints

### /api/lookup.php
**Purpose**: Real-time search for bid entry interface
```php
GET /api/lookup.php?type=bidder&term=john
GET /api/lookup.php?type=item&term=basket

Response: {
    "results": [
        {
            "id": 123,
            "name": "John Smith",
            "display": "John Smith (123)",
            "phone": "(555) 123-4567",
            "email": "john@email.com"
        }
    ]
}
```

### /api/save_bid.php
**Purpose**: Save/update/delete winning bids
```php
POST /api/save_bid.php
Content-Type: application/json

Request: {
    "auction_id": 1,
    "item_id": 456,
    "bidder_id": 123,
    "winning_price": 85.00,
    "quantity_won": 1,
    "action": "save" // or "delete"
}

Response: {
    "success": true,
    "message": "Bid saved successfully",
    "stats": {
        "total_revenue": 1250.00,
        "bid_count": 15
    }
}
```

## Frontend Architecture

### CSS Framework (assets/css/style.css)
- **Reset & Base**: Consistent cross-browser styling
- **Layout System**: Flexbox and Grid for responsive design
- **Component Styles**: Buttons, forms, tables, alerts
- **Page-Specific**: Dashboard, bid entry, reports
- **Responsive**: Mobile-tablet breakpoints
- **Print Styles**: Optimized checkout receipts

### JavaScript Architecture (assets/js/auction.js)

#### BidEntry Class
```javascript
class BidEntry {
    constructor()                           // Initialize bid entry interface
    init()                                  // Setup events and load first item
    bindEvents()                            // Keyboard shortcuts and form events
    loadCurrentItem()                       // Display current item details
    performLookup(type, term)               // AJAX real-time search
    showBidderLookup(results)               // Display search results
    saveBid()                               // Submit bid via AJAX
    nextItem() / previousItem()             // Navigation between items
    updateProgress()                        // Progress bar and counters
    calculateRunningTotal()                 // Real-time revenue tracking
    addRecentEntry(item, bid)               // Recent entries display
    clearForm()                             // Reset form fields
}
```

#### Utility Functions
```javascript
formatCurrency(amount)                      // Standard currency formatting
formatPhone(phone)                          // Phone number formatting
```

## Security Implementation

### Authentication System
```php
// Session-based authentication (config/config.php)
define('ADMIN_PASSWORD', 'secure_password');

function isLoggedIn()                       // Check session status
function requireLogin()                     // Force authentication
function login($password)                   // Validate and create session
function logout()                           // Destroy session
```

### Input Validation & Sanitization
```php
// Utility functions (includes/functions.php)
function sanitize($input)                   // HTML/XSS protection
function validateRequired($fields, $data)   // Required field validation

// Database level
- Prepared statements for all queries
- Type casting for numeric inputs
- Length limits on string fields
```

### File Security (.htaccess)
```apache
# Block sensitive files
<FilesMatch "\.(sql|md|log|conf)$">
    Require all denied
</FilesMatch>

# Block config directory access
RewriteRule ^config/ - [F,L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

## Performance Optimization

### Database Optimization
- **Strategic Indexing**: Query-specific indexes on lookup fields
- **Query Efficiency**: Minimal JOIN operations, optimized WHERE clauses
- **Connection Pooling**: Reuse database connections within requests
- **Data Types**: Appropriate field sizes and types

### Frontend Optimization
- **Asset Minification**: Single CSS and JS files
- **Caching Headers**: Browser caching for static assets
- **Gzip Compression**: Text file compression
- **Minimal Dependencies**: No external frameworks

### Application Optimization
- **Session Caching**: Reduce database queries during bid entry
- **Pagination**: Limit result set sizes
- **Lazy Loading**: Load data only when needed
- **Error Handling**: Graceful degradation

## Development Tools & Workflow

### Code Organization
```
Development Standards:
- PSR-4 autoloading for PHP classes
- Consistent naming conventions
- Error handling throughout
- Documentation in code comments
```

### Database Management
```sql
-- Development data reset
TRUNCATE TABLE winning_bids;
TRUNCATE TABLE auction_items;
DELETE FROM auctions WHERE auction_id > 0;
DELETE FROM items WHERE item_id > 0;  
DELETE FROM bidders WHERE bidder_id > 0;

-- Sample data insertion
INSERT INTO bidders (first_name, last_name, phone, email) VALUES
('Test', 'Bidder', '555-123-4567', 'test@example.com');
```

### Backup & Migration
```bash
# Database backup
mysqldump -u user -p silent_auction > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf auction_backup_$(date +%Y%m%d).tar.gz auction_system/

# Restore database
mysql -u user -p silent_auction < backup_20241201.sql
```

## Testing Considerations

### Manual Testing Checklist
- [ ] Login/logout functionality
- [ ] Bidder CRUD operations
- [ ] Item CRUD operations with batch mode
- [ ] Auction creation and item association
- [ ] Bid entry interface with all shortcuts
- [ ] Real-time lookup functionality
- [ ] Report generation and export
- [ ] Cross-browser compatibility
- [ ] Mobile/tablet responsiveness

### Data Validation Testing
- [ ] Required field validation
- [ ] Numeric input validation
- [ ] Email format validation
- [ ] Phone number handling
- [ ] SQL injection prevention
- [ ] XSS protection

### Performance Testing
- [ ] Page load times < 2 seconds
- [ ] AJAX response times < 500ms
- [ ] Large dataset handling (1000+ records)
- [ ] Concurrent user simulation
- [ ] Database query optimization

## Deployment Specifications

### Production Environment
```
Recommended Server Configuration:
- OS: Ubuntu 20.04 LTS / CentOS 8
- Web Server: Apache 2.4 / Nginx 1.18
- PHP: 8.1+ with OPcache enabled
- MySQL: 8.0+ / MariaDB 10.6+
- SSL: Let's Encrypt certificate
- Memory: 512MB minimum
- Storage: 1GB minimum
```

### Configuration Files
```php
// Production config adjustments
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php/errors.log');
```

### Monitoring & Maintenance
```bash
# Log monitoring
tail -f /var/log/apache2/error.log
tail -f /var/log/mysql/error.log

# Database optimization
OPTIMIZE TABLE bidders, items, auctions, auction_items, winning_bids;

# Performance monitoring
mysql> SHOW PROCESSLIST;
mysql> EXPLAIN SELECT * FROM bidders WHERE first_name LIKE '%john%';
```

## Integration Points

### Future API Expansion
```php
// RESTful API structure for future expansion
GET    /api/bidders              // List bidders
POST   /api/bidders              // Create bidder  
GET    /api/bidders/{id}         // Get bidder
PUT    /api/bidders/{id}         // Update bidder
DELETE /api/bidders/{id}         // Delete bidder

GET    /api/auctions/{id}/items  // Auction items
POST   /api/auctions/{id}/bids   // Submit bid
GET    /api/auctions/{id}/report // Auction report
```

### Export Integration
```php
// CSV export headers for accounting software
'Bidder ID', 'First Name', 'Last Name', 'Phone', 'Email', 
'Address 1', 'Address 2', 'City', 'State', 'Postal Code', 
'Items Won', 'Total Payment'
```

---

This technical specification provides comprehensive implementation details for developers maintaining or extending the Silent Auction Management System.