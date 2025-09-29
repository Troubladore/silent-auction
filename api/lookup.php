<?php
require_once '../config/config.php';
require_once '../classes/Bidder.php';
require_once '../classes/Item.php';

requireLogin();

header('Content-Type: application/json');

$type = $_GET['type'] ?? '';
$term = $_GET['term'] ?? '';

if (empty($term)) {
    jsonResponse(['results' => []]);
}

try {
    if ($type === 'bidder') {
        $bidder = new Bidder();
        $results = $bidder->search($term);
        
        $formatted = array_map(function($b) {
            return [
                'id' => $b['bidder_id'],
                'name' => $b['name'],
                'phone' => formatPhone($b['phone']),
                'email' => $b['email'],
                'display' => $b['name'] . ' (' . $b['bidder_id'] . ')'
            ];
        }, $results);
        
        jsonResponse(['results' => $formatted]);
        
    } elseif ($type === 'item') {
        $item = new Item();
        $results = $item->search($term);
        
        $formatted = array_map(function($i) {
            return [
                'id' => $i['item_id'],
                'name' => $i['item_name'],
                'description' => $i['item_description'],
                'quantity' => $i['item_quantity'],
                'display' => $i['item_name'] . ' (' . $i['item_id'] . ')'
            ];
        }, $results);
        
        jsonResponse(['results' => $formatted]);
        
    } else {
        jsonResponse(['error' => 'Invalid lookup type'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['error' => 'Lookup failed'], 500);
}
?>