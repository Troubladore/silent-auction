# Deployment Guide

Production deployment checklist and best practices for the Silent Auction Management System.

## Pre-Deployment Checklist

### Requirements Verification
- [ ] Server meets minimum requirements (PHP 8.1+, MySQL 8.0+)
- [ ] Network infrastructure configured (static IP, firewall rules)
- [ ] Backup system in place
- [ ] Test environment validated
- [ ] Migration plan documented

### Security Checklist
- [ ] Admin password changed from default
- [ ] Database credentials are strong and unique
- [ ] Config files have proper permissions (600)
- [ ] Firewall configured (port 80 only)
- [ ] SSL/TLS considered (if needed for your environment)

### Data Preparation
- [ ] Test data removed or clearly marked
- [ ] Bidder list imported/entered
- [ ] Item catalog prepared
- [ ] Initial auction created

## Deployment Steps

### 1. Server Preparation

**Update System:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install Required Software:**
```bash
# Apache, PHP, MySQL
sudo apt install apache2 php8.1 php8.1-mysql mysql-server -y

# Enable required modules
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

### 2. Application Installation

**Download and Extract:**
```bash
cd /var/www/html
sudo git clone <repository-url> auction
# OR upload files via SCP
```

**Set Permissions:**
```bash
sudo chown -R www-data:www-data /var/www/html/auction
sudo find /var/www/html/auction -type d -exec chmod 755 {} \;
sudo find /var/www/html/auction -type f -exec chmod 644 {} \;
sudo chmod 600 /var/www/html/auction/config/*.php
```

### 3. Database Setup

**Create Database:**
```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE silent_auction CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'auction_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON silent_auction.* TO 'auction_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Import Schema:**
```bash
mysql -u auction_user -p silent_auction < /var/www/html/auction/setup/install.sql
```

### 4. Configuration

**Database Config:**
```bash
sudo nano /var/www/html/auction/config/database.php
```

```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'silent_auction');
define('DB_USER', 'auction_user');
define('DB_PASS', 'STRONG_PASSWORD_HERE');
```

**Application Config:**
```bash
sudo nano /var/www/html/auction/config/config.php
```

```php
<?php
// Change default password!
define('ADMIN_PASSWORD', 'YOUR_SECURE_ADMIN_PASSWORD');

// Session configuration
ini_set('session.gc_maxlifetime', 86400); // 24 hours
ini_set('session.cookie_lifetime', 86400);
```

### 5. Web Server Configuration

**Apache Virtual Host:**
```bash
sudo nano /etc/apache2/sites-available/auction.conf
```

```apache
<VirtualHost *:80>
    ServerName auction.yourdomain.local
    DocumentRoot /var/www/html/auction

    <Directory /var/www/html/auction>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/auction_error.log
    CustomLog ${APACHE_LOG_DIR}/auction_access.log combined

    # PHP settings
    php_value upload_max_filesize 10M
    php_value post_max_size 10M
    php_value memory_limit 128M
</VirtualHost>
```

**Enable and Test:**
```bash
sudo a2ensite auction.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

### 6. Network Configuration

**Static IP (recommended):**
```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

```bash
sudo netplan apply
```

**Firewall:**
```bash
sudo ufw allow 80/tcp
sudo ufw enable
```

### 7. Setup Automated Backups

**Create Backup Script:**
```bash
sudo nano /usr/local/bin/auction-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/auction"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u auction_user -pYOUR_PASSWORD silent_auction | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  /var/www/html/auction/config

# Keep last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE" >> /var/log/auction-backup.log
```

```bash
sudo chmod +x /usr/local/bin/auction-backup.sh

# Schedule daily at 2 AM
sudo crontab -e
0 2 * * * /usr/local/bin/auction-backup.sh
```

### 8. Security Hardening

**Remove Setup Files (After Verification):**
```bash
sudo rm -rf /var/www/html/auction/setup
```

**Secure Config Directory:**
```bash
sudo chmod 600 /var/www/html/auction/config/*.php
sudo chown www-data:www-data /var/www/html/auction/config/*.php
```

**Disable Directory Listing:**
Already handled by `.htaccess` and Apache config (`Options -Indexes`)

**Set PHP Security Settings:**
```bash
sudo nano /etc/php/8.1/apache2/php.ini
```

```ini
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php_errors.log
```

### 9. Testing

**Functionality Tests:**
- [ ] Login works with new admin password
- [ ] Add test bidder
- [ ] Add test item
- [ ] Create test auction
- [ ] Assign item to auction
- [ ] Enter test bid
- [ ] Record test payment
- [ ] Print test receipt
- [ ] Export reports to CSV
- [ ] Delete test data

**Performance Tests:**
- [ ] Bidder lookup < 500ms
- [ ] Item lookup < 500ms
- [ ] Bid save < 1 second
- [ ] Report generation < 2 seconds
- [ ] Page load < 1 second

**Network Tests:**
- [ ] Access from server: `http://localhost/auction`
- [ ] Access from network: `http://192.168.1.100/auction`
- [ ] Access from multiple devices simultaneously
- [ ] Test firewall is blocking other ports

### 10. Documentation

**Create Operations Document:**
- Server IP address
- Admin password location
- Backup location and schedule
- Emergency contacts
- Troubleshooting steps

**Train Users:**
- Provide User Guide
- Walk through bid entry workflow
- Demonstrate payment processing
- Show report generation

## Post-Deployment

### First Week
- [ ] Monitor error logs daily
- [ ] Verify backups running
- [ ] Check performance metrics
- [ ] Address any user issues immediately

### First Month
- [ ] Review backup restoration procedure
- [ ] Optimize based on usage patterns
- [ ] Update documentation with any changes
- [ ] Collect user feedback

## Production Best Practices

### Do's
- ✓ Keep regular backups (daily recommended)
- ✓ Monitor error logs
- ✓ Test backups monthly
- ✓ Keep system updated
- ✓ Document all changes
- ✓ Use strong passwords
- ✓ Restrict access to config files

### Don'ts
- ✗ Never expose to public internet without additional security
- ✗ Don't use default passwords
- ✗ Don't skip backups
- ✗ Don't modify database directly during active use
- ✗ Don't ignore error messages
- ✗ Don't grant unnecessary database privileges

## Rollback Procedure

If deployment fails:

1. **Stop new system:**
   ```bash
   sudo systemctl stop apache2
   ```

2. **Restore previous version:**
   ```bash
   sudo mv /var/www/html/auction /var/www/html/auction.new
   sudo mv /var/www/html/auction.backup /var/www/html/auction
   ```

3. **Restore database:**
   ```bash
   mysql -u auction_user -p silent_auction < backup_before_deploy.sql
   ```

4. **Restart services:**
   ```bash
   sudo systemctl start apache2
   ```

5. **Verify old system works**

## Scaling Considerations

### For Larger Deployments

**Database Optimization:**
```sql
-- Increase connection pool
SET GLOBAL max_connections = 200;

-- Add additional indexes for large datasets
CREATE INDEX idx_bidder_email ON bidders(email);
CREATE INDEX idx_item_desc ON items(item_description(100));
```

**Apache Tuning:**
```apache
# /etc/apache2/mods-enabled/mpm_prefork.conf
<IfModule mpm_prefork_module>
    StartServers             5
    MinSpareServers          5
    MaxSpareServers         10
    MaxRequestWorkers      150
    MaxConnectionsPerChild   0
</IfModule>
```

**PHP Tuning:**
```ini
; /etc/php/8.1/apache2/php.ini
memory_limit = 256M
max_execution_time = 60
max_input_time = 60
```

## Disaster Recovery

### Critical Failure Response

1. **Assess situation**
2. **Restore from backup**
3. **Verify data integrity**
4. **Document incident**
5. **Implement preventive measures**

### Recovery Time Objectives

- **System restoration:** < 30 minutes
- **Data restoration:** < 15 minutes
- **Full verification:** < 60 minutes

## Maintenance Windows

Schedule regular maintenance:
- **Weekly:** Log rotation, temporary file cleanup
- **Monthly:** Database optimization, security updates
- **Quarterly:** Full system backup test
- **Annually:** Major version updates

## Support Plan

### Internal Support
- Designate primary system administrator
- Document admin procedures
- Create troubleshooting runbook

### External Support
- Maintain vendor contacts (if applicable)
- Document escalation procedures
- Keep support documentation current

## Deployment Sign-off

Before going live, verify:
- [ ] All checklist items completed
- [ ] Testing passed
- [ ] Backups verified
- [ ] Users trained
- [ ] Documentation updated
- [ ] Emergency procedures documented
- [ ] Sign-off from stakeholders

---

**Deployment Date:** _________________
**Deployed By:** _________________
**Verified By:** _________________

## See Also

- [Installation Guide](installation.md) - Detailed setup steps
- [Maintenance Guide](maintenance.md) - Ongoing maintenance
- [Database Schema](database-schema.md) - Database structure
- [User Guide](user-guide.md) - End-user documentation
