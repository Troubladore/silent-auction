<?php
require_once '../config/config.php';
require_once '../classes/Item.php';
require_once '../classes/Auction.php';

requireLogin();

$page_title = 'Items';
$item = new Item();
$auction = new Auction();

$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? null;
$search = $_GET['search'] ?? '';
$batch_auction = $_GET['batch_auction'] ?? '';
$page = max(1, $_GET['page'] ?? 1);
$per_page = 25;

// Handle form submissions
if ($_POST) {
    if ($action === 'add') {
        $result = $item->create($_POST);
        if ($result['success']) {
            $item_id = $result['id'];
            
            // If batch mode, add to auction
            if (!empty($_POST['batch_auction'])) {
                $batch_result = $item->addToAuction($item_id, $_POST['batch_auction']);
                if ($batch_result) {
                    setFlashMessage('Item added and enrolled in auction');
                } else {
                    setFlashMessage('Item added but could not be enrolled in auction', 'error');
                }
            } else {
                setFlashMessage('Item added successfully');
            }
            
            // Check if "add another" was clicked
            if (isset($_POST['add_another'])) {
                $redirect = 'items.php?action=add';
                if (!empty($_POST['batch_auction'])) {
                    $redirect .= '&batch_auction=' . $_POST['batch_auction'];
                }
                header('Location: ' . $redirect);
                exit;
            }
            
            header('Location: items.php');
            exit;
        } else {
            $errors = $result['errors'];
        }
    } elseif ($action === 'edit' && $id) {
        $result = $item->update($id, $_POST);
        if ($result['success']) {
            setFlashMessage('Item updated successfully');
            header('Location: items.php');
            exit;
        } else {
            $errors = $result['errors'];
        }
    }
}

// Handle delete (can come from POST or GET)
if ($action === 'delete' && $id) {
    $result = $item->delete($id);
    if ($result['success']) {
        setFlashMessage('Item deleted successfully');
    } else {
        setFlashMessage(implode(', ', $result['errors']), 'error');
    }
    header('Location: items.php');
    exit;
}

// Handle POST delete
if ($_POST && isset($_POST['action']) && $_POST['action'] === 'delete' && isset($_POST['id'])) {
    $delete_id = $_POST['id'];
    $result = $item->delete($delete_id);
    if ($result['success']) {
        setFlashMessage('Item deleted successfully');
    } else {
        setFlashMessage(implode(', ', $result['errors']), 'error');
    }
    header('Location: items.php');
    exit;
}

// Get data for list view
if ($action === 'list') {
    $offset = ($page - 1) * $per_page;
    $items = $item->getAll($search, $per_page, $offset);
    $total = $item->getCount($search);
    $pagination = paginate($total, $per_page, $page);
} elseif ($action === 'edit' && $id) {
    $current_item = $item->getById($id);
    if (!$current_item) {
        setFlashMessage('Item not found', 'error');
        header('Location: items.php');
        exit;
    }
}

// Get auctions for batch mode and dropdowns
$auctions = $auction->getAll(100);

include '../includes/header.php';
?>

<div class="page-header">
    <h2>Items</h2>
    <?php if ($action === 'list'): ?>
        <div class="page-actions">
            <a href="items.php?action=add" class="btn btn-primary">Add Item</a>
            <?php if (!empty($auctions)): ?>
                <div class="batch-mode">
                    <label for="batch_auction_select">Batch Mode:</label>
                    <select id="batch_auction_select" onchange="enableBatchMode()">
                        <option value="">Select auction for batch entry...</option>
                        <?php foreach ($auctions as $auc): ?>
                        <option value="<?php echo $auc['auction_id']; ?>" <?php echo ($auc['auction_id'] == $batch_auction) ? 'selected' : ''; ?>>
                            <?php echo sanitize($auc['auction_description']); ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            <?php endif; ?>
        </div>
    <?php elseif ($action === 'add' || $action === 'edit'): ?>
        <a href="items.php<?php echo $batch_auction ? '?batch_auction=' . $batch_auction : ''; ?>" class="btn btn-secondary">← Back to List</a>
    <?php endif; ?>
</div>

<?php if ($batch_auction && $action === 'list'): ?>
    <div class="alert alert-info">
        <strong>Batch Mode Active:</strong> New items will automatically be added to the selected auction.
        <a href="items.php?action=add&batch_auction=<?php echo $batch_auction; ?>" class="btn btn-small btn-primary">Add Item to Auction</a>
    </div>
