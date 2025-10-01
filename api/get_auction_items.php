<?php
require_once '../config/config.php';
require_once '../classes/Auction.php';

requireLogin();

header('Content-Type: application/json');

$auction_id = $_GET['auction_id'] ?? '';

if (empty($auction_id)) {
    jsonResponse(['error' => 'Auction ID required'], 400);
}

try {
    $auction = new Auction();
    $items = $auction->getItemsForBidEntry($auction_id);
    
    jsonResponse([
        'success' => true,
        'items' => $items
    ]);
    
} catch (Exception $e) {
    jsonResponse(['error' => 'Failed to get auction items'], 500);
}
?>