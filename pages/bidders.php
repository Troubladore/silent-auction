<?php
require_once '../config/config.php';
require_once '../classes/Bidder.php';

requireLogin();

$page_title = 'Bidders';
$bidder = new Bidder();

$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? null;
$search = $_GET['search'] ?? '';
$page = max(1, $_GET['page'] ?? 1);
$per_page = 25;

// Handle form submissions
if ($_POST) {
    if ($action === 'add') {
        $result = $bidder->create($_POST);
        if ($result['success']) {
            setFlashMessage('Bidder added successfully');
            header('Location: bidders.php');
            exit;
        } else {
            $errors = $result['errors'];
        }
    } elseif ($action === 'edit' && $id) {
        $result = $bidder->update($id, $_POST);
        if ($result['success']) {
            setFlashMessage('Bidder updated successfully');
            header('Location: bidders.php');
            exit;
        } else {
            $errors = $result['errors'];
        }
    }
}

// Handle delete
if ($action === 'delete' && $id) {
    $result = $bidder->delete($id);
    if ($result['success']) {
        setFlashMessage('Bidder deleted successfully');
    } else {
        setFlashMessage(implode(', ', $result['errors']), 'error');
    }
    header('Location: bidders.php');
    exit;
}

// Get data for list view
if ($action === 'list') {
    $offset = ($page - 1) * $per_page;
    $bidders = $bidder->getAll($search, $per_page, $offset);
    $total = $bidder->getCount($search);
    $pagination = paginate($total, $per_page, $page);
} elseif ($action === 'edit' && $id) {
    $current_bidder = $bidder->getById($id);
    if (!$current_bidder) {
        setFlashMessage('Bidder not found', 'error');
        header('Location: bidders.php');
        exit;
    }
}

include '../includes/header.php';
?>

<div class="page-header">
    <h2>Bidders</h2>
    <?php if ($action === 'list'): ?>
        <a href="bidders.php?action=add" class="btn btn-primary">Add Bidder</a>
    <?php elseif ($action === 'add' || $action === 'edit'): ?>
        <a href="bidders.php" class="btn btn-secondary">← Back to List</a>
    <?php endif; ?>
</div>

<?php if ($action === 'list'): ?>
    <!-- Search Form -->
    <form method="GET" class="search-form">
        <input type="text" name="search" value="<?php echo sanitize($search); ?>" 
               placeholder="Search by name or ID..." class="search-input">
        <button type="submit" class="btn btn-primary">Search</button>
        <?php if ($search): ?>
            <a href="bidders.php" class="btn btn-secondary">Clear</a>
        <?php endif; ?>
    </form>
    
    <!-- Bidders Table -->
    <?php if (empty($bidders)): ?>
        <p>No bidders found. <?php echo $search ? 'Try a different search.' : '<a href="bidders.php?action=add">Add the first bidder</a>'; ?></p>
    <?php else: ?>
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>City, State</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($bidders as $b): ?>
                <tr>
                    <td><?php echo $b['bidder_id']; ?></td>
                    <td><?php echo sanitize($b['first_name'] . ' ' . $b['last_name']); ?></td>
                    <td><?php echo formatPhone($b['phone']); ?></td>
                    <td><?php echo sanitize($b['email']); ?></td>
                    <td><?php echo sanitize(trim($b['city'] . ', ' . $b['state'], ', ')); ?></td>
                    <td>
                        <a href="bidders.php?action=edit&id=<?php echo $b['bidder_id']; ?>">Edit</a> |
                        <a href="bidders.php?action=delete&id=<?php echo $b['bidder_id']; ?>" 
                           onclick="return confirm('Delete this bidder?')">Delete</a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <!-- Pagination -->
        <?php if ($pagination['total_pages'] > 1): ?>
        <div class="pagination">
            <?php if ($pagination['has_prev']): ?>
                <a href="bidders.php?page=<?php echo $pagination['current_page'] - 1; ?>&search=<?php echo urlencode($search); ?>">← Previous</a>
            <?php endif; ?>
            
            <span>Page <?php echo $pagination['current_page']; ?> of <?php echo $pagination['total_pages']; ?></span>
            
            <?php if ($pagination['has_next']): ?>
                <a href="bidders.php?page=<?php echo $pagination['current_page'] + 1; ?>&search=<?php echo urlencode($search); ?>">Next →</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    <?php endif; ?>

<?php elseif ($action === 'add' || $action === 'edit'): ?>
    <!-- Add/Edit Form -->
    <form method="POST" class="form">
        <div class="form-row">
            <div class="form-group">
                <label for="first_name">First Name *</label>
                <input type="text" id="first_name" name="first_name" required
                       value="<?php echo sanitize(($current_bidder['first_name'] ?? $_POST['first_name']) ?? ''); ?>">
            </div>
            <div class="form-group">
                <label for="last_name">Last Name *</label>
                <input type="text" id="last_name" name="last_name" required
                       value="<?php echo sanitize(($current_bidder['last_name'] ?? $_POST['last_name']) ?? ''); ?>">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="tel" id="phone" name="phone"
                       value="<?php echo sanitize(($current_bidder['phone'] ?? $_POST['phone']) ?? ''); ?>">
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email"
                       value="<?php echo sanitize(($current_bidder['email'] ?? $_POST['email']) ?? ''); ?>">
            </div>
        </div>
        
        <div class="form-group">
            <label for="address1">Address 1</label>
            <input type="text" id="address1" name="address1"
                   value="<?php echo sanitize(($current_bidder['address1'] ?? $_POST['address1']) ?? ''); ?>">
        </div>
        
        <div class="form-group">
            <label for="address2">Address 2</label>
            <input type="text" id="address2" name="address2"
                   value="<?php echo sanitize(($current_bidder['address2'] ?? $_POST['address2']) ?? ''); ?>">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="city">City</label>
                <input type="text" id="city" name="city"
                       value="<?php echo sanitize(($current_bidder['city'] ?? $_POST['city']) ?? ''); ?>">
            </div>
            <div class="form-group">
                <label for="state">State</label>
                <input type="text" id="state" name="state" maxlength="2"
                       value="<?php echo sanitize(($current_bidder['state'] ?? $_POST['state']) ?? ''); ?>">
            </div>
            <div class="form-group">
                <label for="postal_code">Postal Code</label>
                <input type="text" id="postal_code" name="postal_code"
                       value="<?php echo sanitize(($current_bidder['postal_code'] ?? $_POST['postal_code']) ?? ''); ?>">
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
            <button type="submit" class="btn btn-primary">
                <?php echo $action === 'add' ? 'Add Bidder' : 'Update Bidder'; ?>
            </button>
            <?php if ($action === 'add'): ?>
                <button type="submit" name="add_another" value="1" class="btn btn-secondary">Add & Add Another</button>
            <?php endif; ?>
        </div>
    </form>
<?php endif; ?>

<?php include '../includes/footer.php'; ?>