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
                <ul>
                    <li><a href="/pages/index.php">Dashboard</a></li>
                    <li><a href="/pages/bidders.php">Bidders</a></li>
                    <li><a href="/pages/items.php">Items</a></li>
                    <li><a href="/pages/auctions.php">Auctions</a></li>
                    <li><a href="/pages/bid_entry.php" class="highlight">Bid Entry</a></li>
                    <li><a href="/pages/reports.php">Reports</a></li>
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