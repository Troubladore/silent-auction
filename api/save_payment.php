<?php
require_once '../config/config.php';
require_once '../classes/Report.php';

requireLogin();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

$bidder_id = $data['bidder_id'] ?? '';
$auction_id = $data['auction_id'] ?? '';
$amount_paid = $data['amount_paid'] ?? '';
$payment_method = $data['payment_method'] ?? '';
$check_number = $data['check_number'] ?? null;
$notes = $data['notes'] ?? null;

if (empty($bidder_id) || empty($auction_id) || empty($amount_paid) || empty($payment_method)) {
    jsonResponse(['error' => 'Bidder ID, Auction ID, Amount Paid, and Payment Method are required'], 400);
}

// Validate payment method
if (!in_array($payment_method, ['cash', 'check'])) {
    jsonResponse(['error' => 'Payment method must be either cash or check'], 400);
}

// Validate amount is positive
if (!is_numeric($amount_paid) || $amount_paid <= 0) {
    jsonResponse(['error' => 'Amount paid must be a positive number'], 400);
}

// If payment method is check, check number should be provided
if ($payment_method === 'check' && empty($check_number)) {
    jsonResponse(['error' => 'Check number is required for check payments'], 400);
}

try {
    $report = new Report();
    $payment_id = $report->savePayment(
        $bidder_id,
        $auction_id,
        $amount_paid,
        $payment_method,
        $check_number,
        $notes
    );

    jsonResponse([
        'success' => true,
        'payment_id' => $payment_id,
        'message' => 'Payment saved successfully'
    ]);
} catch (Exception $e) {
    error_log('Save payment error: ' . $e->getMessage());
    jsonResponse(['error' => 'Failed to save payment: ' . $e->getMessage()], 500);
}
?>
