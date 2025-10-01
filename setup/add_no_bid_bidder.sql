-- Migration script to add "No Bid" bidder for existing installations
-- This script can be run safely on existing databases

-- First, check if a "No Bid" bidder exists with wrong ID and fix it
UPDATE bidders SET bidder_id = 0 WHERE first_name = 'No' AND last_name = 'Bid' AND bidder_id != 0;

-- Then, ensure the No Bid bidder exists with ID 0
INSERT IGNORE INTO bidders (bidder_id, first_name, last_name, phone, email) 
VALUES (0, 'No', 'Bid', '', '');

-- Ensure auto increment starts at 1 for new regular bidders
-- (This won't affect existing bidders with higher IDs)
ALTER TABLE bidders AUTO_INCREMENT = 1;

-- Verify the "No Bid" bidder was created
SELECT bidder_id, first_name, last_name FROM bidders WHERE bidder_id = 0;