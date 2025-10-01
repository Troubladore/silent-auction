-- Migration: Add bidder_payments table for clerking/checkout
-- Run this script on existing databases that don't have the bidder_payments table

USE silent_auction;

-- Bidder payments table (for clerking/checkout)
CREATE TABLE IF NOT EXISTS bidder_payments (
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
