<?php
require_once 'Database.php';

class Report {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    public function getAuctionSummary($auction_id) {
        $sql = 'SELECT a.auction_id, a.auction_description, a.auction_date,
                       COUNT(DISTINCT ai.item_id) as total_items,
                       COUNT(DISTINCT wb.item_id) as items_sold,
                       COUNT(DISTINCT ai.item_id) - COUNT(DISTINCT wb.item_id) as items_unsold,
                       COUNT(DISTINCT wb.bidder_id) as unique_bidders,
                       SUM(wb.winning_price * wb.quantity_won) as total_revenue,
                       AVG(wb.winning_price) as average_price,
                       MAX(wb.winning_price) as highest_price
                FROM auctions a
                LEFT JOIN auction_items ai ON a.auction_id = ai.auction_id
                LEFT JOIN winning_bids wb ON ai.auction_id = wb.auction_id AND ai.item_id = wb.item_id
                WHERE a.auction_id = :auction_id
                GROUP BY a.auction_id';
        
        return $this->db->fetch($sql, ['auction_id' => $auction_id]);
    }
    
    public function getBidderPayments($auction_id) {
        $sql = 'SELECT b.bidder_id, b.first_name, b.last_name, b.phone, b.email,
                       b.address1, b.address2, b.city, b.state, b.postal_code,
                       COUNT(wb.bid_id) as items_won,
                       SUM(wb.winning_price * wb.quantity_won) as total_payment
                FROM bidders b
                JOIN winning_bids wb ON b.bidder_id = wb.bidder_id
                WHERE wb.auction_id = :auction_id
                GROUP BY b.bidder_id
                ORDER BY b.last_name, b.first_name';
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id]);
    }
    
    public function getBidderDetails($auction_id, $bidder_id) {
        $sql = 'SELECT b.bidder_id, b.first_name, b.last_name, b.phone, b.email,
                       b.address1, b.address2, b.city, b.state, b.postal_code,
                       i.item_id, i.item_name, i.item_description,
                       wb.winning_price, wb.quantity_won,
                       (wb.winning_price * wb.quantity_won) as line_total
                FROM bidders b
                JOIN winning_bids wb ON b.bidder_id = wb.bidder_id
                JOIN items i ON wb.item_id = i.item_id
                WHERE wb.auction_id = :auction_id AND b.bidder_id = :bidder_id
                ORDER BY i.item_name';
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id, 'bidder_id' => $bidder_id]);
    }
    
    public function getItemResults($auction_id) {
        $sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity,
                       wb.winning_price, wb.quantity_won,
                       CASE WHEN b.first_name IS NULL THEN NULL ELSE CONCAT(b.first_name, " ", b.last_name) END as winner_name,
                       b.bidder_id, b.phone, b.email,
                       CASE WHEN wb.winning_price IS NULL THEN "UNSOLD" ELSE "SOLD" END as status
                FROM auction_items ai
                JOIN items i ON ai.item_id = i.item_id
                LEFT JOIN winning_bids wb ON ai.item_id = wb.item_id AND ai.auction_id = wb.auction_id
                LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
                WHERE ai.auction_id = :auction_id
                ORDER BY i.item_id';
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id]);
    }
    
    public function getUnsoldItems($auction_id) {
        $sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity
                FROM auction_items ai
                JOIN items i ON ai.item_id = i.item_id
                LEFT JOIN winning_bids wb ON ai.item_id = wb.item_id AND ai.auction_id = wb.auction_id
                WHERE ai.auction_id = :auction_id AND wb.item_id IS NULL
                ORDER BY i.item_name';
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id]);
    }
    
    public function generateCSV($data, $headers) {
        $csv = implode(',', $headers) . "\n";
        
        foreach ($data as $row) {
            $escapedRow = [];
            foreach ($row as $field) {
                if ($field === null) {
                    $escapedRow[] = '';
                } elseif (strpos($field, ',') !== false || strpos($field, '"') !== false) {
                    $escapedRow[] = '"' . str_replace('"', '""', $field) . '"';
                } else {
                    $escapedRow[] = $field;
                }
            }
            $csv .= implode(',', $escapedRow) . "\n";
        }
        
        return $csv;
    }
    
    public function exportBidderPayments($auction_id) {
        $payments = $this->getBidderPayments($auction_id);
        
        $headers = ['Bidder ID', 'First Name', 'Last Name', 'Phone', 'Email', 
                   'Address 1', 'Address 2', 'City', 'State', 'Postal Code', 
                   'Items Won', 'Total Payment'];
        
        return $this->generateCSV($payments, $headers);
    }
    
    public function exportItemResults($auction_id) {
        $items = $this->getItemResults($auction_id);
        
        $headers = ['Item ID', 'Item Name', 'Description', 'Quantity', 'Winning Price', 
                   'Quantity Won', 'Winner Name', 'Bidder ID', 'Phone', 'Email', 'Status'];
        
        return $this->generateCSV($items, $headers);
    }
    
    public function getTopPerformers($auction_id, $limit = 10) {
        $sql = 'SELECT i.item_name, wb.winning_price, 
                       CONCAT(b.first_name, " ", b.last_name) as winner_name
                FROM winning_bids wb
                JOIN items i ON wb.item_id = i.item_id
                JOIN bidders b ON wb.bidder_id = b.bidder_id
                WHERE wb.auction_id = :auction_id
                ORDER BY wb.winning_price DESC
                LIMIT ' . $limit;
        
        return $this->db->fetchAll($sql, ['auction_id' => $auction_id]);
    }
}
?>