<?php
require_once 'Database.php';

class Bidder {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    public function getAll($search = '', $limit = 50, $offset = 0) {
        $where = '1=1';
        $params = [];
        
        if (!empty($search)) {
            $where .= ' AND (first_name LIKE :search OR last_name LIKE :search OR CONCAT(first_name, " ", last_name) LIKE :search OR bidder_id = :exact_id)';
            $params['search'] = '%' . $search . '%';
            if (is_numeric($search)) {
                $params['exact_id'] = $search;
            }
        }
        
        $sql = "SELECT * FROM bidders WHERE {$where} ORDER BY last_name, first_name LIMIT {$limit} OFFSET {$offset}";
        return $this->db->fetchAll($sql, $params);
    }
    
    public function getById($id) {
        return $this->db->fetch('SELECT * FROM bidders WHERE bidder_id = :id', ['id' => $id]);
    }
    
    public function search($term) {
        // Build dynamic query based on whether term is numeric or not
        if (is_numeric($term)) {
            // For numeric terms, prioritize exact ID match, then partial ID matches, then names
            $sql = 'SELECT bidder_id, CONCAT(first_name, " ", last_name) as name, phone, email 
                    FROM bidders 
                    WHERE bidder_id = ? OR CAST(bidder_id AS CHAR) LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, " ", last_name) LIKE ?
                    ORDER BY 
                        CASE WHEN bidder_id = ? THEN 0 
                             WHEN CAST(bidder_id AS CHAR) LIKE ? THEN 1
                             ELSE 2 END,
                        bidder_id, last_name, first_name 
                    LIMIT 10';
            $params = [
                $term,           // exact_id for WHERE
                $term . '%',     // bidder_id starts-with (e.g., "1" matches 10, 11, 12...)
                '%' . $term . '%',     // contains in first_name
                '%' . $term . '%',     // contains in last_name
                '%' . $term . '%',     // contains in full name
                $term,           // exact_id for ORDER BY
                $term . '%'      // bidder_id starts-with for ORDER BY
            ];
        } else {
            // For text terms, search names only with contains logic
            $sql = 'SELECT bidder_id, CONCAT(first_name, " ", last_name) as name, phone, email 
                    FROM bidders 
                    WHERE first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, " ", last_name) LIKE ?
                    ORDER BY last_name, first_name LIMIT 10';
            $params = [
                '%' . $term . '%',  // contains for first_name
                '%' . $term . '%',  // contains for last_name
                '%' . $term . '%'   // contains for full name
            ];
        }
        
        return $this->db->fetchAll($sql, $params);
    }
    
    public function create($data) {
        $required = ['first_name', 'last_name'];
        $errors = validateRequired($required, $data);
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Clean phone number
        if (!empty($data['phone'])) {
            $data['phone'] = preg_replace('/[^0-9]/', '', $data['phone']);
        }
        
        try {
            $id = $this->db->insert('bidders', $data);
            return ['success' => true, 'id' => $id];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function update($id, $data) {
        $required = ['first_name', 'last_name'];
        $errors = validateRequired($required, $data);
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Clean phone number
        if (!empty($data['phone'])) {
            $data['phone'] = preg_replace('/[^0-9]/', '', $data['phone']);
        }
        
        try {
            $this->db->update('bidders', $data, 'bidder_id = :id', ['id' => $id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function delete($id) {
        try {
            // Check if bidder has winning bids
            $bids = $this->db->fetch('SELECT COUNT(*) as count FROM winning_bids WHERE bidder_id = :id', ['id' => $id]);
            if ($bids['count'] > 0) {
                return ['success' => false, 'errors' => ['Cannot delete bidder with existing bids']];
            }
            
            $this->db->delete('bidders', 'bidder_id = :id', ['id' => $id]);
            return ['success' => true];
        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    public function getCount($search = '') {
        $where = '1=1';
        $params = [];
        
        if (!empty($search)) {
            $where .= ' AND (first_name LIKE :search OR last_name LIKE :search OR CONCAT(first_name, " ", last_name) LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        
        return $this->db->count('bidders', $where, $params);
    }
}
?>