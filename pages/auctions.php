<?php
require_once '../config/config.php';
require_once '../classes/Auction.php';
require_once '../classes/Item.php';

requireLogin();

$page_title = 'Auctions';
$auction = new Auction();
$item = new Item();

$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? null;
$page = max(1, $_GET['page'] ?? 1);
$per_page = 25;

// Handle form submissions
if ($_POST) {
    if ($action === 'add') {
        $result = $auction->create($_POST);
        if ($result['success']) {
            setFlashMessage('Auction created successfully');
            header('Location: auctions.php?action=edit&id=' . $result['id']);
            exit;
        } else {
            $errors = $result['errors'];
        }
    } elseif ($action === 'edit' && $id) {
        if (isset($_POST['update_auction'])) {
            $result = $auction->update($id, $_POST);
            if ($result['success']) {
                setFlashMessage('Auction updated successfully');
                header('Location: auctions.php?action=edit&id=' . $id);
                exit;
            } else {
                $errors = $result['errors'];
            }
        } elseif (isset($_POST['add_items'])) {
            $item_ids = $_POST['item_ids'] ?? [];
            $added = 0;
            foreach ($item_ids as $item_id) {
                $result = $item->addToAuction($item_id, $id);
                if ($result) $added++;
            }
            setFlashMessage("Added {$added} items to auction");
            header('Location: auctions.php?action=edit&id=' . $id);
            exit;
        } elseif (isset($_POST['remove_item'])) {
            $item_id = $_POST['item_id'];
            $result = $item->removeFromAuction($item_id, $id);
            if ($result['success']) {
                setFlashMessage('Item removed from auction');
            } else {
                setFlashMessage(implode(', ', $result['errors']), 'error');
            }
            header('Location: auctions.php?action=edit&id=' . $id);
            exit;
        } elseif (isset($_POST['update_status'])) {
            $result = $auction->updateStatus($id, $_POST['status']);
            if ($result['success']) {
                setFlashMessage('Auction status updated');
            } else {
                setFlashMessage(implode(', ', $result['errors']), 'error');
            }
            header('Location: auctions.php?action=edit&id=' . $id);
            exit;
        }
    }
}

// Handle delete
if ($action === 'delete' && $id) {
    $result = $auction->delete($id);
    if ($result['success']) {
        setFlashMessage('Auction deleted successfully');
    } else {
        setFlashMessage(implode(', ', $result['errors']), 'error');
    }
    header('Location: auctions.php');
    exit;
}

// Get data for list view
if ($action === 'list') {
    $offset = ($page - 1) * $per_page;
    $auctions = $auction->getAll($per_page, $offset);
    $total = $auction->getCount();
    $pagination = paginate($total, $per_page, $page);
} elseif ($action === 'edit' && $id) {
    $current_auction = $auction->getWithStats($id);
    if (!$current_auction) {
        setFlashMessage('Auction not found', 'error');
        header('Location: auctions.php');
        exit;
    }
    $auction_items = $item->getForAuction($id);
    $available_items = $item->getAvailableForAuction($id);
}

include '../includes/header.php';
?>

<div class="page-header">
    <h2>Auctions</h2>
    <?php if ($action === 'list'): ?>
        <a href="auctions.php?action=add" class="btn btn-primary">Create Auction</a>
    <?php elseif ($action === 'add' || $action === 'edit'): ?>
        <a href="auctions.php" class="btn btn-secondary">← Back to List</a>
    <?php endif; ?>
</div>

