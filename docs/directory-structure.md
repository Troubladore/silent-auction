# Directory Structure

This document explains the organization of the Silent Auction Management System codebase.

## Overview

```
auction-system/
├── api/                    # AJAX API endpoints (JSON responses)
├── assets/                 # Static resources (CSS, JS, images)
├── classes/                # PHP business logic classes
├── config/                 # Configuration files (secured)
├── docs/                   # Documentation
├── includes/               # Shared PHP includes
├── pages/                  # User-facing pages
├── setup/                  # Installation and migration scripts
├── .htaccess              # Apache configuration
├── index.php              # Entry point (redirects to login)
├── login.php              # Authentication page
├── logout.php             # Session termination
└── README.md              # Project overview
```

## Detailed Structure

### `/api/` - API Endpoints
Speed-critical AJAX endpoints for real-time operations.

```
api/
├── lookup.php           # Real-time bidder/item search (< 500ms target)
├── save_bid.php         # Bid persistence endpoint
└── save_payment.php     # Payment recording endpoint
```

**Purpose:** JSON API endpoints for asynchronous operations
**Security:** All endpoints require active session (`requireLogin()`)
**Performance:** Optimized for sub-second response times

### `/assets/` - Static Resources
All CSS, JavaScript, and image files.

```
assets/
├── css/
│   └── style.css        # Complete application styling
└── js/
    └── auction.js       # Bid entry interface logic
```

**Purpose:** Client-side resources
**Build:** No build process - vanilla CSS/JS
**Caching:** Served with cache headers via .htaccess

### `/classes/` - Business Logic
Object-oriented PHP classes for core functionality.

```
classes/
├── Auction.php          # Auction CRUD and bid entry
├── Bidder.php           # Bidder management and lookup
├── Database.php         # Database abstraction layer
├── Item.php             # Item catalog management
└── Report.php           # Report generation and payments
```

**Purpose:** Encapsulate business logic and database operations
**Pattern:** Each class represents a domain entity
**Database:** All queries use prepared statements via Database.php

#### Class Responsibilities

**Database.php**
- PDO connection management
- Query execution with prepared statements
- CRUD helper methods (insert, update, delete, fetch)
- Transaction support

**Auction.php**
- Auction creation and management
- Bid entry and validation
- Item-auction associations
- Winning bid tracking

**Bidder.php**
- Bidder registration and updates
- Real-time search and lookup
- Bidder information retrieval

**Item.php**
- Item catalog management
- Item CRUD operations
- Item-auction assignments

**Report.php**
- Auction summaries and statistics
- Bidder payment reports
- Item result reports
- Payment tracking and recording
- CSV export generation

### `/config/` - Configuration
Environment-specific settings.

```
config/
├── config.php           # Application settings and admin password
└── database.php         # Database credentials
```

**Security:** Protected by .htaccess (deny all direct access)
**Environment:** Modify for dev/staging/production
**Credentials:** Never commit real credentials to version control

### `/docs/` - Documentation
Comprehensive system documentation.

```
docs/
├── installation.md           # Complete setup guide
├── user-guide.md            # End-user workflow documentation
├── quick-reference.md       # Common tasks and shortcuts
├── directory-structure.md   # This file
├── features.md              # Detailed feature descriptions
├── database-schema.md       # Database structure
├── api-reference.md         # API endpoint documentation
├── technical.md             # Architecture and design
├── deployment.md            # Production deployment
├── maintenance.md           # Backup and troubleshooting
└── developer-notes.md       # For maintainers and Claude Code
```

**Purpose:** Layered documentation from beginner to advanced
**Format:** Markdown for easy reading and contribution
**Maintenance:** Update when adding features or changing behavior

### `/includes/` - Shared Includes
Common PHP utilities and page components.

```
includes/
├── functions.php        # Utility functions (formatting, validation)
├── header.php           # Standard page header
└── footer.php           # Standard page footer
```

**Purpose:** DRY principle - shared code used across pages
**Usage:** Included via `require_once` in page files

#### Common Functions (functions.php)

- `sanitize($string)` - HTML output escaping
- `formatCurrency($amount)` - Money formatting
- `formatPhone($number)` - Phone number formatting
- `requireLogin()` - Session validation
- `jsonResponse($data, $code)` - JSON response helper

### `/pages/` - User Interface
All user-facing pages (requires authentication).

```
pages/
├── index.php            # Dashboard (auction overview)
├── bidders.php          # Bidder management
├── items.php            # Item catalog
├── auctions.php         # Auction creation and management
├── bid_entry.php        # Core feature: speed-optimized bid entry
└── reports.php          # Reports and payment processing
```

**Purpose:** User interface pages
**Security:** All pages require login (session check in header.php)
**Structure:** Include header, page content, include footer

#### Page Descriptions

**index.php (Dashboard)**
- Auction overview cards
- Quick stats (items, bids, revenue)
- Navigation to all major functions

**bidders.php**
- List all bidders with search
- Add new bidders
- Edit bidder information
- View bidder history

**items.php**
- Item catalog management
- Add/edit items
- Assign items to auctions
- Track item status

**auctions.php**
- Create new auctions
- Manage auction details
- Assign items to auctions
- Set auction status (planning/active/completed)

