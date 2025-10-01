# Database Schema

Complete database structure for the Silent Auction Management System.

## Entity Relationship Overview

```
bidders (1) ──< (M) winning_bids (M) >── (1) items
                       │
                       │
                      (M)
                       │
                      (1)
                   auctions
                       │
                      (1)
                       │
                      (M)
                auction_items (M) >── (1) items
                       │
bidders (1) ──< (1) bidder_payments (M) >── (1) auctions
```

## Tables

### `bidders`
Stores bidder registration information.

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

**Purpose:** Track bidder information for identification and contact
**Indexes:** idx_name for fast alphabetical lookup

### `items`
Stores the catalog of auction items.

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

**Purpose:** Maintain reusable item catalog
**Indexes:** idx_name for fast item search

### `auctions`
Stores auction event information.

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

**Purpose:** Track auction events
**Indexes:** Date and status for filtering

### `auction_items`
Junction table linking items to auctions.

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

**Purpose:** Many-to-many relationship between auctions and items
**Constraints:** Prevents duplicate item assignments

### `winning_bids`
Stores bid entry data (winning bids only).

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
    UNIQUE KEY unique_auction_item_bidder (auction_id, item_id, bidder_id),
    INDEX idx_auction (auction_id),
    INDEX idx_bidder (bidder_id),
    INDEX idx_item (item_id)
);
```

**Purpose:** Track winning bids entered post-auction
**Constraints:** One bid per auction/item/bidder combination

### `bidder_payments`
Stores payment tracking for clerking/checkout.

```sql
CREATE TABLE bidder_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    bidder_id INT NOT NULL,
    auction_id INT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'check') NOT NULL,
    check_number VARCHAR(50) NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bidder_id) REFERENCES bidders(bidder_id) ON DELETE CASCADE,
    FOREIGN KEY (auction_id) REFERENCES auctions(auction_id) ON DELETE CASCADE,
    UNIQUE KEY unique_bidder_auction (bidder_id, auction_id),
    INDEX idx_auction (auction_id),
    INDEX idx_bidder (bidder_id),
    INDEX idx_payment_date (payment_date)
);
```

**Purpose:** Track payments received from bidders
**Constraints:** One payment per bidder per auction

## Key Relationships

### Bidder → Winning Bids → Items
A bidder can win multiple items in an auction.

### Auction → Items (via auction_items)
An auction contains multiple items; items can be in multiple auctions.

### Bidder → Payments → Auction
A bidder makes one payment per auction for all items won.

## Special Records

### No Bid Bidder (ID: 0)
Special bidder record for items with no winning bids.
```sql
INSERT INTO bidders (bidder_id, first_name, last_name)
VALUES (0, 'No', 'Bid');
```

## Common Queries

### Get all bidders with payments for an auction
```sql
SELECT b.bidder_id, b.first_name, b.last_name,
       COUNT(wb.bid_id) as items_won,
       SUM(wb.winning_price * wb.quantity_won) as amount_bid,
       COALESCE(bp.amount_paid, 0) as amount_paid
FROM bidders b
JOIN winning_bids wb ON b.bidder_id = wb.bidder_id
LEFT JOIN bidder_payments bp ON b.bidder_id = bp.bidder_id
    AND bp.auction_id = wb.auction_id
WHERE wb.auction_id = ?
GROUP BY b.bidder_id
ORDER BY b.last_name, b.first_name;
```

### Get all items with winners for an auction
```sql
SELECT i.item_id, i.item_name,
       wb.winning_price,
       CONCAT(b.first_name, ' ', b.last_name) as winner_name
FROM auction_items ai
JOIN items i ON ai.item_id = i.item_id
LEFT JOIN winning_bids wb ON ai.item_id = wb.item_id
    AND ai.auction_id = wb.auction_id
LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
WHERE ai.auction_id = ?
ORDER BY i.item_id;
```

## Index Strategy

Indexes are strategically placed for:
- **Fast bidder search** (idx_name on last_name, first_name)
- **Fast item search** (idx_name on item_name)
- **Auction filtering** (idx_date, idx_status)
- **Join performance** (foreign key indexes)
- **Report queries** (auction_id, bidder_id indexes)

## Data Integrity

### Foreign Keys
All relationships enforced with foreign key constraints.

### Cascading Deletes
- Deleting an auction removes auction_items and bidder_payments
- Deleting a bidder removes their winning_bids and payments
- Deleting an item removes its auction assignments

### Unique Constraints
- One bid per auction/item/bidder
- One item assignment per auction/item
- One payment per bidder/auction

## Performance Considerations

### Optimized for Small-Medium Scale
- Up to 10,000 bidders: Excellent performance
- Up to 5,000 items: Excellent performance
- Up to 100 concurrent auctions: Excellent performance

### Query Optimization
- All frequent queries use indexed columns
- JOIN operations optimized with proper indexes
- ENUM types for limited value sets

## See Also

- [Installation Guide](installation.md) - Database setup instructions
- [API Reference](api-reference.md) - How APIs interact with database
- [Technical Details](technical.md) - Architecture decisions
