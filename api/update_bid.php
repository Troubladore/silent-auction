<?php
require_once '../config/config.php';
require_once '../classes/Database.php';

requireLogin();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

$action = $data['action'] ?? ''; // 'update' or 'delete'
$bid_id = $data['bid_id'] ?? '';

if (empty($action) || empty($bid_id)) {
    jsonResponse(['error' => 'Action and Bid ID required'], 400);
}

try {
    $db = new Database();

    if ($action === 'delete') {
        // Delete the bid
        $db->delete('winning_bids', 'bid_id = :bid_id', ['bid_id' => $bid_id]);

        jsonResponse([
            'success' => true,
            'message' => 'Bid deleted successfully'
        ]);

    } elseif ($action === 'update') {
        $bidder_id = $data['bidder_id'] ?? '';
        $winning_price = $data['winning_price'] ?? null;
        $quantity_won = $data['quantity_won'] ?? '';

        if (empty($bidder_id) || empty($quantity_won)) {
            jsonResponse(['error' => 'Bidder ID and Quantity required'], 400);
        }

        // Validate quantity is positive integer
        if (!is_numeric($quantity_won) || $quantity_won <= 0) {
            jsonResponse(['error' => 'Quantity must be a positive number'], 400);
        }

        // Get the bid's item_id and auction_id to check inventory
        $existing_bid = $db->fetch(
            'SELECT item_id, auction_id, quantity_won as old_quantity
             FROM winning_bids
             WHERE bid_id = :bid_id',
            ['bid_id' => $bid_id]
        );

        if (!$existing_bid) {
            jsonResponse(['error' => 'Bid not found'], 404);
        }

        // Check if new quantity is available
        $item_id = $existing_bid['item_id'];
        $auction_id = $existing_bid['auction_id'];
        $old_quantity = $existing_bid['old_quantity'];
        $quantity_change = $quantity_won - $old_quantity;

        if ($quantity_change > 0) {
            // Increasing quantity - need to check availability
            $item = $db->fetch(
                'SELECT item_quantity FROM items WHERE item_id = :item_id',
                ['item_id' => $item_id]
            );

            $allocated = $db->fetch(
                'SELECT COALESCE(SUM(quantity_won), 0) as allocated
                 FROM winning_bids
                 WHERE item_id = :item_id AND auction_id = :auction_id',
                [
                    'item_id' => $item_id,
                    'auction_id' => $auction_id
                ]
            );

            $total_quantity = $item['item_quantity'];
            $current_allocated = $allocated['allocated'];
            $available = $total_quantity - $current_allocated + $old_quantity; // Add back this bid's old quantity

            if ($quantity_won > $available) {
                jsonResponse([
                    'error' => "Only {$available} available in inventory",
                    'available' => $available
                ], 400);
            }
        }

        // Update the bid
        $update_data = [
            'bidder_id' => $bidder_id,
            'quantity_won' => $quantity_won
        ];

        if ($winning_price !== null && $winning_price !== '') {
            $update_data['winning_price'] = $winning_price;
        }

        $db->update('winning_bids', $update_data, 'bid_id = :bid_id', ['bid_id' => $bid_id]);

        jsonResponse([
            'success' => true,
            'message' => 'Bid updated successfully'
        ]);

    } else {
        jsonResponse(['error' => 'Invalid action'], 400);
    }

} catch (Exception $e) {
    error_log('Update bid error: ' . $e->getMessage());
    jsonResponse(['error' => 'Failed to update bid: ' . $e->getMessage()], 500);
}
?>
