<?php
require_once '../config/config.php';
require_once '../classes/Auction.php';
require_once '../classes/Item.php';

requireLogin();

$page_title = 'Batch Add Items';
$auction = new Auction();
$item = new Item();

$auction_id = $_GET['auction_id'] ?? null;
$action = $_GET['action'] ?? 'choose';

if (!$auction_id) {
    setFlashMessage('No auction specified for batch mode', 'error');
    header('Location: auctions.php');
    exit;
}

// Get auction details
$current_auction = $auction->getWithStats($auction_id);
if (!$current_auction) {
    setFlashMessage('Auction not found', 'error');
    header('Location: auctions.php');
    exit;
}

// Handle form submissions
if ($_POST) {
    if ($action === 'add_new' && isset($_POST['create_item'])) {
        // Extract only item fields for database insertion
        $itemData = [
            'item_name' => $_POST['item_name'] ?? '',
            'item_description' => $_POST['item_description'] ?? '',
            'item_quantity' => $_POST['item_quantity'] ?? 1
        ];
        $result = $item->create($itemData);
        if ($result['success']) {
            $item_id = $result['id'];
            
            // Add to auction
            $batch_result = $item->addToAuction($item_id, $auction_id);
            if ($batch_result) {
                setFlashMessage('Item created and added to auction');
                
                // Check if "add another" was clicked
                if (isset($_POST['add_another'])) {
                    header("Location: batch_items.php?auction_id=$auction_id&action=add_new");
                    exit;
                } else {
                    // "Add & Finish" clicked - return to auction edit page
                    header("Location: auctions.php?action=edit&id=$auction_id");
                    exit;
                }
            } else {
                setFlashMessage('Item created but could not be added to auction', 'error');
            }
        } else {
            $errors = $result['errors'];
        }
    } elseif ($action === 'add_existing' && isset($_POST['associate_items'])) {
        $item_ids = $_POST['item_ids'] ?? [];
        $added = 0;
        
        foreach ($item_ids as $item_id) {
            if ($item->addToAuction($item_id, $auction_id)) {
                $added++;
            }
        }
        
        setFlashMessage("Added $added existing items to auction");
        header("Location: auctions.php?action=edit&id=$auction_id");
        exit;
    }
}

// Get data for different actions
if ($action === 'add_existing') {
    $available_items = $item->getAvailableForAuction($auction_id);
}

include '../includes/header.php';
?>

<!-- Auction Context Banner -->
<div class="batch-mode-banner">
    <div class="batch-mode-info">
        <h2>🚀 Batch Mode Active</h2>
        <div class="auction-context">
            <strong><?php echo sanitize($current_auction['auction_description']); ?></strong>
            <span class="auction-meta">
                <?php echo date('M j, Y', strtotime($current_auction['auction_date'])); ?>
                | <?php echo $current_auction['item_count']; ?> items currently
                | <?php echo $current_auction['total_revenue'] ? formatCurrency($current_auction['total_revenue']) : '$0.00'; ?> revenue
            </span>
        </div>
    </div>
    <div class="batch-mode-actions">
        <a href="auctions.php?action=edit&id=<?php echo $auction_id; ?>" class="btn btn-secondary">
            ← Back to Auction
        </a>
        <a href="batch_items.php?auction_id=<?php echo $auction_id; ?>" class="btn btn-outline">
            Change Mode
        </a>
    </div>
</div>

<?php if ($action === 'choose'): ?>
    <!-- Mode Selection -->
    <div class="batch-mode-selection">
        <h3>How would you like to add items to this auction?</h3>
        
        <div class="mode-options">
            <div class="mode-option">
                <div class="mode-icon">📝</div>
                <h4>Create New Items</h4>
                <p>Add brand new items and automatically associate them with this auction</p>
                <a href="batch_items.php?auction_id=<?php echo $auction_id; ?>&action=add_new" 
                   class="btn btn-primary">Create New Items</a>
            </div>
            
            <div class="mode-option">
                <div class="mode-icon">📋</div>
                <h4>Add Existing Items</h4>
                <p>Select from your existing inventory to add to this auction</p>
                <a href="batch_items.php?auction_id=<?php echo $auction_id; ?>&action=add_existing" 
                   class="btn btn-primary">Add Existing Items</a>
            </div>
        </div>
    </div>

<?php elseif ($action === 'add_new'): ?>
    <!-- Create New Item Form -->
    <div class="batch-new-item">
        <h3>Create New Item for Auction</h3>
        
        <?php if (!empty($errors)): ?>
        <div class="alert alert-error">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?php echo sanitize($error); ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>
        
        <form method="POST" class="form">
            <input type="hidden" name="create_item" value="1">
            
            <div class="form-group">
                <label for="item_name">Item Name *</label>
                <input type="text" id="item_name" name="item_name" required
                       value="<?php echo sanitize($_POST['item_name'] ?? ''); ?>">
            </div>
            
            <div class="form-group">
                <label for="item_description">Item Description</label>
                <textarea id="item_description" name="item_description" rows="3"><?php echo sanitize($_POST['item_description'] ?? ''); ?></textarea>
            </div>
            
            <div class="form-group">
                <label for="item_quantity">Quantity</label>
                <input type="number" id="item_quantity" name="item_quantity" min="1" value="<?php echo $_POST['item_quantity'] ?? 1; ?>">
            </div>
            
            <div class="form-actions">
                <button type="submit" name="add_another" class="btn btn-primary">Add & Add Another</button>
                <button type="submit" class="btn btn-secondary">Add & Finish</button>
            </div>
        </form>
    </div>