<?php if ($action === 'list'): ?>
    <!-- Auctions Table -->
    <?php if (empty($auctions)): ?>
        <p>No auctions created yet. <a href="auctions.php?action=add">Create your first auction</a></p>
    <?php else: ?>
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Bids</th>
                    <th>Revenue</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($auctions as $auc): ?>
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
                    <td><?php echo $auc['bid_count']; ?></td>
                    <td><?php echo $auc['total_revenue'] ? formatCurrency($auc['total_revenue']) : '-'; ?></td>
                    <td>
                        <a href="auctions.php?action=edit&id=<?php echo $auc['auction_id']; ?>">Edit</a>
                        | <a href="batch_items.php?auction_id=<?php echo $auc['auction_id']; ?>" class="batch-mode-link">Batch Add Items</a>
                        <?php if ($auc['item_count'] > 0 && $auc['status'] !== 'completed'): ?>
                            | <a href="bid_entry.php?auction_id=<?php echo $auc['auction_id']; ?>">Enter Bids</a>
                        <?php endif; ?>
                        <?php if ($auc['bid_count'] > 0): ?>
                            | <a href="reports.php?auction_id=<?php echo $auc['auction_id']; ?>">Reports</a>
                        <?php endif; ?>
                        <?php if ($auc['bid_count'] == 0): ?>
                            | <a href="auctions.php?action=delete&id=<?php echo $auc['auction_id']; ?>" 
                               onclick="return confirm('Delete this auction?')">Delete</a>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <!-- Pagination -->
        <?php if ($pagination['total_pages'] > 1): ?>
        <div class="pagination">
            <?php if ($pagination['has_prev']): ?>
                <a href="auctions.php?page=<?php echo $pagination['current_page'] - 1; ?>">← Previous</a>
            <?php endif; ?>
            
            <span>Page <?php echo $pagination['current_page']; ?> of <?php echo $pagination['total_pages']; ?></span>
            
            <?php if ($pagination['has_next']): ?>
                <a href="auctions.php?page=<?php echo $pagination['current_page'] + 1; ?>">Next →</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    <?php endif; ?>

<?php elseif ($action === 'add'): ?>
    <!-- Add Form -->
    <form method="POST" class="form">
        <div class="form-group">
            <label for="auction_description">Auction Description *</label>
            <input type="text" id="auction_description" name="auction_description" required
                   value="<?php echo sanitize($_POST['auction_description'] ?? ''); ?>">
        </div>
        
        <div class="form-group">
            <label for="auction_date">Auction Date *</label>
            <input type="date" id="auction_date" name="auction_date" required
                   value="<?php echo $_POST['auction_date'] ?? date('Y-m-d'); ?>">
        </div>
        
        <div class="form-group">
            <label for="status">Status</label>
            <select id="status" name="status">
                <option value="planning" <?php echo ($_POST['status'] ?? 'planning') === 'planning' ? 'selected' : ''; ?>>Planning</option>
                <option value="active" <?php echo ($_POST['status'] ?? '') === 'active' ? 'selected' : ''; ?>>Active</option>
                <option value="completed" <?php echo ($_POST['status'] ?? '') === 'completed' ? 'selected' : ''; ?>>Completed</option>
            </select>
        </div>
        
        <?php if (!empty($errors)): ?>
        <div class="alert alert-error">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?php echo sanitize($error); ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>
        
        <div class="form-actions">
            <button type="submit" class="btn btn-primary">Create Auction</button>
        </div>
    </form>

