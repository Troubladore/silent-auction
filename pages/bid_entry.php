<?php
require_once '../config/config.php';
require_once '../classes/Auction.php';
require_once '../classes/Bidder.php';
require_once '../classes/Item.php';

requireLogin();

$page_title = 'Fast Bid Entry';
$auction = new Auction();
$bidder = new Bidder();
$item = new Item();

$auction_id = $_GET['auction_id'] ?? '';
$selected_auction = null;
$auction_items = [];

if ($auction_id) {
    $selected_auction = $auction->getWithStats($auction_id);
    if ($selected_auction) {
        $auction_items = $auction->getItemsForBidEntry($auction_id);
    }
}

// Get all auctions for dropdown
$auctions = $auction->getAll(100);

include '../includes/header.php';
?>

<div class="bid-entry-page">
    <div class="page-header">
        <h2>Fast Bid Entry</h2>
        <div class="entry-help">
            <strong>Shortcuts:</strong> Enter = Save Bid | Tab = Next Field | F5 = Skip Item | Esc = Clear Form
        </div>
    </div>
    
    <?php if (!$auction_id): ?>
        <!-- Auction Selection -->
        <div class="auction-selector">
            <h3>Select Auction</h3>
            <?php if (empty($auctions)): ?>
                <p>No auctions available. <a href="auctions.php?action=add">Create an auction first</a>.</p>
            <?php else: ?>
                <div class="auction-list">
                    <?php foreach ($auctions as $auc): ?>
                    <div class="auction-card <?php echo $auc['status']; ?>">
                        <h4><?php echo sanitize($auc['auction_description']); ?></h4>
                        <p>
                            Date: <?php echo date('M j, Y', strtotime($auc['auction_date'])); ?> | 
                            Status: <?php echo ucfirst($auc['status']); ?> | 
                            Items: <?php echo $auc['item_count']; ?> | 
                            Bids: <?php echo $auc['bid_count']; ?>
                        </p>
                        <?php if ($auc['item_count'] > 0): ?>
                            <a href="bid_entry.php?auction_id=<?php echo $auc['auction_id']; ?>" class="btn btn-primary">Start Bid Entry</a>
                        <?php else: ?>
                            <span class="text-muted">No items in auction</span>
                        <?php endif; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        
    <?php else: ?>
        <!-- Bid Entry Interface -->
        <div class="bid-entry-interface">
            <div class="auction-header">
                <h3>Auction #<?php echo $selected_auction['auction_id']; ?>: <?php echo sanitize($selected_auction['auction_description']); ?></h3>
                <div class="auction-stats">
                    <span id="progress-text">0 of <?php echo count($auction_items); ?> items processed</span> |
                    <span>Total Revenue: <span id="running-total">$0.00</span></span>
                </div>
            </div>
            
            <div class="progress-bar">
                <div id="progress-fill" style="width: 0%"></div>
            </div>
            
            <div class="entry-form-container">
                <form id="bid-form" class="bid-entry-form">
                    <input type="hidden" id="auction-id" value="<?php echo $auction_id; ?>">
                    <input type="hidden" id="current-item-index" value="0">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="bidder-id">Bidder ID:</label>
                            <input type="number" id="bidder-id" name="bidder_id" min="1" autocomplete="off">
                            <div id="bidder-lookup" class="lookup-result"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="item-display">Item:</label>
                            <div id="item-display" class="item-display">
                                <div id="item-info">Select an item...</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="winning-price">Winning Price:</label>
                            <div class="currency-input">
                                <span class="currency-symbol">$</span>
                                <input type="number" id="winning-price" name="winning_price" 
                                       min="0" step="0.01" placeholder="0.00" autocomplete="off">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="quantity-won">Quantity:</label>
                            <input type="number" id="quantity-won" name="quantity_won" 
                                   min="1" value="1" autocomplete="off">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" id="save-bid" class="btn btn-primary btn-large">
                            SAVE BID (Enter)
                        </button>
                        <button type="button" id="skip-item" class="btn btn-secondary">
                            SKIP ITEM (F5)
                        </button>
                        <button type="button" id="clear-form" class="btn btn-outline">
                            CLEAR (Esc)
                        </button>
                    </div>
                </form>
            </div>
            
            <div class="item-navigation">
                <div class="nav-buttons">
                    <button type="button" id="prev-item" class="btn btn-outline">← Previous</button>
                    <button type="button" id="next-item" class="btn btn-outline">Next →</button>
                </div>
                
                <div class="item-list">
                    <h4>Items (click to jump):</h4>
                    <div id="item-buttons">
                        <?php foreach ($auction_items as $index => $item): ?>
                        <button type="button" class="item-btn <?php echo $item['winning_price'] ? 'has-bid' : ''; ?>" 
                                data-index="<?php echo $index; ?>" data-item-id="<?php echo $item['item_id']; ?>">
                            #<?php echo $item['item_id']; ?>
                            <?php if ($item['winning_price']): ?>
                                <span class="bid-indicator">✓</span>
                            <?php endif; ?>
                        </button>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            
            <div class="recent-entries">
                <h4>Recent Entries:</h4>
                <div id="recent-list">
                    <!-- Populated by JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Item data for JavaScript -->
        <script>
        const auctionItems = <?php echo json_encode($auction_items); ?>;
        </script>
        
        <a href="bid_entry.php" class="btn btn-secondary back-link">← Select Different Auction</a>
    <?php endif; ?>
</div>

<?php include '../includes/footer.php'; ?>