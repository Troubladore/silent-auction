<?php
// Application configuration
session_start();

// App settings
define('APP_NAME', 'Silent Auction Manager');
define('APP_VERSION', '1.0');

// Include database config
require_once __DIR__ . '/database.php';

// Auto-include common functions
require_once __DIR__ . '/../includes/functions.php';

// Simple authentication (change this password!)
define('ADMIN_PASSWORD', 'auction123');

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;
}

// Require login for protected pages
function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: login.php');
        exit;
    }
}

// Login function
function login($password) {
    if ($password === ADMIN_PASSWORD) {
        $_SESSION['authenticated'] = true;
        return true;
    }
    return false;
}

// Logout function
function logout() {
    session_destroy();
    header('Location: login.php');
    exit;
}
?>