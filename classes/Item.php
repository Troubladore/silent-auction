<?php
require_once 'Database.php';

class Item {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    public function getAll($search = '', $limit = 50, $offset = 0) {
        $where = '1=1';
        $params = [];
        
        if (!empty($search)) {
            $where .= ' AND (item_name LIKE :search OR item_description LIKE :search OR item_id = :exact_id)';
            $params['search'] = '%' . $search . '%';
            if (is_numeric($search)) {
                $params['exact_id'] = $search;
            }
        }
        
        $sql = "SELECT * FROM items WHERE {$where} ORDER BY item_name LIMIT {$limit} OFFSET {$offset}";
        return $this->db->fetchAll($sql, $params);
    }
    
    public function getById($id) {
        return $this->db->fetch('SELECT * FROM items WHERE item_id = :id', ['id' => $id]);
    }
    
    public function search($term) {
        $sql = 'SELECT item_id, item_name, item_description, item_quantity
                FROM items 
                WHERE item_name LIKE :term OR item_description LIKE :term OR item_id = :exact_id
                ORDER BY item_name LIMIT 10';
        
        $params = ['term' => '%' . $term . '%'];
        if (is_numeric($term)) {
            $params['exact_id'] = $term;
        }
        
        return $this->db->fetchAll($sql, $params);
    }
    
    public function getAvailableForAuction($auction_id) {
        $sql = 'SELECT i.* FROM items i 
                LEFT JOIN auction_items ai ON i.item_id = ai.item_id
                WHERE ai.item_id IS NULL
                ORDER BY i.item_name';
        
        return $this->db->fetchAll($sql);
    }
    
    public function getForAuction($auction_id) {
        $sql = 'SELECT i.*, ai.auction_item_id 
                FROM items i 
                JOIN auction_items ai ON i.item_id = ai.item_id 
                WHERE ai.auction_id = :auction_id
                ORDER BY i.item_name';
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id]);
    }
    
    public function create($data) {
        $required = ['item_name'];
        $errors = validateRequired($required, $data);
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Ensure quantity is at least 1
        if (empty($data['item_quantity']) || $data['item_quantity'] < 1) {
            $data['item_quantity'] = 1;
        }
        
        try {
            $id = $this->db->insert('items', $data);
            return ['success' => true, 'id' => $id];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function update($id, $data) {
        $required = ['item_name'];
        $errors = validateRequired($required, $data);
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Ensure quantity is at least 1
        if (empty($data['item_quantity']) || $data['item_quantity'] < 1) {
            $data['item_quantity'] = 1;
        }
        
        try {
            $this->db->update('items', $data, 'item_id = :id', ['id' => $id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function delete($id) {
        try {
            // Check if item is in any auctions
            $auctions = $this->db->fetch('SELECT COUNT(*) as count FROM auction_items WHERE item_id = :id', ['id' => $id]);
            if ($auctions['count'] > 0) {
                return ['success' => false, 'errors' => ['Cannot delete item that is part of auctions']];
            }
            
            $this->db->delete('items', 'item_id = :id', ['id' => $id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function addToAuction($item_id, $auction_id) {
        try {
            // Validate that item exists
            $item = $this->db->fetch('SELECT item_id FROM items WHERE item_id = :id', ['id' => $item_id]);
            if (!$item) {
                return false;
            }
            
            // Validate that auction exists
            $auction = $this->db->fetch('SELECT auction_id FROM auctions WHERE auction_id = :id', ['id' => $auction_id]);
            if (!$auction) {
                return false;
            }
            
            // Check if association already exists
            $existing = $this->db->fetch('SELECT * FROM auction_items WHERE item_id = :item_id AND auction_id = :auction_id', 
                                       ['item_id' => $item_id, 'auction_id' => $auction_id]);
            if ($existing) {
                return false; // Already associated
            }
            
            $data = ['item_id' => $item_id, 'auction_id' => $auction_id];
            $this->db->insert('auction_items', $data);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    public function removeFromAuction($item_id, $auction_id) {
        try {
            // Check if item has winning bids
            $bids = $this->db->fetch('SELECT COUNT(*) as count FROM winning_bids WHERE item_id = :item_id AND auction_id = :auction_id', 
                                   ['item_id' => $item_id, 'auction_id' => $auction_id]);
            if ($bids['count'] > 0) {
                return ['success' => false, 'errors' => ['Cannot remove item with winning bids']];
            }
            
            $this->db->delete('auction_items', 'item_id = :item_id AND auction_id = :auction_id', 
                            ['item_id' => $item_id, 'auction_id' => $auction_id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function getCount($search = '') {
        $where = '1=1';
        $params = [];
        
        if (!empty($search)) {
            $where .= ' AND (item_name LIKE :search OR item_description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        
        return $this->db->count('items', $where, $params);
    }
}
?>