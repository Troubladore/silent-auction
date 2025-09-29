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
        
        try {
            $this->db->update('auctions', $data, 'auction_id = :id', ['id' => $id]);
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
        $sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity,
                       wb.bidder_id, wb.winning_price, wb.quantity_won,
                       CONCAT(b.first_name, " ", b.last_name) as winner_name
                FROM auction_items ai
                JOIN items i ON ai.item_id = i.item_id
                LEFT JOIN winning_bids wb ON ai.item_id = wb.item_id AND ai.auction_id = wb.auction_id
                LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
                WHERE ai.auction_id = :auction_id
                ORDER BY i.item_id';
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id]);
    }
    
    public function saveBid($auction_id, $item_id, $bidder_id, $winning_price, $quantity_won = 1) {
        try {
            // Check if bid already exists
            $existing = $this->db->fetch('SELECT bid_id FROM winning_bids WHERE auction_id = :auction_id AND item_id = :item_id', 
                                       ['auction_id' => $auction_id, 'item_id' => $item_id]);
            
            $data = [
                'auction_id' => $auction_id,
                'item_id' => $item_id,
                'bidder_id' => $bidder_id,
                'winning_price' => $winning_price,
                'quantity_won' => $quantity_won
            ];
            
            if ($existing) {
                // Update existing bid
                $this->db->update('winning_bids', $data, 'bid_id = :bid_id', ['bid_id' => $existing['bid_id']]);
            } else {
                // Create new bid
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