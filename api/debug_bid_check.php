<?php
require_once '../config/config.php';
requireLogin();

header('Content-Type: application/json');

$auction_id = $_GET['auction_id'] ?? null;

if (!$auction_id) {
    jsonResponse(['error' => 'auction_id required'], 400);
}

try {
    $db = new Database();
    
    // Get current bids from database
    $bids = $db->fetchAll('
        SELECT 
            wb.auction_id,
            wb.item_id,
            wb.bidder_id,
            wb.winning_price,
            wb.quantity_won,
            wb.created_at,
            wb.updated_at,
            i.item_name,
            CONCAT(b.first_name, " ", b.last_name) as bidder_name
        FROM winning_bids wb
        JOIN items i ON wb.item_id = i.item_id  
        LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
        WHERE wb.auction_id = :auction_id
        ORDER BY wb.updated_at DESC
    ', ['auction_id' => $auction_id]);
    
    // Get auction items (what should be loaded)
    $items = $db->fetchAll('
        SELECT 
            ai.auction_id,
            ai.item_id,
            i.item_name,
            i.item_description,
            i.item_quantity,
            wb.bidder_id,
            wb.winning_price,
            wb.quantity_won,
            CONCAT(b.first_name, " ", b.last_name) as winner_name
        FROM auction_items ai
        JOIN items i ON ai.item_id = i.item_id
        LEFT JOIN winning_bids wb ON ai.auction_id = wb.auction_id AND ai.item_id = wb.item_id
        LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
        WHERE ai.auction_id = :auction_id
        ORDER BY ai.item_id
    ', ['auction_id' => $auction_id]);
    
    // Get auction info
    $auction = $db->fetch('SELECT * FROM auctions WHERE auction_id = :id', ['id' => $auction_id]);
    
    jsonResponse([
        'auction_id' => $auction_id,
        'timestamp' => date('Y-m-d H:i:s'),
        'auction' => $auction,
        'current_bids' => $bids,
        'auction_items' => $items,
        'bid_count' => count($bids),
        'item_count' => count($items),
        'debug_info' => [
            'php_session_id' => session_id(),
            'user_authenticated' => isLoggedIn(),
            'database_connection' => $db ? 'OK' : 'FAILED'
        ]
    ]);
    
} catch (Exception $e) {
    jsonResponse([
        'error' => 'Database query failed',
        'message' => $e->getMessage(),
        'auction_id' => $auction_id
    ], 500);
}
?>