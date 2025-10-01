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
$action = $input['action'] ?? 'save'; // 'save', 'update', or 'delete'
$no_bid = $input['no_bid'] ?? false; // Flag for no-bid entries


// Validate required fields for save
if ($action === 'save' || $action === 'update') {
    if (empty($auction_id) || empty($item_id)) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }

    // Verify item belongs to this auction
    require_once '../classes/Database.php';
    $db = new Database();
    $itemInAuction = $db->fetch(
        'SELECT item_id FROM auction_items WHERE auction_id = :auction_id AND item_id = :item_id',
        ['auction_id' => $auction_id, 'item_id' => $item_id]
    );

    if (!$itemInAuction) {
        jsonResponse(['error' => 'Item #' . $item_id . ' is not part of this auction'], 400);
    }

    // For no-bid entries, allow null bidder and price
    if (!$no_bid) {
        if (empty($bidder_id)) {
            jsonResponse(['error' => 'Bidder ID required for bid entries'], 400);
        }

        if ($winning_price <= 0) {
            jsonResponse(['error' => 'Winning price must be greater than 0'], 400);
        }

        if ($quantity_won < 1) {
            jsonResponse(['error' => 'Quantity must be at least 1'], 400);
        }
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
    
    if ($action === 'save' || $action === 'update') {
        $result = $auction->saveBid($auction_id, $item_id, $bidder_id, $winning_price, $quantity_won, $no_bid);
    } else {
        $result = $auction->deleteBid($auction_id, $item_id);
    }
    
    if ($result['success']) {
        // Get updated auction stats
        $stats = $auction->getWithStats($auction_id);
        
        jsonResponse([
            'success' => true,
            'message' => ($action === 'save' || $action === 'update') ? 'Bid saved successfully' : 'Bid deleted successfully',
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