<?php elseif ($action === 'add_existing'): ?>
    <!-- Add Existing Items -->
    <div class="batch-existing-items">
        <h3>Add Existing Items to Auction</h3>
        
        <?php if (empty($available_items)): ?>
            <div class="alert alert-info">
                <p>No available items found. All items in your inventory are already assigned to auctions.</p>
                <p>
                    <a href="batch_items.php?auction_id=<?php echo $auction_id; ?>&action=add_new" class="btn btn-primary">
                        Create New Items Instead
                    </a>
                </p>
            </div>
        <?php else: ?>
            <form method="POST" class="form">
                <input type="hidden" name="associate_items" value="1">
                
                <div class="items-selection">
                    <div class="selection-controls">
                        <label>
                            <input type="checkbox" id="select-all"> Select All (<?php echo count($available_items); ?> items)
                        </label>
                    </div>
                    
                    <div class="items-grid">
                        <?php foreach ($available_items as $available_item): ?>
                            <div class="item-card">
                                <label class="item-checkbox">
                                    <input type="checkbox" name="item_ids[]" value="<?php echo $available_item['item_id']; ?>">
                                    <div class="item-info">
                                        <h5><?php echo sanitize($available_item['item_name']); ?></h5>
                                        <p><?php echo sanitize($available_item['item_description']); ?></p>
                                        <span class="item-meta">Qty: <?php echo $available_item['item_quantity']; ?></span>
                                    </div>
                                </label>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Add Selected Items to Auction</button>
                </div>
            </form>
        <?php endif; ?>
    </div>

<?php endif; ?>

<style>
.batch-mode-banner {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white !important;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.batch-mode-info h2 {
    margin: 0 0 10px 0;
    font-size: 24px;
    color: white !important;
}

.batch-mode-banner .auction-context {
    font-size: 16px !important;
    color: white !important;
    background: transparent !important;
    background-color: transparent !important;
}

.batch-mode-banner .auction-context,
.batch-mode-banner .auction-context *,
.batch-mode-banner .auction-context strong {
    color: white !important;
    background: transparent !important;
    background-color: transparent !important;
}

.auction-meta {
    display: block;
    font-size: 14px;
    opacity: 0.9;
    margin-top: 5px;
    color: white !important;
}

.batch-mode-actions {
    display: flex;
    gap: 10px;
}

.batch-mode-actions .btn {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
}

.batch-mode-actions .btn:hover {
    background: rgba(255,255,255,0.3);
}

.batch-mode-selection {
    text-align: center;
    margin: 40px 0;
}

.mode-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-top: 30px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
}

.mode-option {
    background: #f8f9fa;
    padding: 30px;
    border-radius: 10px;
    border: 2px solid #e9ecef;
    text-align: center;
    transition: all 0.3s ease;
}

.mode-option:hover {
    border-color: #007bff;
    box-shadow: 0 4px 12px rgba(0,123,255,0.15);
}

.mode-icon {
    font-size: 48px;
    margin-bottom: 15px;
}

.mode-option h4 {
    margin: 0 0 15px 0;
    color: #333;
}

.mode-option p {
    color: #666;
    margin-bottom: 20px;
}

.items-selection {
    margin-top: 20px;
}

.selection-controls {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 5px;
}

.items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
}

.item-card {
    border: 2px solid #e9ecef;
    border-radius: 8px;
    transition: all 0.3s ease;
}

.item-card:hover {
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0,123,255,0.15);
}

.item-checkbox {
    display: block;
    padding: 15px;
    cursor: pointer;
}

.item-checkbox input[type="checkbox"] {
    margin-right: 10px;
}

.item-info h5 {
    margin: 0 0 5px 0;
    color: #333;
}

.item-info p {
    margin: 0 0 8px 0;
    color: #666;
    font-size: 14px;
}

.item-meta {
    font-size: 12px;
    color: #999;
}
</style>

<script>
// Select all functionality
document.getElementById('select-all')?.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('input[name="item_ids[]"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
    });
});

// Update select all when individual items change
document.querySelectorAll('input[name="item_ids[]"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const allCheckboxes = document.querySelectorAll('input[name="item_ids[]"]');
        const checkedCheckboxes = document.querySelectorAll('input[name="item_ids[]"]:checked');
        const selectAllCheckbox = document.getElementById('select-all');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = allCheckboxes.length === checkedCheckboxes.length;
        }
    });
});

// Auto-focus first input
document.addEventListener('DOMContentLoaded', function() {
    const firstInput = document.querySelector('input[type="text"]:first-of-type');
    if (firstInput) {
        firstInput.focus();
    }
});
</script>

<?php include '../includes/footer.php'; ?>