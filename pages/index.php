<?php
require_once '../config/config.php';
require_once '../classes/Auction.php';
require_once '../classes/Bidder.php';
require_once '../classes/Item.php';

requireLogin();

$page_title = 'Dashboard';

$auction = new Auction();
$bidder = new Bidder();
$item = new Item();

// Get recent auctions
$recent_auctions = $auction->getAll(5);

// Get statistics
$total_auctions = $auction->getCount();
$total_bidders = $bidder->getCount();
$total_items = $item->getCount();

include '../includes/header.php';
?>

<div class="dashboard">
    <h2>Dashboard</h2>
    
    <div class="stats-grid">
        <div class="stat-card">
            <h3><?php echo $total_auctions; ?></h3>
            <p>Total Auctions</p>
            <a href="auctions.php">Manage →</a>
        </div>
        
        <div class="stat-card">
            <h3><?php echo $total_bidders; ?></h3>
            <p>Total Bidders</p>
            <a href="bidders.php">Manage →</a>
        </div>
        
        <div class="stat-card">
            <h3><?php echo $total_items; ?></h3>
            <p>Total Items</p>
            <a href="items.php">Manage →</a>
        </div>
        
        <div class="stat-card highlight">
            <h3>Fast Entry</h3>
            <p>Bid Entry</p>
            <a href="bid_entry.php">Start →</a>
        </div>
    </div>
    
    <div class="dashboard-sections">
        <section class="recent-auctions">
            <h3>Recent Auctions</h3>
            <?php if (empty($recent_auctions)): ?>
                <p>No auctions created yet. <a href="auctions.php">Create your first auction</a></p>
            <?php else: ?>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Items</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_auctions as $auc): ?>
                        <tr>
                            <td><?php echo $auc['auction_id']; ?></td>
                            <td><?php echo sanitize($auc['auction_description']); ?></td>
                            <td><?php echo date('M j, Y', strtotime($auc['auction_date'])); ?></td>
                            <td>
                                <span class="status status-<?php echo $auc['status']; ?>">
                                    <?php echo ucfirst($auc['status']); ?>
                                </span>
                            </td>
                            <td><?php echo $auc['item_count']; ?></td>
                            <td>
                                <a href="auctions.php?action=edit&id=<?php echo $auc['auction_id']; ?>">Edit</a>
                                <?php if ($auc['item_count'] > 0 && $auc['status'] !== 'completed'): ?>
                                    | <a href="bid_entry.php?auction_id=<?php echo $auc['auction_id']; ?>">Enter Bids</a>
                                <?php endif; ?>
                                <?php if ($auc['bid_count'] > 0): ?>
                                    | <a href="reports.php?auction_id=<?php echo $auc['auction_id']; ?>">Reports</a>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </section>
    </div>
    
    <div class="quick-actions">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
            <a href="bidders.php?action=add" class="btn btn-primary">Add Bidder</a>
            <a href="items.php?action=add" class="btn btn-primary">Add Item</a>
            <a href="auctions.php?action=add" class="btn btn-primary">Create Auction</a>
            <a href="bid_entry.php" class="btn btn-highlight">Enter Bids</a>
        </div>
    </div>
</div>

<?php include '../includes/footer.php'; ?>