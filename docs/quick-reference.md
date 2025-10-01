# Quick Reference

Fast lookup guide for common tasks in the Silent Auction Management System.

## Common Tasks

### Login
```
1. Open browser → http://[server-ip]/auction
2. Enter admin password
3. Click "Login"
```

### Add a Bidder
```
Navigation: Bidders → Add New Bidder
Required: First Name, Last Name
Optional: Phone, Email, Address
```

### Add an Item
```
Navigation: Items → Add New Item
Fields: Item Name, Description, Quantity
```

### Create Auction
```
Navigation: Auctions → Create New Auction
Fields: Description, Date, Status
```

### Assign Items to Auction
```
Navigation: Auctions → [Select Auction] → Manage Items
Click "Add to Auction" for each item
```

### Enter Bids (Post-Auction)
```
Navigation: Bid Entry → [Select Auction] → Start Bid Entry

1. Type bidder name → Select from dropdown
2. Click item button (or Tab + Enter)
3. Enter winning price
4. Tab to quantity (usually 1)
5. Press Enter to save
6. Repeat
```

### Record Payment
```
Navigation: Reports → Bidder Details → [Find Bidder] → Checkout

1. Review items and total
2. Select Cash or Check
3. Enter check number (if check)
4. Click "Record Payment"
5. Click "Print Receipt"
```

### Search Bidders in Reports
```
Navigation: Reports → Bidder Details
Type in search box: Name, ID, Phone, or Email
Results filter instantly
```

### Export Report to CSV
```
Navigation: Reports → [Select Report Type]
Click "Export CSV" button
Open file in Excel or accounting software
```

## Keyboard Shortcuts

### Bid Entry Page
| Key | Action |
|-----|--------|
| `Tab` | Move to next field |
| `Enter` | Select dropdown item OR save bid |
| `Esc` | Clear current form |
| `↑` `↓` | Navigate dropdown |
| `F5` | Refresh page (saves progress) |

### Bidder Search (Reports)
| Key | Action |
|-----|--------|
| `Esc` | Clear search |
| Start typing | Auto-focuses search |

### Receipts
| Key | Action |
|-----|--------|
| `Ctrl+P` | Print receipt |

## Bid Entry Workflow

```
┌─────────────────────────────────────────┐
│ 1. Type bidder name                     │
│    → Dropdown appears                   │
│    → Select bidder                      │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. Click item (or Tab + Enter)         │
│    → Item highlights                    │
│    → Cursor moves to price field       │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 3. Type price                           │
│    → Tab to quantity                    │
│    → Type quantity (usually 1)          │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 4. Press Enter (or click Save Bid)     │
│    → Confirmation appears               │
│    → Form clears for next bid          │
└─────────────────────────────────────────┘
```

## Payment Processing Workflow

```
┌─────────────────────────────────────────┐
│ 1. Reports → Bidder Details             │
│    → Search for bidder                  │
│    → Click "Checkout" button           │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. Review items won with bidder         │
│    → Verify total amount due           │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 3. Scroll to "Record Payment"           │
│    → Amount pre-filled                  │
│    → Select Cash or Check               │
│    → Enter check # (if check)           │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 4. Click "Record Payment"               │
│    → Confirmation appears               │
│    → Click "Print Receipt"              │
└─────────────────────────────────────────┘
```

## Report Types Quick Guide

| Report | Purpose | Key Info |
|--------|---------|----------|
| **Summary** | Overall auction stats | Items, bidders, revenue |
| **Bidder Details** | Payment tracking | Who won what, payment status |
| **Item Results** | Item outcomes | Winners, prices, contact info |
| **Unsold Items** | No-bid items | Items to re-auction |

## Common Searches

### Find Bidder by Name
```
Reports → Bidder Details → Search: "smith"
```

### Find Bidder by ID
```
Reports → Bidder Details → Search: "123"
```

### Find Bidder by Phone
```
Reports → Bidder Details → Search: "5551234"
```

### Find All Unpaid Bidders
```
Reports → Bidder Details
Look for "Unpaid" badges
Click "Checkout" to process
```

## Speed Tips

