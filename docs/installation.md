# Installation Guide

Complete guide for installing the Silent Auction Management System on a local network.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation Options](#installation-options)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [Local Network Configuration](#local-network-configuration)
5. [Post-Installation Setup](#post-installation-setup)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## System Requirements

### Server Requirements

**Operating System:**
- Linux (Ubuntu 20.04+, Debian 10+, CentOS 8+)
- Windows (10/11 with XAMPP or WAMP)
- macOS (with MAMP or native Apache)

**Web Server:**
- Apache 2.4+ with mod_rewrite enabled
- OR Nginx 1.18+ (configuration provided)

**PHP:**
- Version: 8.1 or higher
- Required extensions:
  - pdo
  - pdo_mysql
  - mysqli
  - mbstring
  - json
  - session

**Database:**
- MySQL 8.0+ OR MariaDB 10.6+
- Minimum 100MB disk space for database
- InnoDB storage engine

**Hardware (Minimum):**
- CPU: 1 GHz processor
- RAM: 512 MB (1 GB recommended)
- Disk: 100 MB for application + database space
- Network: 100 Mbps LAN connection

### Client Requirements

**Browser (on accessing computers):**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

**Network:**
- All devices on same local network
- Access to server via IP address or hostname

## Installation Options

Choose the installation method that best fits your environment:

### Option A: Linux Server (Recommended for Production)
Best for: Dedicated server, reliability, performance

### Option B: Windows with XAMPP
Best for: Quick setup, Windows familiarity, testing

### Option C: Windows with WAMP
Alternative to XAMPP with similar ease of use

### Option D: macOS with MAMP
Best for: Mac-based server environments

---

## Step-by-Step Installation

### Option A: Linux Server Installation

#### Step 1: Install System Prerequisites

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install Apache
sudo apt install apache2 -y

# Install PHP 8.1 and required extensions
sudo apt install php8.1 php8.1-mysql php8.1-mbstring php8.1-xml php8.1-curl -y

# Install MySQL
sudo apt install mysql-server -y

# Enable Apache modules
sudo a2enmod rewrite
sudo systemctl restart apache2
```

**CentOS/RHEL:**
```bash
# Install Apache
sudo dnf install httpd -y

# Install PHP 8.1
sudo dnf install php php-mysqlnd php-mbstring php-xml php-json -y

# Install MySQL
sudo dnf install mysql-server -y

# Start services
sudo systemctl start httpd
sudo systemctl start mysqld
sudo systemctl enable httpd
sudo systemctl enable mysqld
```

#### Step 2: Secure MySQL Installation

```bash
# Run MySQL secure installation
sudo mysql_secure_installation

# Follow prompts:
# - Set root password
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privilege tables: YES
```

#### Step 3: Create Database and User

```bash
# Log into MySQL as root
sudo mysql -u root -p

# In MySQL prompt, run:
```

```sql
-- Create database
CREATE DATABASE silent_auction CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (change password!)
CREATE USER 'auction_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON silent_auction.* TO 'auction_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

#### Step 4: Download and Install Application

```bash
# Navigate to web root
cd /var/www/html

# Clone or download application
sudo git clone <repository-url> auction

# OR if uploading files:
sudo mkdir auction
sudo chown www-data:www-data auction
# Upload files via SCP/SFTP to /var/www/html/auction/

# Set permissions
sudo chown -R www-data:www-data /var/www/html/auction
sudo chmod -R 755 /var/www/html/auction
sudo chmod 644 /var/www/html/auction/config/*.php
```

#### Step 5: Configure Database Connection

```bash
# Navigate to config directory
cd /var/www/html/auction/config

# Copy example config
sudo cp database.php.example database.php

# Edit database config
sudo nano database.php
```

**Update these values:**
```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'silent_auction');
define('DB_USER', 'auction_user');
define('DB_PASS', 'your_secure_password_here');  // Match MySQL user password
```

#### Step 6: Initialize Database Schema

```bash
# Import database schema
mysql -u auction_user -p silent_auction < /var/www/html/auction/setup/install.sql

# Enter the auction_user password when prompted
```

#### Step 7: Configure Admin Password

```bash
# Edit config file
sudo nano /var/www/html/auction/config/config.php
```

**Change the admin password:**
```php
// Find this line and change the password
define('ADMIN_PASSWORD', 'your_admin_password');
```

#### Step 8: Configure Apache Virtual Host

```bash
# Create virtual host file
sudo nano /etc/apache2/sites-available/auction.conf
```

**Add this configuration:**
```apache
<VirtualHost *:80>
    ServerName auction.local
    ServerAlias auction
    DocumentRoot /var/www/html/auction

    <Directory /var/www/html/auction>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"

    ErrorLog ${APACHE_LOG_DIR}/auction_error.log
    CustomLog ${APACHE_LOG_DIR}/auction_access.log combined
</VirtualHost>
```

**Enable site and restart:**
```bash
# Enable the site
sudo a2ensite auction.conf

# Enable headers module
sudo a2enmod headers

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

---

### Option B: Windows with XAMPP

#### Step 1: Download and Install XAMPP

1. Download XAMPP from https://www.apachefriends.org/
2. Run installer (requires PHP 8.1+)
3. Install to `C:\xampp` (default)
4. Start Apache and MySQL from XAMPP Control Panel

#### Step 2: Extract Application Files

1. Download/extract auction system files
2. Copy to `C:\xampp\htdocs\auction\`

#### Step 3: Create Database

1. Open browser to http://localhost/phpmyadmin
2. Click "New" to create database
3. Database name: `silent_auction`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

#### Step 4: Import Database Schema

1. In phpMyAdmin, select `silent_auction` database
2. Click "Import" tab
3. Choose file: `C:\xampp\htdocs\auction\setup\install.sql`
4. Click "Go"

#### Step 5: Configure Database Connection

1. Open `C:\xampp\htdocs\auction\config\database.php` in text editor
2. Update credentials:

```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'silent_auction');
define('DB_USER', 'root');           // Default XAMPP user
define('DB_PASS', '');               // Default XAMPP password (empty)
```

#### Step 6: Configure Admin Password

1. Open `C:\xampp\htdocs\auction\config\config.php`
2. Change admin password:

```php
define('ADMIN_PASSWORD', 'your_admin_password');
```

#### Step 7: Test Installation

1. Open browser to http://localhost/auction
2. Should see login page
3. Login with configured admin password

---

## Local Network Configuration

### Making the Server Accessible on Local Network

#### Find Server IP Address

**Linux:**
```bash
ip addr show | grep "inet "
# Look for IP like 192.168.1.100
```

**Windows:**
```cmd
ipconfig
# Look for IPv4 Address under your network adapter
```

**macOS:**
```bash
ifconfig | grep "inet "
# Look for IP like 192.168.1.100
```

#### Configure Firewall

**Linux (UFW):**
```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp

# Enable firewall
sudo ufw enable
```

**Windows:**
```powershell
# Open Windows Firewall
# Add inbound rule for port 80 (HTTP)
# Or in XAMPP Control Panel -> Config -> Service Settings
```

#### Access from Other Devices

From any device on the same network:
```
http://192.168.1.100/auction
```
(Replace with your server's IP address)

### Static IP Configuration (Recommended)

To prevent IP address changes:

**Linux:**
```bash
# Edit netplan (Ubuntu 20.04+)
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:  # or your interface name
      dhcp4: no
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

```bash
# Apply configuration
sudo netplan apply
```

**Windows:**
1. Open Network Connections
2. Right-click adapter → Properties
3. Select "Internet Protocol Version 4 (TCP/IPv4)"
4. Click "Properties"
5. Select "Use the following IP address"
6. Enter:
   - IP address: 192.168.1.100
   - Subnet mask: 255.255.255.0
   - Default gateway: 192.168.1.1 (your router IP)
   - DNS: 8.8.8.8

### Using a Hostname (Optional)

Instead of IP addresses, use a friendly hostname:

**Option 1: Edit hosts file on each client**

**Windows clients:** Edit `C:\Windows\System32\drivers\etc\hosts`
**Linux/Mac clients:** Edit `/etc/hosts`

Add line:
```
192.168.1.100    auction.local
```

Then access via: `http://auction.local/auction`

**Option 2: Configure local DNS**
- Set up DNS on your router (if supported)
- Or use dnsmasq on a Linux server

## Post-Installation Setup

### 1. Change Default Credentials

```bash
# Edit config file
nano /var/www/html/auction/config/config.php
```

Change these values:
```php
define('ADMIN_PASSWORD', 'strong_unique_password_here');
```

### 2. Secure Configuration Files

```bash
# Make config files read-only
chmod 600 /var/www/html/auction/config/*.php
```

### 3. Test All Features

1. Login with admin password
2. Create a test bidder
3. Create a test item
4. Create a test auction
5. Assign item to auction
6. Enter a test bid
7. View reports

### 4. Remove Installation Scripts (Optional)

```bash
# After successful installation, you can remove setup files
sudo rm -rf /var/www/html/auction/setup
```

### 5. Configure Backups

See [Maintenance Guide](maintenance.md) for backup procedures.

## Verification

### Check PHP Configuration

```bash
# Check PHP version
php -v

# Check loaded modules
php -m | grep -E 'pdo|mysqli|mbstring|json'
```

### Check MySQL Connection

```bash
# Test MySQL connection
mysql -u auction_user -p -h localhost silent_auction -e "SHOW TABLES;"
```

Should show:
- auctions
- auction_items
- bidders
- bidder_payments
- items
- winning_bids

### Check Web Access

From server:
```bash
curl http://localhost/auction
```

From another device on network:
```bash
curl http://192.168.1.100/auction
```

Both should return HTML (login page).

### Check File Permissions

```bash
ls -la /var/www/html/auction/config/
```

Should show files owned by web server user (www-data) or have appropriate read permissions.

## Troubleshooting

### Database Connection Failed

**Symptom:** "Database connection failed" error

**Solutions:**
1. Verify database credentials in `config/database.php`
2. Check MySQL is running: `sudo systemctl status mysql`
3. Test connection: `mysql -u auction_user -p`
4. Check user permissions:
   ```sql
   SHOW GRANTS FOR 'auction_user'@'localhost';
   ```

### 404 Not Found / Page Not Found

**Symptom:** Pages show 404 errors

**Solutions:**
1. Check .htaccess file exists in root directory
2. Verify mod_rewrite enabled: `sudo a2enmod rewrite`
3. Check Apache AllowOverride is set to "All"
4. Restart Apache: `sudo systemctl restart apache2`

### Cannot Access from Other Computers

**Symptom:** Works on server but not from network

**Solutions:**
1. Verify server IP address: `ip addr`
2. Check firewall allows port 80: `sudo ufw status`
3. Ping server from client: `ping 192.168.1.100`
4. Try server IP directly: `http://192.168.1.100/auction`

### Session Errors / Login Issues

**Symptom:** "Session failed" or constantly redirects to login

**Solutions:**
1. Check session directory exists and is writable
2. Verify PHP session settings in php.ini:
   ```ini
   session.save_path = "/var/lib/php/sessions"
   session.gc_maxlifetime = 1440
   ```
3. Check directory permissions: `sudo chmod 1733 /var/lib/php/sessions`

### Slow Performance

**Symptom:** Bid entry takes > 1 second to respond

**Solutions:**
1. Check database indexes exist:
   ```sql
   SHOW INDEX FROM bidders;
   SHOW INDEX FROM items;
   ```
2. Optimize database: `mysqlcheck -o -u auction_user -p silent_auction`
3. Check server resources: `top` or Task Manager
4. Review Apache/PHP memory limits

### Permission Denied Errors

**Symptom:** Cannot write to files or directories

**Solutions:**
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/html/auction

# Fix permissions
sudo find /var/www/html/auction -type d -exec chmod 755 {} \;
sudo find /var/www/html/auction -type f -exec chmod 644 {} \;
```

### MySQL "Too Many Connections"

**Symptom:** Database connection failures under load

**Solutions:**
1. Edit MySQL config: `sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf`
2. Increase max_connections:
   ```ini
   [mysqld]
   max_connections = 200
   ```
3. Restart MySQL: `sudo systemctl restart mysql`

## Next Steps

After successful installation:

1. **[User Guide](user-guide.md)** - Learn the workflow
2. **[Quick Reference](quick-reference.md)** - Common tasks
3. **[Maintenance Guide](maintenance.md)** - Backup and upkeep
4. **[Features Overview](features.md)** - Explore all features

## Getting Help

If you encounter issues not covered here:

1. Check error logs:
   - Apache: `/var/log/apache2/error.log`
   - MySQL: `/var/log/mysql/error.log`
   - PHP: Check Apache error log

2. Review [Troubleshooting section](#troubleshooting)

3. Check [Maintenance Guide](maintenance.md) for common issues

4. Report issues with:
   - Error messages (exact text)
   - Steps to reproduce
   - Server environment details
   - Log file excerpts
