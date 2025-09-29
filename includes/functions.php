<?php
// Common utility functions

// Sanitize input
function sanitize($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// Format currency
function formatCurrency($amount) {
    return '$' . number_format($amount, 2);
}

// Format phone number
function formatPhone($phone) {
    if (empty($phone)) return '';
    $phone = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($phone) == 10) {
        return '(' . substr($phone, 0, 3) . ') ' . substr($phone, 3, 3) . '-' . substr($phone, 6);
    }
    return $phone;
}

// Generate select options
function generateOptions($array, $value_key, $text_key, $selected = '') {
    $options = '<option value="">Select...</option>';
    foreach ($array as $item) {
        $selected_attr = ($item[$value_key] == $selected) ? 'selected' : '';
        $options .= '<option value="' . $item[$value_key] . '" ' . $selected_attr . '>' . 
                   sanitize($item[$text_key]) . '</option>';
    }
    return $options;
}

// Flash messages
function setFlashMessage($message, $type = 'success') {
    $_SESSION['flash_message'] = $message;
    $_SESSION['flash_type'] = $type;
}

function getFlashMessage() {
    if (isset($_SESSION['flash_message'])) {
        $message = $_SESSION['flash_message'];
        $type = $_SESSION['flash_type'];
        unset($_SESSION['flash_message'], $_SESSION['flash_type']);
        return ['message' => $message, 'type' => $type];
    }
    return null;
}

// JSON response helper
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Validate required fields
function validateRequired($fields, $data) {
    $errors = [];
    foreach ($fields as $field) {
        if (empty($data[$field])) {
            $errors[] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
        }
    }
    return $errors;
}

// Pagination helper
function paginate($total, $per_page, $current_page) {
    $total_pages = ceil($total / $per_page);
    $start = ($current_page - 1) * $per_page;
    
    return [
        'total' => $total,
        'per_page' => $per_page,
        'current_page' => $current_page,
        'total_pages' => $total_pages,
        'start' => $start,
        'has_prev' => $current_page > 1,
        'has_next' => $current_page < $total_pages
    ];
}
?>