-- Migration to enable multiple winners per item
-- This removes the unique constraint that prevents multiple bidders winning the same item

USE silent_auction;

-- Remove the unique constraint that prevents multiple winners per item
ALTER TABLE winning_bids DROP INDEX unique_auction_item_bid;

-- Add a new unique constraint that allows multiple winners but prevents duplicate bidder-item pairs
ALTER TABLE winning_bids ADD UNIQUE INDEX unique_auction_item_bidder (auction_id, item_id, bidder_id);

-- Show the updated table structure
SHOW CREATE TABLE winning_bids;