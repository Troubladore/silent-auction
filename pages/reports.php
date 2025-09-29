<?php
require_once '../config/config.php';
require_once '../classes/Auction.php';
require_once '../classes/Report.php';

requireLogin();

$page_title = 'Reports';
$auction = new Auction();
$report = new Report();

$auction_id = $_GET['auction_id'] ?? '';
$report_type = $_GET['type'] ?? 'summary';
$bidder_id = $_GET['bidder_id'] ?? '';
$export = $_GET['export'] ?? '';

$selected_auction = null;
$auctions = $auction->getAll(100);

if ($auction_id) {
    $selected_auction = $auction->getWithStats($auction_id);
}

// Handle exports
if ($export && $auction_id) {
    if ($export === 'bidder_payments') {
        $csv = $report->exportBidderPayments($auction_id);
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="auction_' . $auction_id . '_bidder_payments.csv"');
        echo $csv;
        exit;
    } elseif ($export === 'item_results') {
        $csv = $report->exportItemResults($auction_id);
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="auction_' . $auction_id . '_item_results.csv"');
        echo $csv;
        exit;
    }
}

include '../includes/header.php';
?>

<div class="reports-page">
    <div class="page-header">
        <h2>Reports</h2>
        <?php if ($selected_auction): ?>
            <div class="auction-context">
                <h3><?php echo sanitize($selected_auction['auction_description']); ?></h3>
                <p>Date: <?php echo date('M j, Y', strtotime($selected_auction['auction_date'])); ?> | 
                   Items: <?php echo $selected_auction['item_count']; ?> | 
                   Revenue: <?php echo formatCurrency($selected_auction['total_revenue'] ?? 0); ?></p>
            </div>
        <?php endif; ?>
    </div>
    
    <?php if (!$auction_id): ?>
        <!-- Auction Selection -->
        <div class="auction-selector">
            <h3>Select Auction for Reports</h3>
            <?php if (empty($auctions)): ?>
                <p>No auctions available. <a href="auctions.php?action=add">Create an auction first</a>.</p>
            <?php else: ?>
                <div class="auction-list">
                    <?php foreach ($auctions as $auc): ?>
                    <div class="auction-card">
                        <h4><?php echo sanitize($auc['auction_description']); ?></h4>
                        <p>
                            Date: <?php echo date('M j, Y', strtotime($auc['auction_date'])); ?> | 
                            Items: <?php echo $auc['item_count']; ?> | 
                            Bids: <?php echo $auc['bid_count']; ?>
                            <?php if ($auc['total_revenue']): ?>
                                | Revenue: <?php echo formatCurrency($auc['total_revenue']); ?>
                            <?php endif; ?>
                        </p>
                        <?php if ($auc['bid_count'] > 0): ?>
                            <a href="reports.php?auction_id=<?php echo $auc['auction_id']; ?>" class="btn btn-primary">View Reports</a>
                        <?php else: ?>
                            <span class="text-muted">No bids to report</span>
                        <?php endif; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        
    <?php else: ?>
        <!-- Report Navigation -->
        <div class="report-nav">
            <a href="reports.php?auction_id=<?php echo $auction_id; ?>&type=summary" 
               class="btn <?php echo $report_type === 'summary' ? 'btn-primary' : 'btn-outline'; ?>">Summary</a>
            <a href="reports.php?auction_id=<?php echo $auction_id; ?>&type=bidder_payments" 
               class="btn <?php echo $report_type === 'bidder_payments' ? 'btn-primary' : 'btn-outline'; ?>">Bidder Payments</a>
            <a href="reports.php?auction_id=<?php echo $auction_id; ?>&type=item_results" 
               class="btn <?php echo $report_type === 'item_results' ? 'btn-primary' : 'btn-outline'; ?>">Item Results</a>
            <a href="reports.php?auction_id=<?php echo $auction_id; ?>&type=unsold" 
               class="btn <?php echo $report_type === 'unsold' ? 'btn-primary' : 'btn-outline'; ?>">Unsold Items</a>
        </div>
        
        <!-- Report Content -->
        <?php if ($report_type === 'summary'): ?>
            <?php $summary = $report->getAuctionSummary($auction_id); ?>
            <div class="report-summary">
                <h3>Auction Summary</h3>
                
                <div class="summary-stats">
                    <div class="stat-block">
                        <h4>Items</h4>
                        <div class="stat-large"><?php echo $summary['total_items']; ?></div>
                        <div class="stat-detail">
                            <?php echo $summary['items_sold']; ?> sold, 
                            <?php echo $summary['items_unsold']; ?> unsold
                        </div>
                    </div>
                    
                    <div class="stat-block">
                        <h4>Revenue</h4>
                        <div class="stat-large"><?php echo formatCurrency($summary['total_revenue'] ?? 0); ?></div>
                        <div class="stat-detail">
                            Avg: <?php echo formatCurrency($summary['average_price'] ?? 0); ?> | 
                            High: <?php echo formatCurrency($summary['highest_price'] ?? 0); ?>
                        </div>
                    </div>
                    
                    <div class="stat-block">
                        <h4>Bidders</h4>
                        <div class="stat-large"><?php echo $summary['unique_bidders']; ?></div>
                        <div class="stat-detail">Winning bidders</div>
                    </div>
                </div>
                
                <!-- Top Performers -->
                <?php $top_items = $report->getTopPerformers($auction_id, 5); ?>
                <?php if (!empty($top_items)): ?>
                <div class="top-performers">
                    <h4>Top Performing Items</h4>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Winner</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($top_items as $item): ?>
                            <tr>
                                <td><?php echo sanitize($item['item_name']); ?></td>
                                <td><?php echo sanitize($item['winner_name']); ?></td>
                                <td><?php echo formatCurrency($item['winning_price']); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
            </div>
            
        <?php elseif ($report_type === 'bidder_payments'): ?>
            <?php $payments = $report->getBidderPayments($auction_id); ?>
            <div class="report-bidder-payments">
                <div class="report-header">
                    <h3>Bidder Payment Summary</h3>
                    <a href="reports.php?auction_id=<?php echo $auction_id; ?>&export=bidder_payments" class="btn btn-secondary">Export CSV</a>
                </div>
                
                <?php if (empty($payments)): ?>
                    <p>No winning bids recorded yet.</p>
                <?php else: ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Bidder</th>
                                <th>Contact</th>
                                <th>Items Won</th>
                                <th>Total Payment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($payments as $payment): ?>
                            <tr>
                                <td>
                                    <strong><?php echo sanitize($payment['first_name'] . ' ' . $payment['last_name']); ?></strong>
                                    <br><small>ID: <?php echo $payment['bidder_id']; ?></small>
                                </td>
                                <td>
                                    <?php if ($payment['phone']): ?>
                                        <?php echo formatPhone($payment['phone']); ?><br>
                                    <?php endif; ?>
                                    <?php if ($payment['email']): ?>
                                        <a href="mailto:<?php echo $payment['email']; ?>"><?php echo sanitize($payment['email']); ?></a>
                                    <?php endif; ?>
                                </td>
                                <td><?php echo $payment['items_won']; ?></td>
                                <td class="amount"><?php echo formatCurrency($payment['total_payment']); ?></td>
                                <td>
                                    <a href="reports.php?auction_id=<?php echo $auction_id; ?>&type=bidder_detail&bidder_id=<?php echo $payment['bidder_id']; ?>">View Details</a>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
            
        <?php elseif ($report_type === 'bidder_detail' && $bidder_id): ?>
            <?php $details = $report->getBidderDetails($auction_id, $bidder_id); ?>
            <div class="bidder-detail">
                <?php if (empty($details)): ?>
                    <p>No details found for this bidder.</p>
                <?php else: ?>
                    <?php $bidder_info = $details[0]; ?>
                    <div class="bidder-checkout">
                        <h3>Bidder Checkout - <?php echo sanitize($bidder_info['first_name'] . ' ' . $bidder_info['last_name']); ?></h3>
                        
                        <div class="checkout-header">
                            <div class="bidder-contact">
                                <p><strong>Bidder ID:</strong> <?php echo $bidder_info['bidder_id']; ?></p>
                                <?php if ($bidder_info['phone']): ?>
                                    <p><strong>Phone:</strong> <?php echo formatPhone($bidder_info['phone']); ?></p>
                                <?php endif; ?>
                                <?php if ($bidder_info['email']): ?>
                                    <p><strong>Email:</strong> <?php echo sanitize($bidder_info['email']); ?></p>
                                <?php endif; ?>
                            </div>
                        </div>
                        
                        <table class="checkout-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Description</th>
                                    <th>Price</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $grand_total = 0; ?>
                                <?php foreach ($details as $detail): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo sanitize($detail['item_name']); ?></strong>
                                        <br><small>ID: <?php echo $detail['item_id']; ?></small>
                                    </td>
                                    <td class="description"><?php echo sanitize($detail['item_description']); ?></td>
                                    <td><?php echo formatCurrency($detail['winning_price']); ?></td>
                                    <td><?php echo $detail['quantity_won']; ?></td>
                                    <td class="amount"><?php echo formatCurrency($detail['line_total']); ?></td>
                                </tr>
                                <?php $grand_total += $detail['line_total']; ?>
                                <?php endforeach; ?>
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <th colspan="4">TOTAL PAYMENT DUE:</th>
                                    <th class="amount"><?php echo formatCurrency($grand_total); ?></th>
                                </tr>
                            </tfoot>
                        </table>
                        
                        <div class="checkout-actions">
                            <button onclick="window.print()" class="btn btn-primary">Print Receipt</button>
                            <a href="reports.php?auction_id=<?php echo $auction_id; ?>&type=bidder_payments" class="btn btn-secondary">← Back to Payments</a>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
            
        <?php elseif ($report_type === 'item_results'): ?>
            <?php $items = $report->getItemResults($auction_id); ?>
            <div class="report-item-results">
                <div class="report-header">
                    <h3>Item Results</h3>
                    <a href="reports.php?auction_id=<?php echo $auction_id; ?>&export=item_results" class="btn btn-secondary">Export CSV</a>
                </div>
                
                <?php if (empty($items)): ?>
                    <p>No items in this auction.</p>
                <?php else: ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Winner</th>
                                <th>Contact</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($items as $item): ?>
                            <tr class="<?php echo strtolower($item['status']); ?>">
                                <td>
                                    <strong><?php echo sanitize($item['item_name']); ?></strong>
                                    <br><small>ID: <?php echo $item['item_id']; ?></small>
                                    <?php if ($item['item_description']): ?>
                                        <br><small class="description"><?php echo sanitize(substr($item['item_description'], 0, 60)); ?>...</small>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($item['winner_name']): ?>
                                        <?php echo sanitize($item['winner_name']); ?>
                                        <br><small>ID: <?php echo $item['bidder_id']; ?></small>
                                    <?php else: ?>
                                        -
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($item['phone']): ?>
                                        <?php echo formatPhone($item['phone']); ?><br>
                                    <?php endif; ?>
                                    <?php if ($item['email']): ?>
                                        <small><?php echo sanitize($item['email']); ?></small>
                                    <?php endif; ?>
                                </td>
                                <td><?php echo $item['winning_price'] ? formatCurrency($item['winning_price']) : '-'; ?></td>
                                <td><?php echo $item['quantity_won'] ?? $item['item_quantity']; ?></td>
                                <td>
                                    <span class="status-badge status-<?php echo strtolower($item['status']); ?>">
                                        <?php echo $item['status']; ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
            
        <?php elseif ($report_type === 'unsold'): ?>
            <?php $unsold_items = $report->getUnsoldItems($auction_id); ?>
            <div class="report-unsold">
                <h3>Unsold Items</h3>
                
                <?php if (empty($unsold_items)): ?>
                    <div class="success-message">
                        <h4>🎉 Congratulations!</h4>
                        <p>All items in this auction have been sold!</p>
                    </div>
                <?php else: ?>
                    <div class="alert alert-warning">
                        <p><strong><?php echo count($unsold_items); ?> items</strong> did not receive winning bids and may need follow-up.</p>
                    </div>
                    
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item ID</th>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($unsold_items as $item): ?>
                            <tr>
                                <td><?php echo $item['item_id']; ?></td>
                                <td><?php echo sanitize($item['item_name']); ?></td>
                                <td class="description"><?php echo sanitize($item['item_description']); ?></td>
                                <td><?php echo $item['item_quantity']; ?></td>
                                <td>
                                    <a href="bid_entry.php?auction_id=<?php echo $auction_id; ?>" class="btn btn-small">Add Bid</a>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <div class="report-actions">
            <a href="reports.php" class="btn btn-secondary">← Select Different Auction</a>
            <a href="auctions.php?action=edit&id=<?php echo $auction_id; ?>" class="btn btn-outline">Edit Auction</a>
            <?php if ($selected_auction['status'] !== 'completed'): ?>
                <a href="bid_entry.php?auction_id=<?php echo $auction_id; ?>" class="btn btn-primary">Enter More Bids</a>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</div>

<?php include '../includes/footer.php'; ?>