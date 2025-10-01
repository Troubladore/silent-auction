# User Guide

Complete guide for using the Silent Auction Management System from pre-auction setup through post-auction settlement.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Pre-Auction Setup](#pre-auction-setup)
3. [Bid Entry (Post-Auction)](#bid-entry-post-auction)
4. [Payment Processing](#payment-processing)
5. [Reports and Export](#reports-and-export)
6. [Tips and Best Practices](#tips-and-best-practices)

## Getting Started

### Logging In

1. Open web browser
2. Navigate to auction system URL (e.g., `http://192.168.1.100/auction`)
3. Enter admin password
4. Click "Login"

You'll be taken to the dashboard showing all auctions.

### Dashboard Overview

The dashboard displays:
- List of all auctions
- Quick stats for each auction (items, bids, revenue)
- Links to view detailed reports
- Main navigation menu

**Main Navigation:**
- **Dashboard** - Auction overview
- **Bidders** - Manage bidder registrations
- **Items** - Manage item catalog
- **Auctions** - Create and manage auctions
- **Bid Entry** - Record winning bids (post-auction)
- **Reports** - View results and process payments

---

## Pre-Auction Setup

### Step 1: Register Bidders

**Purpose:** Create bidder records before or during the auction

1. Click **"Bidders"** in navigation
2. Click **"Add New Bidder"** button
3. Fill in bidder information:
   - **Required:** First Name, Last Name
   - **Optional:** Phone, Email, Address
4. Click **"Add Bidder"**

**Tips:**
- Register bidders in advance if possible
- Collect email addresses for future auction notifications
- Phone numbers useful for payment follow-up
- Bidder ID is auto-assigned

**Managing Bidders:**
- Use search box to find existing bidders
- Click "Edit" to update bidder information
- View bidder history to see past auction participation

### Step 2: Create Item Catalog

**Purpose:** Catalog all items that will be auctioned

1. Click **"Items"** in navigation
2. Click **"Add New Item"** button
3. Fill in item details:
   - **Item Name:** Short descriptive name
   - **Description:** Detailed description for bidders
   - **Quantity:** Usually 1 (multiple available if applicable)
4. Click **"Add Item"**

**Tips:**
- Use clear, descriptive names
- Include relevant details in description
- Item ID is auto-assigned
- Items can be reused in multiple auctions

**Managing Items:**
- Search existing items before creating duplicates
- Edit items to update descriptions
- Items remain in catalog for future auctions

### Step 3: Create Auction

**Purpose:** Set up a new auction event

1. Click **"Auctions"** in navigation
2. Click **"Create New Auction"** button
3. Fill in auction details:
   - **Auction Description:** Event name/description
   - **Auction Date:** Date of event
   - **Status:** Usually "Planning"
4. Click **"Create Auction"**

**Auction Statuses:**
- **Planning:** Pre-auction setup phase
- **Active:** Auction is currently running
- **Completed:** Auction finished, processing bids/payments

### Step 4: Assign Items to Auction

**Purpose:** Select which items are in this specific auction

1. From Auctions page, click **"Manage Items"** for your auction
2. You'll see two lists:
   - **Available Items:** Items not yet assigned
   - **Assigned Items:** Items in this auction
3. Click **"Add to Auction"** next to items you want to include
4. Remove items if needed by clicking **"Remove"**

**Tips:**
- Assign items any time before bid entry
- Items can be in multiple auctions
- Review assigned items before starting bid entry

---

## Bid Entry (Post-Auction)

**This is the core feature - optimized for speed**

### When to Use

After the silent auction closes and you have physical bid sheets showing winning bids.

### Accessing Bid Entry

1. Click **"Bid Entry"** in navigation
2. Select the auction from dropdown
3. Click **"Start Bid Entry"**

### The Bid Entry Interface

**Left Side:** Bid entry form
- Bidder lookup field (typeahead)
- Item selection buttons
- Price and quantity fields
- Save/Skip controls

**Right Side:** Progress tracking
- Items remaining
- Items entered/skipped
- Recent entries list
- Running total

### Entering Bids - Step by Step

**1. Find the Bidder**
- Start typing bidder name or ID in "Bidder" field
- Dropdown appears with matching bidders
- Click bidder or use arrow keys + Enter
- Bidder name displays in field

**2. Select the Item**
- Click the item button on the right
- OR use Tab to navigate, Enter to select
- Selected item highlights
- Item name appears in "Item" field

**3. Enter Price**
- Price field auto-focuses
- Type winning bid amount
- Use Tab to move to quantity (usually 1)

**4. Enter Quantity**
- Usually 1
- Change if multiple items won
- Press Enter to save

**5. Save the Bid**
- Click "Save Bid" OR press Enter
- Confirmation message appears
- Form clears for next bid
- Item moves to "Recent Entries"

### Keyboard Shortcuts (Speed Critical!)

- **Tab:** Move between fields
- **Enter:** Select dropdown item OR save bid
- **Escape:** Clear form
- **F5:** Refresh page (save progress first!)

### Handling Special Cases

**No Bid on Item:**
- Select the item
- Select "No Bid" from bidder dropdown (ID: 0)
- OR click "Skip Item"
- Item marks as skipped

**Multiple Items for Same Bidder:**
- Enter first item bid normally
- After saving, bidder stays selected
- Just select next item and enter price
- Saves time for bidders with multiple wins

**Editing/Correcting Bids:**
- Use Reports > Bidder Details
- Find the bidder
- Click "View Details"
- See all items won
- Contact system administrator to correct database directly if needed

### Progress Tracking

**Items Remaining Count:**
- Shows X of Y items entered
- Updates in real-time

**Recent Entries:**
- Shows last 10 bids
- Confirms data entry accuracy
- Quick visual verification

**Running Total:**
- Sum of all bids entered this session
- Useful for checking against physical total

### Tips for Fast Bid Entry

1. **Have bid sheets organized** before starting
2. **Group by bidder** if possible (faster entry)
3. **Use keyboard shortcuts** instead of mouse
4. **Work steadily** - rhythm is faster than rushing
5. **Verify recent entries** to catch errors immediately
6. **Take short breaks** every 30-40 items

**Expected Speed:**
- Experienced user: 30-40 bids per minute
- New user: 15-20 bids per minute
- 100 items should take 5-10 minutes

---

## Payment Processing

**Purpose:** Record payments and print receipts during checkout

### Accessing Bidder Details

1. Click **"Reports"** in navigation
2. Select auction from dropdown
3. Click **"Bidder Details"** tab

### Bidder Details List

The list shows:
- Bidder names (alphabetically sorted)
- Contact information
- Items won
- Amount Bid (total of winning bids)
- Amount Paid (recorded payments)
- Status (Paid/Unpaid badge)
- Payment method and details

### Searching for Bidders

Use the search box at top of list:
- Type bidder name: "Smith"
- Type bidder ID: "123"
- Type phone digits: "5551234"
- Type email: "john@example.com"

Results filter instantly as you type.

### Recording a Payment

**1. Find the Bidder**
- Use search OR scroll through list
- Click **"Checkout"** button (unpaid) or **"View Details"** (paid)

**2. Review Items Won**
- See complete list of items and prices
- Verify total amount due
- Review with bidder

**3. Record Payment**
Scroll to "Record Payment" section:

**Cash Payment:**
- Amount Paid: (pre-filled with total due, adjust if needed)
- Select "Cash" radio button
- Add notes if needed
- Click "Record Payment"

**Check Payment:**
- Amount Paid: (pre-filled with total due, adjust if needed)
- Select "Check" radio button
- Enter check number in "Check Number" field
- Add notes if needed
- Click "Record Payment"

**4. Print Receipt**
- Click **"Print Receipt"** button
- Clean receipt prints with:
  - Auction information
  - Bidder information
  - Items won with prices
  - Total amount
  - Payment information

### Updating a Payment

If you need to change payment details:
1. Return to bidder's detail page
2. Current payment info shows at top
3. Use form to update amount, method, or check number
4. Click "Update Payment"

**Note:** Changing from check to cash automatically clears check number.

---

## Reports and Export

### Available Reports

**1. Summary Report**
- Total items in auction
- Items sold vs. unsold
- Number of unique bidders
- Total revenue
- Average/highest prices

**2. Bidder Details**
- Complete bidder list with payments
- Search/filter capabilities
- Payment status tracking
- Export to CSV

**3. Item Results**
- All items with winners
- Contact information for winners
- Sold vs. unsold status
- Export to CSV

**4. Unsold Items**
- List of items that received no bids
- Plan for next auction

### Exporting Data

**To Export:**
1. Navigate to desired report
2. Click **"Export CSV"** button
3. File downloads automatically
4. Open in Excel or import to accounting software

**CSV Export Includes:**
- **Bidder Details:** All bidder info, items won, amounts
- **Item Results:** All items, winners, contact info, status

### Working with Exported Data

**Common Uses:**
- Import to QuickBooks or accounting software
- Create mailing lists for future auctions
- Analyze auction performance
- Generate thank-you letters
- Tax documentation

**Excel Tips:**
- Open CSV files in Excel
- Use "Text to Columns" if needed
- Create pivot tables for analysis
- Filter and sort as needed

---

## Tips and Best Practices

### Pre-Auction Preparation

**Week Before:**
- ✓ Register known bidders in system
- ✓ Catalog all auction items
- ✓ Create auction record
- ✓ Assign items to auction

**Day Before:**
- ✓ Verify server is accessible on network
- ✓ Test login from multiple devices
- ✓ Backup database
- ✓ Print item lists for reference

**Day Of:**
- ✓ Set auction status to "Active"
- ✓ Have laptop/tablet ready for bid entry
- ✓ Organize bid sheets for efficient entry

### During Bid Entry

**Optimize Speed:**
- Sort bid sheets before entering
- Group by bidder when possible
- Use keyboard shortcuts exclusively
- Maintain steady rhythm
- Take breaks to avoid errors

**Verify Accuracy:**
- Check recent entries after every 10-15 bids
- Compare running total to physical sheets
- Have second person call out bids if possible

**Handle Problems:**
- If system is slow, check network connection
- If bidder not found, verify spelling
- Save progress frequently (automatic on each bid)

### During Checkout

**Efficient Processing:**
- Print receipts immediately
- Keep cash/checks organized
- Record payments before printing receipt
- Use search function to find bidders quickly

**Customer Service:**
- Review items won with bidder
- Verify total amount
- Thank bidders for participation
- Offer tax receipt if applicable

### Post-Auction Follow-up

**Same Day:**
- ✓ Record all payments received
- ✓ Back up database
- ✓ Export reports for accounting

**Within Week:**
- ✓ Contact unpaid bidders
- ✓ Generate final reports
- ✓ Process any corrections
- ✓ Set auction status to "Completed"

**Planning Next Auction:**
- Review bidder participation
- Analyze item performance
- Keep successful items in catalog
- Update bidder contact information

### Common Workflows

**Quick Bidder Lookup:**
1. Reports > Bidder Details
2. Type name in search
3. View details

**Check Payment Status:**
1. Reports > Bidder Details
2. Look for Paid/Unpaid badge
3. Click to see details

**Find Unsold Items:**
1. Reports > Unsold Items
2. Export list
3. Plan for next auction

**Complete Settlement:**
1. Bid Entry (enter all bids)
2. Bidder Details (record all payments)
3. Export reports (for accounting)
4. Print receipts (for bidders)

## Keyboard Shortcuts Reference

### Bid Entry
- `Tab` - Next field
- `Enter` - Select/Save
- `Esc` - Clear form
- `F5` - Refresh (caution: saves progress)

### Bidder Search
- `Esc` - Clear search
- Start typing - Auto-focuses search field

### General
- `Ctrl + P` - Print (on receipt page)

## Need More Help?

- **[Quick Reference](quick-reference.md)** - Fast lookup of common tasks
- **[Features Overview](features.md)** - Detailed feature descriptions
- **[Troubleshooting](maintenance.md#troubleshooting)** - Common issues and solutions
- **[Installation](installation.md)** - Setup and configuration

## Support

For questions or issues:
1. Check this user guide
2. Review quick reference
3. Contact system administrator
4. Report bugs via GitHub Issues
