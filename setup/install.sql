-- Silent Auction Database Setup
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS silent_auction CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE silent_auction;

-- Bidders table
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

-- Auctions table
CREATE TABLE auctions (
    auction_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_date DATE NOT NULL,
    auction_description TEXT NOT NULL,
    status ENUM('planning', 'active', 'completed') DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (auction_date),
    INDEX idx_status (status)
);

-- Items table
CREATE TABLE items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (item_name)
);

-- Junction table for auction-item associations
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

-- Winning bids table
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

-- Sample data for testing
INSERT INTO bidders (first_name, last_name, phone, email) VALUES
('John', 'Smith', '555-123-4567', 'john@email.com'),
('Jane', 'Doe', '555-987-6543', 'jane@email.com'),
('Bob', 'Johnson', '555-456-7890', 'bob@email.com');

INSERT INTO auctions (auction_date, auction_description) VALUES
(CURDATE(), 'Community Benefit Auction 2024'),
('2024-12-15', 'Holiday Charity Auction');

INSERT INTO items (item_name, item_description, item_quantity) VALUES
('Wine Gift Basket', 'Selection of local wines with gourmet snacks', 1),
('Garden Tool Set', 'Complete set of hand gardening tools', 1),
('Artwork Print', 'Local artist landscape print, framed', 1),
('Restaurant Gift Card', '$100 gift card to downtown bistro', 1),
('Spa Day Package', 'Full day spa treatment package', 1);