# API Reference

Documentation for all AJAX API endpoints in the Silent Auction Management System.

## Base Information

**Base URL:** `/api/`
**Authentication:** All endpoints require active session
**Response Format:** JSON
**Request Method:** Varies by endpoint

## Endpoints

### 1. Lookup API

**Endpoint:** `GET /api/lookup.php`

**Purpose:** Real-time typeahead search for bidders and items

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Either "bidder" or "item" |
| `term` | string | Yes | Search term (minimum 1 character) |
| `auction_id` | integer | For items | Auction ID to search within |

**Example Requests:**
```
GET /api/lookup.php?type=bidder&term=john
GET /api/lookup.php?type=item&term=wine&auction_id=80
```

**Response Format:**
```json
[
  {
    "id": "123",
    "label": "John Smith (ID: 123)",
    "first_name": "John",
    "last_name": "Smith"
  },
  {
    "id": "456",
    "label": "Johnson, Mary (ID: 456)",
    "first_name": "Mary",
    "last_name": "Johnson"
  }
]
```

**Item Response:**
```json
[
  {
    "id": "57",
    "label": "Wine Gift Basket",
    "name": "Wine Gift Basket",
    "description": "Selection of local wines..."
  }
]
```

**Performance:** Target < 500ms response time

---

### 2. Save Bid API

**Endpoint:** `POST /api/save_bid.php`

**Purpose:** Record a winning bid entry

**Request Method:** POST
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "auction_id": 80,
  "item_id": 57,
  "bidder_id": 123,
  "winning_price": 45.00,
  "quantity_won": 1
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `auction_id` | integer | Yes | Must exist in auctions table |
| `item_id` | integer | Yes | Must be assigned to auction |
| `bidder_id` | integer | Yes | Must exist in bidders table |
| `winning_price` | decimal | Yes | > 0, max 10 digits, 2 decimals |
| `quantity_won` | integer | Yes | > 0 |

**Success Response:**
```json
{
  "success": true,
  "bid_id": 789,
  "message": "Bid saved successfully"
}
```

**Error Response:**
```json
{
  "error": "All fields are required"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Validation error
- `500`: Server error

---

### 3. Save Payment API

**Endpoint:** `POST /api/save_payment.php`

**Purpose:** Record or update a bidder payment

**Request Method:** POST
**Content-Type:** `application/json`

**Request Body (Cash):**
```json
{
  "bidder_id": 123,
  "auction_id": 80,
  "amount_paid": 150.00,
  "payment_method": "cash",
  "notes": "Paid in full"
}
```

**Request Body (Check):**
```json
{
  "bidder_id": 123,
  "auction_id": 80,
  "amount_paid": 150.00,
  "payment_method": "check",
  "check_number": "CHK-12345",
  "notes": "Personal check"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `bidder_id` | integer | Yes | Must exist |
| `auction_id` | integer | Yes | Must exist |
| `amount_paid` | decimal | Yes | > 0 |
| `payment_method` | string | Yes | Must be 'cash' or 'check' |
| `check_number` | string | For checks | Required if method is 'check' |
| `notes` | string | No | Optional text |

**Success Response:**
```json
{
  "success": true,
  "payment_id": 45,
  "message": "Payment saved successfully"
}
```

**Error Responses:**
```json
{
  "error": "Bidder ID, Auction ID, Amount Paid, and Payment Method are required"
}
```

```json
{
  "error": "Payment method must be either cash or check"
}
```

```json
{
  "error": "Check number is required for check payments"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Validation error
- `500`: Server error

**Business Logic:**
- Automatically clears `check_number` if `payment_method` is 'cash'
- Upserts: Updates existing payment if found, inserts if not
- Only one payment per bidder per auction

---

## Common Response Patterns

### Success Response
```json
{
  "success": true,
  "id": 123,
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "error": "Descriptive error message"
}
```

### Array Response (Lookup)
```json
[
  { "id": "1", "label": "Item 1" },
  { "id": "2", "label": "Item 2" }
]
```

## Error Handling

### Authentication Errors
If session is invalid, endpoints redirect to login page.

### Validation Errors
Return HTTP 400 with descriptive error message in JSON.

### Server Errors
Return HTTP 500 with generic error message. Details logged server-side.

## Rate Limiting

No explicit rate limiting implemented (trusted network assumption).

## CORS

No CORS headers (local network only).

## JavaScript Usage Examples

### Lookup Bidder
```javascript
async function searchBidder(term) {
  const response = await fetch(
    `/api/lookup.php?type=bidder&term=${encodeURIComponent(term)}`
  );
  const bidders = await response.json();
  return bidders;
}
```

### Save Bid
```javascript
async function saveBid(bidData) {
  const response = await fetch('/api/save_bid.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bidData),
    credentials: 'same-origin'
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}
```

### Save Payment
```javascript
async function savePayment(paymentData) {
  const response = await fetch('/api/save_payment.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(paymentData),
    credentials: 'same-origin'
  });

  const result = await response.json();

  if (result.error) {
    alert('Error: ' + result.error);
    return false;
  }

  alert(result.message);
  return true;
}
```

## Security Considerations

### Authentication
- All endpoints check `requireLogin()` before processing
- Session validation on every request
- No authentication bypass possible

### Input Validation
- Server-side validation on all inputs
- Type checking and constraint enforcement
- SQL injection prevention via prepared statements

### Output Encoding
- JSON encoding handles special characters
- No raw HTML in API responses
- Content-Type headers set correctly

## Performance Guidelines

### Lookup Endpoint
- **Target:** < 500ms response time
- **Caching:** None (always fresh data)
- **Optimization:** Database indexes on search fields

### Save Endpoints
- **Target:** < 1 second for confirmation
- **Transaction:** Atomic database operations
- **Validation:** Fast server-side checks

## Debugging

### Enable Error Display (Development Only)
```php
// In api/lookup.php (top of file, dev only)
ini_set('display_errors', 1);
error_reporting(E_ALL);
```

### Check Response in Browser Console
```javascript
fetch('/api/lookup.php?type=bidder&term=test')
  .then(r => r.json())
  .then(console.log);
```

### Check Server Logs
```bash
# Linux
tail -f /var/log/apache2/error.log

# XAMPP Windows
# Check XAMPP Control Panel → Apache → Logs
```

## Future API Endpoints (Not Implemented)

Potential future expansions:
- `DELETE /api/delete_bid.php` - Remove incorrect bids
- `PUT /api/update_bid.php` - Modify existing bids
- `GET /api/auction_stats.php` - Real-time auction statistics
- `POST /api/bulk_import.php` - Bulk data import

## See Also

- [Database Schema](database-schema.md) - Database structure
- [Technical Details](technical.md) - Implementation details
- [Directory Structure](directory-structure.md) - File locations
