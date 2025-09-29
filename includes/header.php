<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($page_title) ? $page_title . ' - ' . APP_NAME : APP_NAME; ?></title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <header class="main-header">
        <div class="container">
            <h1><a href="/pages/index.php"><?php echo APP_NAME; ?></a></h1>
            <nav>
                <?php
                // Get current page for navigation highlighting
                $current_page = basename($_SERVER['PHP_SELF']);
                $nav_items = [
                    'index.php' => 'Dashboard',
                    'bidders.php' => 'Bidders', 
                    'items.php' => 'Items',
                    'auctions.php' => 'Auctions',
                    'bid_entry.php' => 'Bid Entry',
                    'reports.php' => 'Reports'
                ];
                ?>
                <ul>
                    <?php foreach ($nav_items as $file => $title): ?>
                        <li>
                            <a href="/pages/<?php echo $file; ?>" 
                               <?php if ($current_page === $file): ?>class="highlight"<?php endif; ?>>
                                <?php echo $title; ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                    <li><a href="/pages/logout.php">Logout</a></li>
                </ul>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <?php
        $flash = getFlashMessage();
        if ($flash):
        ?>
        <div class="alert alert-<?php echo $flash['type']; ?>">
            <?php echo sanitize($flash['message']); ?>
        </div>
        <?php endif; ?>