**bid_entry.php** ⚡ CRITICAL - Speed Optimized
- Real-time bidder lookup (typeahead)
- Real-time item lookup (typeahead)
- Keyboard-driven workflow (Tab/Enter/Esc/F5)
- Visual progress tracking
- Running total display
- Recent entries feedback
- Quick item navigation

**reports.php**
- Auction summary statistics
- Bidder details with payment tracking
- Live bidder search/filter
- Payment recording forms
- Print-ready receipts
- Item results with winners
- Unsold items list
- CSV export functionality

### `/setup/` - Installation
Database setup and migration scripts.

```
setup/
├── install.sql              # Complete database schema
└── migrations/
    └── add_bidder_payments.sql   # Example migration
```

**Purpose:** Database initialization and schema updates
**Usage:** Run once during installation, migrations as needed
**Security:** Block web access after installation

### Root Files

**index.php**
- Entry point for the application
- Redirects to login.php if not authenticated
- Redirects to pages/index.php if authenticated

**login.php**
- Simple authentication form
- Session creation on valid login
- Single admin password model

**logout.php**
- Session termination
- Redirect to login page

**.htaccess**
- Apache configuration
- Security headers
- Access restrictions for config/
- PHP settings (error handling, sessions)
- Cache control for static assets

## File Naming Conventions

- **PHP files:** lowercase with underscores (e.g., `bid_entry.php`)
- **Classes:** PascalCase matching class name (e.g., `Auction.php`)
- **CSS/JS:** lowercase with hyphens (e.g., `style.css`)
- **Config:** lowercase with underscores (e.g., `database.php`)

## File Organization Principles

### Separation of Concerns
- **Presentation** (pages/) separate from **logic** (classes/)
- **Configuration** (config/) separate from **code**
- **Static assets** (assets/) separate from **dynamic content**

### Dependency Flow
```
pages/bid_entry.php
  ↓ requires
includes/header.php
  ↓ requires
config/config.php
  ↓ requires
config/database.php

pages/bid_entry.php
  ↓ uses
classes/Auction.php, classes/Bidder.php
  ↓ use
classes/Database.php
```

### Security Layers
1. **Web server** (.htaccess) - Deny config/ access
2. **Session** (requireLogin()) - All pages/API check auth
3. **Database** (prepared statements) - SQL injection prevention
4. **Output** (sanitize()) - XSS prevention

## Adding New Features

### To add a new page:
1. Create PHP file in `/pages/`
2. Include header.php (handles auth and includes)
3. Implement page logic
4. Include footer.php
5. Add navigation link in header.php

### To add a new API endpoint:
1. Create PHP file in `/api/`
2. Require config/config.php
3. Call `requireLogin()` immediately
4. Set `header('Content-Type: application/json')`
5. Use `jsonResponse()` for all outputs
6. Implement logic using classes/
7. Call endpoint from JavaScript with fetch()

### To add a new database table:
1. Add CREATE TABLE to `setup/install.sql`
2. Create migration script in `setup/migrations/`
3. Create or update class in `classes/` for CRUD operations
4. Document in `docs/database-schema.md`

### To add a new feature:
1. Update database schema (if needed)
2. Implement business logic in appropriate class
3. Create or update page UI
4. Add API endpoint (if needed)
5. Update documentation
6. Test thoroughly

## Critical Performance Paths

### Bid Entry Workflow (Speed Critical)
```
pages/bid_entry.php
  → User types in bidder field
  → assets/js/auction.js debounces input
  → api/lookup.php?type=bidder&term=XXX
  → classes/Bidder.php::search()
  → classes/Database.php::fetchAll() [indexed query]
  → JSON response in < 500ms
  → JavaScript updates dropdown
```

**Performance Requirements:**
- Lookup API: < 500ms response time
- Bid save: < 1 second for confirmation
- Database: Proper indexes on search fields

### Payment Processing
```
pages/reports.php
  → User fills payment form
  → JavaScript submits via fetch()
  → api/save_payment.php
  → classes/Report.php::savePayment()
  → classes/Database.php::insert() or update()
  → Page reloads with updated payment status
```

## Security Considerations

### Access Control
- **Public:** login.php only
- **Authenticated:** Everything else
- **Direct File Access:** Denied for config/, classes/, includes/

### Data Protection
- **SQL Injection:** Prevented by prepared statements
- **XSS:** Prevented by `sanitize()` on all output
- **CSRF:** Not needed (trusted network, single admin)
- **Passwords:** Stored in config (single admin model)

### File Permissions
```
Directories: 755 (drwxr-xr-x)
PHP files: 644 (-rw-r--r--)
Config files: 600 (-rw-------)  [Optional: extra security]
```

## Maintenance Paths

### Backup Critical Files
```
config/database.php          # Database credentials
config/config.php            # Admin password
setup/install.sql            # Database schema
Database dump                # All auction data
```

### Logs and Debugging
- PHP errors: Check web server error log
- Database errors: Logged via Database.php
- JavaScript errors: Browser console

### Common File Modifications
- **Change admin password:** `config/config.php`
- **Update database credentials:** `config/database.php`
- **Modify styling:** `assets/css/style.css`
- **Adjust bid entry behavior:** `assets/js/auction.js`
- **Add report types:** `classes/Report.php` and `pages/reports.php`

## See Also

- [Installation Guide](installation.md) - Setup instructions
- [Database Schema](database-schema.md) - Table structures
- [API Reference](api-reference.md) - Endpoint documentation
- [Technical Details](technical.md) - Architecture decisions
