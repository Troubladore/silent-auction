<?php
require_once '../config/config.php';
require_once '../classes/Database.php';

requireLogin();
header('Content-Type: application/json');

$item_id = $_GET['item_id'] ?? '';
$auction_id = $_GET['auction_id'] ?? '';

if (empty($item_id) || empty($auction_id)) {
    jsonResponse(['error' => 'Item ID and Auction ID required'], 400);
}

try {
    $db = new Database();

    // Get item's total quantity
    $item = $db->fetch(
        'SELECT item_quantity FROM items WHERE item_id = :item_id',
        ['item_id' => $item_id]
    );

    if (!$item) {
        jsonResponse(['error' => 'Item not found'], 404);
    }

    $total_quantity = $item['item_quantity'];

    // Get sum of quantities already allocated in bids for this auction
    $allocated = $db->fetch(
        'SELECT COALESCE(SUM(quantity_won), 0) as allocated
         FROM winning_bids
         WHERE item_id = :item_id AND auction_id = :auction_id',
        [
            'item_id' => $item_id,
            'auction_id' => $auction_id
        ]
    );

    $allocated_quantity = $allocated['allocated'];
    $available_quantity = $total_quantity - $allocated_quantity;

    // Get existing bids for this item in this auction
    $bids = $db->fetchAll(
        'SELECT wb.bid_id, wb.bidder_id, wb.winning_price, wb.quantity_won, wb.created_at,
                b.first_name, b.last_name
         FROM winning_bids wb
         LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
         WHERE wb.item_id = :item_id AND wb.auction_id = :auction_id
         ORDER BY wb.created_at DESC',
        [
            'item_id' => $item_id,
            'auction_id' => $auction_id
        ]
    );

    // Format bids
    $formatted_bids = array_map(function($bid) {
        return [
            'bid_id' => $bid['bid_id'],
            'bidder_id' => $bid['bidder_id'],
            'bidder_name' => trim($bid['first_name'] . ' ' . $bid['last_name']),
            'winning_price' => $bid['winning_price'],
            'quantity_won' => $bid['quantity_won'],
            'created_at' => $bid['created_at']
        ];
    }, $bids);

    jsonResponse([
        'total_quantity' => $total_quantity,
        'allocated_quantity' => $allocated_quantity,
        'available_quantity' => $available_quantity,
        'existing_bids' => $formatted_bids,
        'can_add_bid' => $available_quantity > 0
    ]);

} catch (Exception $e) {
    error_log('Check inventory error: ' . $e->getMessage());
    jsonResponse(['error' => 'Failed to check inventory: ' . $e->getMessage()], 500);
}
?>
