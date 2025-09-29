<?php
require_once '../config/config.php';
require_once '../classes/Auction.php';

requireLogin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'POST method required'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);

$auction_id = $input['auction_id'] ?? null;
$item_id = $input['item_id'] ?? null;
$bidder_id = $input['bidder_id'] ?? null;
$winning_price = $input['winning_price'] ?? null;
$quantity_won = $input['quantity_won'] ?? 1;
$action = $input['action'] ?? 'save'; // 'save' or 'delete'

// Validate required fields for save
if ($action === 'save') {
    if (empty($auction_id) || empty($item_id) || empty($bidder_id)) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    if ($winning_price <= 0) {
        jsonResponse(['error' => 'Winning price must be greater than 0'], 400);
    }
    
    if ($quantity_won < 1) {
        jsonResponse(['error' => 'Quantity must be at least 1'], 400);
    }
}

// Validate required fields for delete
if ($action === 'delete') {
    if (empty($auction_id) || empty($item_id)) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
}

try {
    $auction = new Auction();
    
    if ($action === 'save') {
        $result = $auction->saveBid($auction_id, $item_id, $bidder_id, $winning_price, $quantity_won);
    } else {
        $result = $auction->deleteBid($auction_id, $item_id);
    }
    
    if ($result['success']) {
        // Get updated auction stats
        $stats = $auction->getWithStats($auction_id);
        
        jsonResponse([
            'success' => true,
            'message' => $action === 'save' ? 'Bid saved successfully' : 'Bid deleted successfully',
            'stats' => [
                'total_revenue' => $stats['total_revenue'] ?? 0,
                'bid_count' => $stats['bid_count'] ?? 0
            ]
        ]);
    } else {
        jsonResponse(['error' => implode(', ', $result['errors'])], 400);
    }
    
} catch (Exception $e) {
    error_log('Bid save error: ' . $e->getMessage());
    jsonResponse(['error' => 'Failed to save bid'], 500);
}
?>