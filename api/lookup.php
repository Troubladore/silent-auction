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
    error_log("LOOKUP API CALLED: type=$type, term=$term");
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
        $auction_id = $_GET['auction_id'] ?? '';

        // WATERMARK: Code version 2025-09-30-v2
        error_log('WATERMARK: Item lookup code version 2025-09-30-v2 is running');

        if (empty($auction_id)) {
            // Auction ID is required for item searches to ensure only auction items are shown
            jsonResponse(['error' => 'Auction ID required for item search', 'results' => []], 400);
        }

        // Search only items that are part of the specified auction
        // Build SQL dynamically based on whether term is numeric
        error_log("Item lookup: term=$term, is_numeric=" . (is_numeric($term) ? 'YES' : 'NO') . ", auction_id=$auction_id");
        if (is_numeric($term)) {
            // When searching with numbers, match:
            // 1. Exact item_id match (highest priority - shows first)
            // 2. Partial item_id match (e.g., "1" matches "16", "17", "100")
            // 3. Name or description contains the number
            $sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity
                    FROM items i
                    JOIN auction_items ai ON i.item_id = ai.item_id
                    WHERE ai.auction_id = :auction_id AND (
                        i.item_name LIKE :term1 OR
                        i.item_description LIKE :term2 OR
                        i.item_id = :exact_id OR
                        CAST(i.item_id AS CHAR) LIKE :item_id_pattern
                    )
                    ORDER BY
                        CASE WHEN i.item_id = :exact_id2 THEN 1
                             WHEN CAST(i.item_id AS CHAR) LIKE :item_id_pattern2 THEN 2
                             ELSE 3 END,
                        i.item_name
                    LIMIT 10';

            $params = [
                'auction_id' => $auction_id,
                'term1' => '%' . $term . '%',
                'term2' => '%' . $term . '%',
                'exact_id' => $term,
                'exact_id2' => $term,
                'item_id_pattern' => $term . '%',  // Starts with term (e.g., "1" matches "16", "17", "100")
                'item_id_pattern2' => $term . '%'
            ];
        } else {
            $sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity
                    FROM items i
                    JOIN auction_items ai ON i.item_id = ai.item_id
                    WHERE ai.auction_id = :auction_id AND (
                        i.item_name LIKE :term1 OR
                        i.item_description LIKE :term2
                    )
                    ORDER BY i.item_name
                    LIMIT 10';

            $params = [
                'auction_id' => $auction_id,
                'term1' => '%' . $term . '%',
                'term2' => '%' . $term . '%'
            ];
        }

        $db = new Database();
        $results = $db->fetchAll($sql, $params);
        
        $formatted = array_map(function($i) {
            return [
                'id' => $i['item_id'],
                'name' => $i['item_name'],
                'description' => $i['item_description'] ?? '',
                'quantity' => $i['item_quantity'],
                'display' => $i['item_name'] . ' (#' . $i['item_id'] . ')'
            ];
        }, $results);
        
        jsonResponse(['results' => $formatted]);
        
    } else {
        jsonResponse(['error' => 'Invalid lookup type'], 400);
    }
} catch (Exception $e) {
    error_log('Lookup API error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    jsonResponse(['error' => 'Lookup failed: ' . $e->getMessage()], 500);
}
?>