<?php endif; ?>

<?php if ($action === 'list'): ?>
    <!-- Search Form -->
    <form method="GET" class="search-form">
        <input type="hidden" name="batch_auction" value="<?php echo $batch_auction; ?>">
        <input type="text" name="search" value="<?php echo sanitize($search); ?>" 
               placeholder="Search by name, description, or ID..." class="search-input">
        <button type="submit" class="btn btn-primary">Search</button>
        <?php if ($search): ?>
            <a href="items.php<?php echo $batch_auction ? '?batch_auction=' . $batch_auction : ''; ?>" class="btn btn-secondary">Clear</a>
        <?php endif; ?>
    </form>
    
    <!-- Items Table -->
    <?php if (empty($items)): ?>
        <p>No items found. <?php echo $search ? 'Try a different search.' : '<a href="items.php?action=add">Add the first item</a>'; ?></p>
    <?php else: ?>
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($items as $i): ?>
                <tr>
                    <td><?php echo $i['item_id']; ?></td>
                    <td><?php echo sanitize($i['item_name']); ?></td>
                    <td class="description"><?php echo sanitize(substr($i['item_description'], 0, 100)); ?><?php echo strlen($i['item_description']) > 100 ? '...' : ''; ?></td>
                    <td><?php echo $i['item_quantity']; ?></td>
                    <td><?php echo date('M j, Y', strtotime($i['created_at'])); ?></td>
                    <td>
                        <a href="items.php?action=edit&id=<?php echo $i['item_id']; ?>">Edit</a> |
                        <form method="POST" style="display: inline;" onsubmit="return confirm('Delete this item? This cannot be undone.')">
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?php echo $i['item_id']; ?>">
                            <button type="submit" class="btn-link" style="color: #e74c3c;">Delete</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <!-- Pagination -->
        <?php if ($pagination['total_pages'] > 1): ?>
        <div class="pagination">
            <?php if ($pagination['has_prev']): ?>
                <a href="items.php?page=<?php echo $pagination['current_page'] - 1; ?>&search=<?php echo urlencode($search); ?>&batch_auction=<?php echo $batch_auction; ?>">← Previous</a>
            <?php endif; ?>
            
            <span>Page <?php echo $pagination['current_page']; ?> of <?php echo $pagination['total_pages']; ?></span>
            
            <?php if ($pagination['has_next']): ?>
                <a href="items.php?page=<?php echo $pagination['current_page'] + 1; ?>&search=<?php echo urlencode($search); ?>&batch_auction=<?php echo $batch_auction; ?>">Next →</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    <?php endif; ?>

<?php elseif ($action === 'add' || $action === 'edit'): ?>
    <!-- Add/Edit Form -->
    <form method="POST" class="form">
        <?php if ($batch_auction): ?>
            <input type="hidden" name="batch_auction" value="<?php echo $batch_auction; ?>">
            <div class="alert alert-info">
                <strong>Batch Mode:</strong> This item will automatically be added to the selected auction.
            </div>
        <?php endif; ?>
        
        <div class="form-group">
            <label for="item_name">Item Name *</label>
            <input type="text" id="item_name" name="item_name" required
                   value="<?php echo sanitize(($current_item['item_name'] ?? $_POST['item_name']) ?? ''); ?>">
        </div>
        
        <div class="form-group">
            <label for="item_description">Item Description</label>
            <textarea id="item_description" name="item_description" rows="4"><?php echo sanitize(($current_item['item_description'] ?? $_POST['item_description']) ?? ''); ?></textarea>
        </div>
        
        <div class="form-group">
            <label for="item_quantity">Quantity *</label>
            <input type="number" id="item_quantity" name="item_quantity" min="1" required
                   value="<?php echo ($current_item['item_quantity'] ?? $_POST['item_quantity']) ?? 1; ?>">
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
            <button type="submit" class="btn btn-primary">
                <?php echo $action === 'add' ? 'Add Item' : 'Update Item'; ?>
            </button>
            <?php if ($action === 'add'): ?>
                <button type="submit" name="add_another" value="1" class="btn btn-secondary">Add & Add Another</button>
            <?php endif; ?>
        </div>
    </form>
<?php endif; ?>

<script>
function enableBatchMode() {
    const select = document.getElementById('batch_auction_select');
    if (select.value) {
        window.location.href = 'items.php?batch_auction=' + select.value;
    } else {
        window.location.href = 'items.php';
    }
}
</script>

<?php include '../includes/footer.php'; ?>