<?php
// Clear opcache via web server
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "Opcache cleared successfully\n";
} else {
    echo "Opcache not available\n";
}

// Show opcache status
if (function_exists('opcache_get_status')) {
    $status = opcache_get_status();
    echo "Opcache enabled: " . ($status ? "YES" : "NO") . "\n";
    if ($status) {
        echo "Cached scripts: " . $status['opcache_statistics']['num_cached_scripts'] . "\n";
    }
}
?>
