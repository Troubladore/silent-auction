# Silent Auction Management System

A simple, fast, and efficient web application for managing silent auctions. Built with PHP and MySQL, designed for single-maintainer use with 2-3 concurrent users.

## Features

- **Bidder Management**: Track bidders with contact information and addresses
- **Item Management**: Manage auction items with descriptions and quantities
- **Auction Management**: Create auctions and associate items
- **Fast Bid Entry**: Speed-optimized interface for post-auction winning bid entry
- **Comprehensive Reporting**: Payment summaries, item results, and export capabilities
- **Batch Mode**: Quickly add multiple items to specific auctions

## Quick Start

### Requirements

- PHP 8.1+ with PDO MySQL extension
- MySQL 8.0+ or MariaDB 10.6+
- Web server (Apache/Nginx) or local development environment (XAMPP/WAMP/MAMP)

### Installation

1. **Clone or download** this repository to your web server directory
2. **Create database** and import the setup script:
   ```sql
   mysql -u root -p < setup/install.sql
   ```
3. **Configure database connection** in `config/database.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'silent_auction');
   define('DB_USER', 'your_username');
   define('DB_PASS', 'your_password');
   ```
4. **Set admin password** in `config/config.php`:
   ```php
   define('ADMIN_PASSWORD', 'your_secure_password');
   ```
5. **Access the application** in your web browser
6. **Login** with your configured password

### Default Login

- **URL**: `http://your-domain/login.php`
- **Default Password**: `auction123` (change this immediately!)

## Usage Guide

### Basic Workflow

1. **Add Bidders**: Enter bidder information at any time
2. **Create Items**: Add items that can be reused across auctions
3. **Create Auction**: Set up auction with date and description
4. **Associate Items**: Add items to the auction
5. **Conduct Auction**: (physical/external process)
6. **Enter Winning Bids**: Use fast entry interface for quick data entry
7. **Generate Reports**: Create payment summaries and checkout receipts

### Fast Bid Entry

The bid entry interface is optimized for speed:

- **Keyboard Navigation**: Tab through fields, Enter to save
- **Real-time Lookup**: Type bidder ID or name for instant search
- **Progress Tracking**: Visual progress bar and item counting
- **Quick Navigation**: Jump to any item instantly
- **Batch Processing**: Process all auction items systematically

**Keyboard Shortcuts:**
- `Enter` - Save current bid and move to next field/item
- `Tab` - Move to next field
- `F5` - Skip current item (no winner)
- `Escape` - Clear current form
- Click item numbers to jump to specific items

### Batch Mode (Items)

When adding multiple items for the same auction:

1. Go to Items page
2. Select auction from "Batch Mode" dropdown
3. Add items - they'll automatically be added to the selected auction
4. Use "Add & Add Another" for rapid entry

### Reports

Generate various reports for auction results:

- **Summary**: Overview with statistics and top performers
- **Bidder Payments**: Individual bidder totals and contact info
- **Item Results**: Complete item-by-item breakdown
- **Unsold Items**: Items that need follow-up

Export options:
- **CSV**: For importing into accounting software
- **Print**: Optimized checkout receipts for bidders

## File Structure

```
auction_system/
├── config/              # Configuration files
├── includes/            # Common includes (header, footer, functions)
├── classes/             # PHP classes (Database, Bidder, Item, etc.)
├── pages/               # Main application pages
├── api/                 # AJAX endpoints
├── assets/              # CSS and JavaScript files
├── setup/               # Database setup scripts
├── login.php            # Login page
└── README.md           # This file
```

## Security Notes

- Change the default password immediately after installation
- The system uses prepared statements to prevent SQL injection
- Session-based authentication for simple access control
- Input validation and sanitization throughout
- No remote access features - designed for local/trusted network use

## Customization

### Database Configuration
Edit `config/database.php` for your database settings.

### Application Settings
Edit `config/config.php` for app name, version, and authentication.

### Styling
Modify `assets/css/style.css` for visual customization.

### Adding Features
The modular class structure makes it easy to extend functionality.

## Troubleshooting

### Database Connection Issues
1. Verify database credentials in `config/database.php`
2. Ensure MySQL/MariaDB is running
3. Check that the database exists and tables are created

### Login Problems
1. Verify password in `config/config.php`
2. Check that sessions are working (session directory writable)

### Permission Issues
1. Ensure web server can read all files
2. Check PHP error logs for specific issues

### Performance Issues
1. Add database indexes if handling large datasets
2. Consider enabling PHP OPcache for better performance

## Technical Specifications

- **Backend**: PHP 8.1+ with PDO
- **Database**: MySQL 8.0+ / MariaDB 10.6+
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile**: Responsive design for tablet use

## Support

This is a simple application designed for basic auction management. For issues:

1. Check the troubleshooting section
2. Review PHP error logs
3. Verify database connectivity
4. Ensure all required files are present

## License

This project is provided as-is for silent auction management. Modify as needed for your specific requirements.

---

**Version**: 1.0  
**Last Updated**: 2024