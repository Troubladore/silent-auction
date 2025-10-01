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
            <strong>Shortcuts:</strong> Enter = Save Bid | F6 = No Bid | Tab = Next Field | F5 = Skip Item | Esc = Clear Form
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
                            <label for="item-id">Item (ID or Name):</label>
                            <input type="text" id="item-id" name="item_id" placeholder="Enter item ID or name..." autocomplete="off">
                            <div id="item-lookup" class="lookup-result"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="bidder-id">Bidder (ID or Name):</label>
                            <input type="text" id="bidder-id" name="bidder_id" placeholder="Enter bidder ID or name..." autocomplete="off">
                            <div id="bidder-lookup" class="lookup-result"></div>
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
                        <button type="button" id="no-bid" class="btn btn-warning">
                            NO BID (F6)
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
            
            <div class="item-status-section">
                <h4>Auction Items Status <span id="completion-stats">(0 of <?php echo count($auction_items); ?> completed)</span></h4>
                <div class="status-legend">
                    <span class="legend-item"><span class="status-indicator pending"></span> Not Entered</span>
                    <span class="legend-item"><span class="status-indicator completed"></span> Has Bid</span>
                    <span class="legend-item"><span class="status-indicator no-bid"></span> No Bid</span>
                    <span class="legend-item"><span class="status-indicator multiple"></span> Multiple Winners</span>
                </div>
                <div id="item-status-grid" class="item-status-grid">
                    <?php foreach ($auction_items as $item): ?>
                    <?php 
                        $hasMultipleWinners = ($item['winner_count'] ?? 0) > 1;
                        $isNoBid = $item['bidder_id'] == 0;
                        $hasBid = $item['winning_price'] && $item['bidder_id'] && !$isNoBid;
                        
                        $cardClass = $hasBid ? 'has-bid' : 'no-bid';
                        $statusClass = $isNoBid ? 'no-bid' : ($hasBid ? ($hasMultipleWinners ? 'multiple' : 'completed') : 'pending');
                    ?>
                    <div class="item-status-card <?php echo $cardClass; ?>" 
                         data-item-id="<?php echo $item['item_id']; ?>"
                         title="Click to edit this item's bid">
                        <div class="item-header">
                            <span class="item-id">#<?php echo $item['item_id']; ?></span>
                            <span class="status-indicator <?php echo $statusClass; ?>"></span>
                        </div>
                        <div class="item-name"><?php echo sanitize($item['item_name']); ?></div>
                        
                        <?php if ($isNoBid): ?>
                        <div class="no-bid-info">
                            <span class="no-bid-text">No Bid</span>
                        </div>
                        
                        <?php elseif ($hasBid): ?>
                        <div class="bid-info">
                            <div class="winner" <?php if ($hasMultipleWinners): ?>style="font-weight: bold;"<?php endif; ?>>
                                <?php echo sanitize($item['winner_name'] ?: 'ID ' . $item['bidder_id']); ?>
                            </div>
                            <div class="price">
                                <?php if ($hasMultipleWinners): ?>
                                    Avg: $<?php echo number_format($item['winning_price'], 2); ?>
                                <?php else: ?>
                                    $<?php echo number_format($item['winning_price'], 2); ?>
                                <?php endif; ?>
                            </div>
                            <?php if ($item['quantity_won'] > 1): ?>
                                <div class="quantity">Qty: <?php echo $item['quantity_won']; ?></div>
                            <?php endif; ?>
                        </div>
                        
                        <?php else: ?>
                        <div class="no-bid-info">
                            <span class="quantity-available"><?php echo $item['item_quantity']; ?> available</span>
                        </div>
                        <?php endif; ?>
                    </div>
                    <?php endforeach; ?>
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
        window.auctionItems = <?php echo json_encode($auction_items); ?>;
        console.log('DEBUG: auction_id = <?php echo $auction_id; ?>');
        console.log('DEBUG: selected_auction = ', <?php echo json_encode($selected_auction); ?>);
        console.log('DEBUG: auction_items = ', window.auctionItems);
        console.log('DEBUG: auction_items length = ', window.auctionItems ? window.auctionItems.length : 'NULL');
        </script>
        
        <a href="bid_entry.php" class="btn btn-secondary back-link">← Select Different Auction</a>
        
        <!-- Debug Panel (hidden by default) -->
        <div id="debug-panel" style="display: none; margin-top: 20px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">
            <h4>Debug Information</h4>
            <button type="button" onclick="window.bidEntryInstance?.downloadActivityLog()">Download Activity Log</button>
            <button type="button" onclick="toggleDebugInfo()">Toggle Debug Info</button>
            <div id="debug-info" style="margin-top: 10px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; background: white; padding: 10px; border: 1px solid #ccc;"></div>
        </div>
        
        <!-- Debug Panel Toggle (always visible) -->
        <button type="button" onclick="toggleDebugPanel()" style="position: fixed; bottom: 10px; right: 10px; background: #007cba; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-size: 11px; z-index: 1001;">
            Debug
        </button>
        
        <script>
        function toggleDebugPanel() {
            const panel = document.getElementById('debug-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
        
        function toggleDebugInfo() {
            const info = document.getElementById('debug-info');
            if (window.bidEntryInstance) {
                const log = window.bidEntryInstance.getActivityLog();
                info.innerHTML = '<pre>' + JSON.stringify(log, null, 2) + '</pre>';
            }
        }
        
        // Auto-refresh debug info every 2 seconds when visible
        setInterval(() => {
            const info = document.getElementById('debug-info');
            const panel = document.getElementById('debug-panel');
            if (panel.style.display === 'block' && info.innerHTML && window.bidEntryInstance) {
                const log = window.bidEntryInstance.getActivityLog().slice(-10); // Last 10 entries
                info.innerHTML = '<pre>' + JSON.stringify(log, null, 2) + '</pre>';
            }
        }, 2000);
        </script>
        
    <?php endif; ?>
</div>

<?php include '../includes/footer.php'; ?>