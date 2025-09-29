<?php
require_once '../config/config.php';

$error = '';

if ($_POST) {
    $password = $_POST['password'] ?? '';
    if (login($password)) {
        header('Location: index.php');
        exit;
    } else {
        $error = 'Invalid password';
    }
}

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - <?php echo APP_NAME; ?></title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="login-page">
    <div class="login-container">
        <h1><?php echo APP_NAME; ?></h1>
        <form method="POST" class="login-form">
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required autofocus>
            </div>
            <?php if ($error): ?>
                <div class="alert alert-error"><?php echo sanitize($error); ?></div>
            <?php endif; ?>
            <button type="submit">Login</button>
        </form>
        <div class="login-help">
            <p><strong>Default Password:</strong> auction123</p>
            <p>Change this in <code>config/config.php</code></p>
        </div>
    </div>
</body>
</html>