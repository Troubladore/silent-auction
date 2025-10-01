<?php
require_once 'Database.php';

class Auction {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    public function getAll($limit = 50, $offset = 0) {
        $sql = 'SELECT a.*, 
                (SELECT COUNT(*) FROM auction_items ai WHERE ai.auction_id = a.auction_id) as item_count,
                (SELECT COUNT(*) FROM winning_bids wb WHERE wb.auction_id = a.auction_id) as bid_count
                FROM auctions a 
                ORDER BY a.auction_date DESC 
                LIMIT ' . $limit . ' OFFSET ' . $offset;
        
        return $this->db->fetchAll($sql);
    }
    
    public function getById($id) {
        return $this->db->fetch('SELECT * FROM auctions WHERE auction_id = :id', ['id' => $id]);
    }
    
    public function getWithStats($id) {
        $sql = 'SELECT a.*, 
                (SELECT COUNT(*) FROM auction_items ai WHERE ai.auction_id = a.auction_id) as item_count,
                (SELECT COUNT(*) FROM winning_bids wb WHERE wb.auction_id = a.auction_id) as bid_count,
                (SELECT SUM(wb.winning_price * wb.quantity_won) FROM winning_bids wb WHERE wb.auction_id = a.auction_id) as total_revenue
                FROM auctions a 
                WHERE a.auction_id = :id';
        
        return $this->db->fetch($sql, ['id' => $id]);
    }
    
    public function create($data) {
        $required = ['auction_date', 'auction_description'];
        $errors = validateRequired($required, $data);
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Validate date format
        if (!strtotime($data['auction_date'])) {
            return ['success' => false, 'errors' => ['Invalid date format']];
        }
        
        try {
            $id = $this->db->insert('auctions', $data);
            return ['success' => true, 'id' => $id];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function update($id, $data) {
        $required = ['auction_date', 'auction_description'];
        $errors = validateRequired($required, $data);
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Validate date format
        if (!strtotime($data['auction_date'])) {
            return ['success' => false, 'errors' => ['Invalid date format']];
        }
        
        // Only allow specific auction fields to be updated
        $allowedFields = ['auction_date', 'auction_description', 'status'];
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        try {
            $this->db->update('auctions', $updateData, 'auction_id = :id', ['id' => $id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function delete($id) {
        try {
            // Check if auction has winning bids
            $bids = $this->db->fetch('SELECT COUNT(*) as count FROM winning_bids WHERE auction_id = :id', ['id' => $id]);
            if ($bids['count'] > 0) {
                return ['success' => false, 'errors' => ['Cannot delete auction with existing bids']];
            }
            
            $this->db->delete('auctions', 'auction_id = :id', ['id' => $id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function updateStatus($id, $status) {
        $valid_statuses = ['planning', 'active', 'completed'];
        if (!in_array($status, $valid_statuses)) {
            return ['success' => false, 'errors' => ['Invalid status']];
        }
        
        try {
            $this->db->update('auctions', ['status' => $status], 'auction_id = :id', ['id' => $id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function getItemsForBidEntry($auction_id) {
        // Get items with aggregated winner information for multiple winners
        $sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity,
                       GROUP_CONCAT(wb.bidder_id ORDER BY wb.created_at) as bidder_ids,
                       GROUP_CONCAT(wb.winning_price ORDER BY wb.created_at) as winning_prices,
                       GROUP_CONCAT(wb.quantity_won ORDER BY wb.created_at) as quantities_won,
                       GROUP_CONCAT(CONCAT(b.first_name, " ", b.last_name) ORDER BY wb.created_at SEPARATOR "|") as winner_names,
                       SUM(wb.quantity_won) as total_quantity_won,
                       COUNT(wb.bid_id) as winner_count,
                       CASE 
                           WHEN COUNT(wb.bid_id) = 0 THEN NULL
                           WHEN COUNT(wb.bid_id) = 1 AND MIN(wb.bidder_id) = 0 THEN 0
                           ELSE MIN(wb.bidder_id)
                       END as bidder_id,
                       CASE 
                           WHEN COUNT(wb.bid_id) = 0 THEN NULL
                           WHEN COUNT(wb.bid_id) = 1 AND MIN(wb.bidder_id) = 0 THEN 0
                           ELSE AVG(wb.winning_price)
                       END as winning_price,
                       CASE 
                           WHEN COUNT(wb.bid_id) = 0 THEN 1
                           ELSE SUM(wb.quantity_won)
                       END as quantity_won,
                       CASE 
                           WHEN COUNT(wb.bid_id) = 0 THEN NULL
                           WHEN COUNT(wb.bid_id) = 1 AND MIN(wb.bidder_id) = 0 THEN "No Bid"
                           WHEN COUNT(wb.bid_id) = 1 THEN MIN(CONCAT(b.first_name, " ", b.last_name))
                           ELSE CONCAT(COUNT(wb.bid_id), " Winners")
                       END as winner_name
                FROM auction_items ai
                JOIN items i ON ai.item_id = i.item_id
                LEFT JOIN winning_bids wb ON ai.item_id = wb.item_id AND ai.auction_id = wb.auction_id
                LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
                WHERE ai.auction_id = :auction_id
                GROUP BY i.item_id, i.item_name, i.item_description, i.item_quantity
                ORDER BY i.item_id';
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id]);
    }
    
    public function saveBid($auction_id, $item_id, $bidder_id, $winning_price, $quantity_won = 1, $no_bid = false) {
        try {
            // For no-bid entries, use bidder ID 0 and set winning_price to 0
            if ($no_bid) {
                // For no-bid, first remove any existing winners for this item
                $this->db->delete('winning_bids', 'auction_id = :auction_id AND item_id = :item_id', 
                                 ['auction_id' => $auction_id, 'item_id' => $item_id]);
                
                $bidder_id = 0;
                $winning_price = 0;
                $quantity_won = 0;
            } else {
                // For real bids, remove any no-bid entries first
                $this->db->delete('winning_bids', 'auction_id = :auction_id AND item_id = :item_id AND bidder_id = 0', 
                                 ['auction_id' => $auction_id, 'item_id' => $item_id]);
            }
            
            // Check if this specific bidder already has a bid for this item
            $existing = $this->db->fetch('SELECT bid_id FROM winning_bids WHERE auction_id = :auction_id AND item_id = :item_id AND bidder_id = :bidder_id', 
                                       ['auction_id' => $auction_id, 'item_id' => $item_id, 'bidder_id' => $bidder_id]);
            
            $data = [
                'auction_id' => $auction_id,
                'item_id' => $item_id,
                'bidder_id' => $bidder_id,
                'winning_price' => $winning_price,
                'quantity_won' => $quantity_won
            ];
            
            if ($existing) {
                // Update existing bid for this specific bidder
                $this->db->update('winning_bids', $data, 'bid_id = :bid_id', ['bid_id' => $existing['bid_id']]);
            } else {
                // Create new bid (allows multiple winners per item)
                $this->db->insert('winning_bids', $data);
            }
            
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred: ' . $e->getMessage()]];
        }
    }
    
    public function deleteBid($auction_id, $item_id) {
        try {
            $this->db->delete('winning_bids', 'auction_id = :auction_id AND item_id = :item_id', 
                            ['auction_id' => $auction_id, 'item_id' => $item_id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function getCount() {
        return $this->db->count('auctions');
    }
}
?>