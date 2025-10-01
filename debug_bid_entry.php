<?php
// Debug script to test bid entry data loading
require_once 'config/config.php';
require_once 'classes/Auction.php';

// Create test session
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['username'] = 'test';

$auction = new Auction();

// Get all auctions 
echo "<h2>All Auctions:</h2>\n";
$auctions = $auction->getAll(10);
foreach ($auctions as $auc) {
    echo "ID: {$auc['auction_id']}, Description: {$auc['auction_description']}, Items: {$auc['item_count']}<br>\n";
    
    if ($auc['item_count'] > 0) {
        echo "<h3>Items for Auction {$auc['auction_id']}:</h3>\n";
        $items = $auction->getItemsForBidEntry($auc['auction_id']);
        if (empty($items)) {
            echo "No items returned from getItemsForBidEntry()<br>\n";
        } else {
            foreach ($items as $item) {
                echo "- Item ID: {$item['item_id']}, Name: {$item['item_name']}<br>\n";
            }
        }
        echo "<hr>\n";
    }
}

// Test if we have any auction-item associations
echo "<h2>Auction-Item Associations:</h2>\n";
$db = new Database();
$associations = $db->fetchAll('SELECT ai.auction_id, ai.item_id, i.item_name FROM auction_items ai JOIN items i ON ai.item_id = i.item_id ORDER BY ai.auction_id');
foreach ($associations as $assoc) {
    echo "Auction {$assoc['auction_id']} has Item {$assoc['item_id']}: {$assoc['item_name']}<br>\n";
}
?>