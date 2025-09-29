# Installation Guide - Silent Auction Management System

## Prerequisites

Before installing, ensure you have:

- **PHP 8.1 or higher** with the following extensions:
  - PDO MySQL extension
  - Session support (enabled by default)
- **MySQL 8.0+ or MariaDB 10.6+**
- **Web server** (Apache, Nginx) or local development environment

## Step-by-Step Installation

### 1. Download and Extract

Download or clone this repository to your web server's document root:

```bash
# If using git
git clone <repository-url> auction_system

# Or extract downloaded ZIP to your web directory
# Example: /var/www/html/auction_system (Linux/Apache)
# Example: C:\xampp\htdocs\auction_system (Windows/XAMPP)
```

### 2. Database Setup

**Option A: Command Line**
```bash
mysql -u root -p
```
Then run:
```sql
source /path/to/auction_system/setup/install.sql
```

**Option B: phpMyAdmin or similar tool**
1. Open your database management tool
2. Create a new database called `silent_auction`
3. Import the file `setup/install.sql`

**Option C: Manual Database Creation**
Copy and paste the SQL from `setup/install.sql` into your database tool.

### 3. Configure Database Connection

Edit `config/database.php`:

```php
<?php
// Update these settings for your environment
define('DB_HOST', 'localhost');     // Usually 'localhost'
define('DB_NAME', 'silent_auction'); // Database name
define('DB_USER', 'your_username');  // Your database username
define('DB_PASS', 'your_password');  // Your database password
?>
```

**Common Settings:**
- **XAMPP/WAMP**: Usually `root` with empty password
- **Production**: Use a dedicated database user with minimal privileges

### 4. Set Admin Password

Edit `config/config.php`:

```php
// Change this password immediately!
define('ADMIN_PASSWORD', 'your_secure_password_here');
```

**Password Requirements:**
- Use a strong, unique password
- Avoid common passwords or dictionary words
- Consider using a password manager

### 5. File Permissions (Linux/Mac)

Ensure proper file permissions:

```bash
# Make files readable by web server
chmod -R 644 auction_system/
chmod -R 755 auction_system/
chmod 755 auction_system/pages/
chmod 755 auction_system/api/
```

### 6. Web Server Configuration

**Apache (.htaccess)**
Create a `.htaccess` file in the root directory:

```apache
# Optional: Redirect to HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Prevent access to config files
<Files "*.php">
    <RequireAll>
        Require all granted
    </RequireAll>
</Files>

<Files "config/*.php">
    Require all denied
</Files>
```

**Nginx**
Add to your server block:

```nginx
location ~ ^/config/ {
    deny all;
    return 403;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

### 7. Test Installation

1. **Access the application**:
   - Navigate to: `http://your-domain/auction_system/login.php`
   - Or: `http://localhost/auction_system/login.php` (local development)

2. **Login**:
   - Use the password you set in step 4
   - Default is `auction123` if unchanged

3. **Verify functionality**:
   - Create a test bidder
   - Create a test item
   - Create a test auction
   - Test bid entry interface

## Environment-Specific Instructions

### XAMPP (Windows/Mac/Linux)

1. Install XAMPP and start Apache + MySQL
2. Extract files to `C:\xampp\htdocs\auction_system\` (Windows)
3. Access via `http://localhost/auction_system/login.php`
4. Use database settings:
   - Host: `localhost`
   - User: `root`
   - Password: (leave empty)
   - Database: `silent_auction`

### WAMP (Windows)

1. Install WAMP and ensure services are running
2. Extract files to `C:\wamp64\www\auction_system\`
3. Access via `http://localhost/auction_system/login.php`
4. Similar database settings to XAMPP

### MAMP (Mac)

1. Install MAMP and start servers
2. Extract files to `/Applications/MAMP/htdocs/auction_system/`
3. Access via `http://localhost:8888/auction_system/login.php`
4. Database settings:
   - Host: `localhost`
   - User: `root`
   - Password: `root`
   - Database: `silent_auction`

### Linux Production Server

1. Install LAMP stack:
   ```bash
   sudo apt update
   sudo apt install apache2 mysql-server php8.1 php8.1-mysql php8.1-cli
   ```

2. Extract to `/var/www/html/auction_system/`

3. Set proper ownership:
   ```bash
   sudo chown -R www-data:www-data /var/www/html/auction_system/
   ```

4. Configure virtual host (optional but recommended)

## Post-Installation Setup

### 1. Change Default Password
Immediately change the admin password in `config/config.php`.

### 2. Add Sample Data (Optional)
The installation script includes sample bidders, items, and auctions for testing.

### 3. Customize Application
- Edit `config/config.php` to change app name
- Modify `assets/css/style.css` for custom styling
- Update contact information or help text as needed

### 4. Security Checklist
- [ ] Changed default admin password
- [ ] Restricted access to config directory
- [ ] Enabled HTTPS (production)
- [ ] Regular database backups
- [ ] Updated PHP to latest version

## Troubleshooting Installation Issues

### Database Connection Errors
```
Error: Database connection failed
```
**Solution**: Check database credentials in `config/database.php`

### Permission Denied Errors
```
Error: Permission denied
```
**Solution**: Check file permissions and web server user

### PHP Extension Missing
```
Error: PDO MySQL extension not found
```
**Solution**: Install php-mysql extension:
```bash
# Ubuntu/Debian
sudo apt install php8.1-mysql

# CentOS/RHEL
sudo yum install php-mysql
```

### Session Errors
```
Error: Session could not be started
```
**Solution**: Check that session directory is writable:
```bash
# Check PHP session directory
php -i | grep session.save_path
```

### 404 Errors
```
Error: Page not found
```
**Solution**: 
1. Check web server is running
2. Verify file paths are correct
3. Check web server configuration

## Backup and Maintenance

### Database Backup
```bash
# Create backup
mysqldump -u root -p silent_auction > auction_backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u root -p silent_auction < auction_backup_20241201.sql
```

### File Backup
```bash
# Create complete backup
tar -czf auction_system_backup_$(date +%Y%m%d).tar.gz auction_system/
```

## Upgrading

When updating to a new version:

1. **Backup** current installation and database
2. **Download** new version
3. **Preserve** your `config/database.php` and `config/config.php` files
4. **Copy** new files over old installation
5. **Run** any provided update scripts
6. **Test** functionality

## Need Help?

1. **Check Prerequisites**: Ensure all requirements are met
2. **Review Error Logs**: Check web server and PHP error logs
3. **Verify Configuration**: Double-check database and app settings
4. **Test Components**: Try each feature individually

---

After successful installation, proceed to the main [README.md](README.md) for usage instructions.