<?php elseif ($action === 'edit'): ?>
    <!-- Edit Form -->
    <div class="auction-edit">
        <div class="auction-summary">
            <h3><?php echo sanitize($current_auction['auction_description']); ?></h3>
            <div class="stats">
                <span>Items: <?php echo $current_auction['item_count']; ?></span>
                <span>Bids: <?php echo $current_auction['bid_count']; ?></span>
                <span>Revenue: <?php echo $current_auction['total_revenue'] ? formatCurrency($current_auction['total_revenue']) : '$0.00'; ?></span>
            </div>
        </div>
        
        <!-- Auction Details Form -->
        <form method="POST" class="form">
            <input type="hidden" name="update_auction" value="1">
            
            <div class="form-group">
                <label for="auction_description">Auction Description *</label>
                <input type="text" id="auction_description" name="auction_description" required
                       value="<?php echo sanitize($current_auction['auction_description']); ?>">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="auction_date">Auction Date *</label>
                    <input type="date" id="auction_date" name="auction_date" required
                           value="<?php echo $current_auction['auction_date']; ?>">
                </div>
                <div class="form-group">
                    <label for="status">Status</label>
                    <select id="status" name="status">
                        <option value="planning" <?php echo $current_auction['status'] === 'planning' ? 'selected' : ''; ?>>Planning</option>
                        <option value="active" <?php echo $current_auction['status'] === 'active' ? 'selected' : ''; ?>>Active</option>
                        <option value="completed" <?php echo $current_auction['status'] === 'completed' ? 'selected' : ''; ?>>Completed</option>
                    </select>
                </div>
            </div>
            
            <?php if (!empty($errors)): ?>
            <div class="alert alert-error">
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?php echo sanitize($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <?php endif; ?>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Auction</button>
                <?php if ($current_auction['item_count'] > 0): ?>
                    <a href="bid_entry.php?auction_id=<?php echo $id; ?>" class="btn btn-highlight">Enter Bids</a>
                <?php endif; ?>
                <?php if ($current_auction['bid_count'] > 0): ?>
                    <a href="reports.php?auction_id=<?php echo $id; ?>" class="btn btn-secondary">View Reports</a>
                <?php endif; ?>
            </div>
        </form>
        
        <!-- Items in Auction -->
        <section class="auction-items">
            <h4>Items in Auction (<?php echo count($auction_items); ?>)</h4>
            
            <?php if (empty($auction_items)): ?>
                <p>No items in this auction yet.</p>
            <?php else: ?>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($auction_items as $i): ?>
                        <tr>
                            <td><?php echo $i['item_id']; ?></td>
                            <td><?php echo sanitize($i['item_name']); ?></td>
                            <td class="description"><?php echo sanitize(substr($i['item_description'], 0, 60)); ?><?php echo strlen($i['item_description']) > 60 ? '...' : ''; ?></td>
                            <td><?php echo $i['item_quantity']; ?></td>
                            <td>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="remove_item" value="1">
                                    <input type="hidden" name="item_id" value="<?php echo $i['item_id']; ?>">
                                    <button type="submit" onclick="return confirm('Remove this item from auction?')" class="btn-link">Remove</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </section>
        
        <!-- Add Items -->
        <?php if (!empty($available_items)): ?>
        <section class="add-items">
            <h4>Add Items to Auction</h4>
            <form method="POST" class="form">
                <input type="hidden" name="add_items" value="1">
                
                <div class="item-checkboxes">
                    <?php foreach ($available_items as $i): ?>
                    <label class="item-checkbox">
                        <input type="checkbox" name="item_ids[]" value="<?php echo $i['item_id']; ?>">
                        <strong><?php echo sanitize($i['item_name']); ?></strong>
                        (ID: <?php echo $i['item_id']; ?>) - Qty: <?php echo $i['item_quantity']; ?>
                        <?php if ($i['item_description']): ?>
                            <br><small><?php echo sanitize(substr($i['item_description'], 0, 100)); ?></small>
                        <?php endif; ?>
                    </label>
                    <?php endforeach; ?>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Add Selected Items</button>
                    <button type="button" onclick="selectAllItems()" class="btn btn-secondary">Select All</button>
                    <button type="button" onclick="selectNoItems()" class="btn btn-secondary">Select None</button>
                </div>
            </form>
        </section>
        <?php else: ?>
            <p><em>All available items are already in auctions. <a href="../pages/items.php?action=add">Create new items</a> to add more.</em></p>
        <?php endif; ?>
    </div>
    
    <script>
    function selectAllItems() {
        document.querySelectorAll('input[name="item_ids[]"]').forEach(cb => cb.checked = true);
    }
    
    function selectNoItems() {
        document.querySelectorAll('input[name="item_ids[]"]').forEach(cb => cb.checked = false);
    }
    </script>
<?php endif; ?>

<?php include '../includes/footer.php'; ?>