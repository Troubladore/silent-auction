<?php
require_once '../config/config.php';
require_once '../classes/Item.php';

requireLogin();

header('Content-Type: application/json');

$term = $_GET['term'] ?? '';
$auction_id = $_GET['auction_id'] ?? '';

if (empty($term)) {
    jsonResponse(['error' => 'Search term required'], 400);
}

if (empty($auction_id)) {
    jsonResponse(['error' => 'Auction ID required'], 400);
}

try {
    $item = new Item();
    
    // Get items that are part of the specified auction
    $sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity
            FROM items i 
            JOIN auction_items ai ON i.item_id = ai.item_id
            WHERE ai.auction_id = :auction_id AND (
                i.item_name LIKE :term OR 
                i.item_description LIKE :term OR 
                i.item_id = :exact_id
            )
            ORDER BY 
                CASE WHEN i.item_id = :exact_id2 THEN 1 ELSE 2 END,
                i.item_name 
            LIMIT 10';
    
    $params = [
        'auction_id' => $auction_id,
        'term' => '%' . $term . '%'
    ];
    
    if (is_numeric($term)) {
        $params['exact_id'] = $term;
        $params['exact_id2'] = $term;
    } else {
        $params['exact_id'] = -1;
        $params['exact_id2'] = -1;
    }
    
    $db = new Database();
    $items = $db->fetchAll($sql, $params);
    
    jsonResponse(['items' => $items]);
    
} catch (Exception $e) {
    error_log('Item lookup error: ' . $e->getMessage());
    jsonResponse(['error' => 'Failed to search items'], 500);
}
?>