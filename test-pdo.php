<?php
require_once 'config/config.php';

$term = '57';
$auction_id = 80;

$sql = 'SELECT i.item_id, i.item_name, i.item_description, i.item_quantity
        FROM items i
        JOIN auction_items ai ON i.item_id = ai.item_id
        WHERE ai.auction_id = :auction_id AND (
            i.item_name LIKE :term1 OR
            i.item_description LIKE :term2 OR
            i.item_id = :exact_id
        )
        ORDER BY
            CASE WHEN i.item_id = :exact_id2 THEN 1 ELSE 2 END,
            i.item_name
        LIMIT 10';

$params = [
    'auction_id' => $auction_id,
    'term1' => '%' . $term . '%',
    'term2' => '%' . $term . '%',
    'exact_id' => $term,
    'exact_id2' => $term
];

echo "SQL: " . $sql . "\n\n";
echo "Params: " . print_r($params, true) . "\n\n";

try {
    $pdo = getConnection();
    $stmt = $pdo->prepare($sql);

    echo "Statement prepared successfully\n";

    $stmt->execute($params);

    echo "Statement executed successfully\n";

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Results: " . print_r($results, true) . "\n";

} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>
