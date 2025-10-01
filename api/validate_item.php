<?php
require_once '../config/config.php';
require_once '../classes/Database.php';

requireLogin();

header('Content-Type: application/json');

$item_id = $_GET['item_id'] ?? '';
$auction_id = $_GET['auction_id'] ?? '';

if (empty($item_id) || empty($auction_id)) {
    jsonResponse(['valid' => false, 'error' => 'Missing parameters'], 400);
}

try {
    $db = new Database();

    // Check if item exists in this auction
    $result = $db->fetch(
        'SELECT item_id FROM auction_items WHERE auction_id = :auction_id AND item_id = :item_id',
        ['auction_id' => $auction_id, 'item_id' => $item_id]
    );

    jsonResponse(['valid' => $result !== false]);

} catch (Exception $e) {
    error_log('Item validation error: ' . $e->getMessage());
    jsonResponse(['valid' => false, 'error' => 'Validation failed'], 500);
}
?>