### Fastest Bid Entry
1. ✓ Sort bid sheets by bidder (enter all items per bidder at once)
2. ✓ Use only keyboard (no mouse clicks)
3. ✓ Memorize shortcuts (Tab, Enter, Esc)
4. ✓ Keep steady rhythm (don't rush)
5. ✓ Take 2-minute breaks every 30 items

### Expected Speed
- **Experienced:** 30-40 bids/minute
- **New user:** 15-20 bids/minute
- **100 items:** 5-10 minutes

### Efficient Checkout
1. ✓ Use search to find bidders quickly
2. ✓ Record payment before printing receipt
3. ✓ Keep printer nearby for instant receipts
4. ✓ Process cash/check payments separately

## Field Reference

### Bidder Fields
| Field | Required | Notes |
|-------|----------|-------|
| First Name | ✓ | Used in search |
| Last Name | ✓ | Used in search, sorting |
| Phone | | Used in search, contact |
| Email | | Used in search, contact |
| Address | | For receipts, mailings |

### Item Fields
| Field | Required | Notes |
|-------|----------|-------|
| Item Name | ✓ | Short, descriptive |
| Description | | Detailed info |
| Quantity | ✓ | Usually 1 |

### Auction Fields
| Field | Required | Notes |
|-------|----------|-------|
| Description | ✓ | Event name |
| Date | ✓ | Event date |
| Status | ✓ | Planning/Active/Completed |

### Bid Entry Fields
| Field | Required | Notes |
|-------|----------|-------|
| Bidder | ✓ | Typeahead search |
| Item | ✓ | Click or Tab+Enter |
| Price | ✓ | Winning bid amount |
| Quantity | ✓ | Usually 1 |

### Payment Fields
| Field | Required | Notes |
|-------|----------|-------|
| Amount Paid | ✓ | Pre-filled with total |
| Payment Method | ✓ | Cash or Check |
| Check Number | If Check | Required for checks |
| Notes | | Optional details |

## Status Indicators

### Bidder Payment Status
| Badge | Meaning |
|-------|---------|
| ✓ Paid | Payment recorded |
| Unpaid | No payment yet |

### Auction Status
| Status | Meaning |
|--------|---------|
| Planning | Pre-auction setup |
| Active | Auction in progress |
| Completed | Finished, processing payments |

### Item Status
| Status | Meaning |
|--------|---------|
| SOLD | Has winning bid |
| UNSOLD | No bids received |

## File Locations

### Configuration
```
config/database.php    - Database credentials
config/config.php      - Admin password, settings
```

### Logs (if issues occur)
```
/var/log/apache2/error.log  - Web server errors
Browser console             - JavaScript errors
```

### Backups (see Maintenance Guide)
```
Database: mysqldump command
Files: tar backup of application directory
```

## Access URLs

### Main Application
```
http://[server-ip]/auction
```

### From Server Itself
```
http://localhost/auction
```

### Common Local IPs
```
http://192.168.1.100/auction
http://192.168.0.100/auction
http://10.0.0.100/auction
```

## Troubleshooting Quick Fixes

### Cannot Login
```
1. Check admin password in config/config.php
2. Clear browser cache
3. Try different browser
```

### Slow Bid Entry
```
1. Check network connection
2. Verify database indexes exist
3. Check server resources (RAM, CPU)
```

### Cannot Access from Other Computers
```
1. Verify firewall allows port 80
2. Ping server IP from client
3. Check server is on same network
```

### Payment Not Showing
```
1. Refresh page (F5)
2. Verify payment was saved (check for confirmation)
3. Check Bidder Details report
```

### Receipt Won't Print
```
1. Check printer is selected
2. Try Ctrl+P manually
3. Check browser print preview
```

## Database Quick Reference

### Tables
```
bidders          - Bidder registrations
items            - Item catalog
auctions         - Auction events
auction_items    - Item-auction associations
winning_bids     - Bid entries
bidder_payments  - Payment records
```

### Key Relationships
```
bidder → winning_bids → items
auction → winning_bids
bidder → bidder_payments → auction
```

## Emergency Contacts

### If System is Down
```
1. Check server is powered on
2. Check network connection
3. Restart web server:
   Linux: sudo systemctl restart apache2
   XAMPP: Restart from control panel
```

### If Data is Lost
```
1. Stop making changes
2. Restore from most recent backup
3. Check backup procedures
```

## More Information

- **[User Guide](user-guide.md)** - Complete workflow documentation
- **[Installation](installation.md)** - Setup instructions
- **[Features](features.md)** - Detailed feature descriptions
- **[Maintenance](maintenance.md)** - Backup and troubleshooting
