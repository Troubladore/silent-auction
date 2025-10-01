# Maintenance Guide

Complete guide for maintaining and troubleshooting the Silent Auction Management System.

## Regular Maintenance Tasks

### Daily (During Auction Season)
- ✓ Verify system is accessible
- ✓ Check backup completed successfully
- ✓ Monitor error logs for issues

### Weekly
- ✓ Review and archive old logs
- ✓ Check database size and performance
- ✓ Verify backups are recoverable

### Monthly
- ✓ Optimize database tables
- ✓ Review user access patterns
- ✓ Update system if security patches available
- ✓ Test backup restoration procedure

### Annually
- ✓ Archive completed auctions
- ✓ Clean up old test data
- ✓ Review and update documentation
- ✓ Plan for hardware upgrades if needed

## Backup Procedures

### Database Backup

**Manual Backup:**
```bash
# Create timestamped backup
mysqldump -u auction_user -p silent_auction > \
  backup_$(date +%Y%m%d_%H%M%S).sql

# With compression
mysqldump -u auction_user -p silent_auction | \
  gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Automated Daily Backup (Linux):**
```bash
# Create backup script
sudo nano /usr/local/bin/auction-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/auction"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u auction_user -pYOUR_PASSWORD silent_auction | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup application files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  /var/www/html/auction

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/auction-backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/auction-backup.sh >> /var/log/auction-backup.log 2>&1
```

### File Backup

**What to Backup:**
```
config/database.php       # Database credentials
config/config.php         # Admin password and settings
assets/                   # Any custom CSS/JS modifications
Database dump             # Complete data
```

**Backup Command:**
```bash
tar -czf auction_backup_$(date +%Y%m%d).tar.gz \
  /var/www/html/auction/config \
  /var/www/html/auction/assets
```

### Restore Procedures

**Restore Database:**
```bash
# Decompress if needed
gunzip backup_20241201.sql.gz

# Restore
mysql -u auction_user -p silent_auction < backup_20241201.sql
```

**Restore Files:**
```bash
# Extract backup
tar -xzf auction_backup_20241201.tar.gz -C /tmp

# Copy config files
sudo cp /tmp/var/www/html/auction/config/* \
  /var/www/html/auction/config/

# Set permissions
sudo chown -R www-data:www-data /var/www/html/auction/config
```

## Database Maintenance

### Optimize Tables
```sql
-- Run monthly
OPTIMIZE TABLE bidders, items, auctions, auction_items, winning_bids, bidder_payments;
```

### Check Table Status
```sql
-- Check table sizes
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = "silent_auction"
ORDER BY (data_length + index_length) DESC;
```

### Verify Indexes
```sql
-- Check existing indexes
SHOW INDEX FROM bidders;
SHOW INDEX FROM items;
SHOW INDEX FROM winning_bids;
```

### Clean Old Test Data
```sql
-- Be careful! Always backup first!
-- Delete test bidders (adjust as needed)
DELETE FROM bidders WHERE last_name LIKE '%Test%';

-- Delete old completed auctions (after archiving)
DELETE FROM auctions WHERE status = 'completed'
  AND auction_date < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

## Log Management

### Apache Error Logs
```bash
# View recent errors
sudo tail -f /var/log/apache2/error.log

# Search for auction-related errors
sudo grep "auction" /var/log/apache2/error.log

# Rotate logs (if not automated)
sudo logrotate /etc/logrotate.d/apache2
```

### MySQL Error Logs
```bash
# View MySQL errors
sudo tail -f /var/log/mysql/error.log

# Check for slow queries (if enabled)
sudo tail -f /var/log/mysql/slow-query.log
```

### Application Logs
PHP errors are logged to Apache error log. Check for:
- Database connection errors
- Query failures
- Permission issues

## Performance Monitoring

### Check System Resources
```bash
# CPU and memory usage
top

# Disk space
df -h

# Check MySQL status
sudo systemctl status mysql

# Check Apache status
sudo systemctl status apache2
```

### Database Performance
```sql
-- Check connection count
SHOW STATUS LIKE 'Threads_connected';

-- Check slow queries
SHOW STATUS LIKE 'Slow_queries';

-- Check table locks
SHOW STATUS LIKE 'Table_locks%';
```

### Web Server Performance
```bash
# Apache connections
sudo netstat -an | grep :80 | wc -l

# Check Apache config
sudo apache2ctl -S

# Test configuration
sudo apache2ctl configtest
```

## Troubleshooting

### System Won't Start

**Apache Won't Start:**
```bash
# Check Apache status
sudo systemctl status apache2

# Check configuration
sudo apache2ctl configtest

# Check error log
sudo tail -50 /var/log/apache2/error.log

# Restart Apache
sudo systemctl restart apache2
```

**MySQL Won't Start:**
```bash
# Check MySQL status
sudo systemctl status mysql

# Check error log
sudo tail -50 /var/log/mysql/error.log

# Try starting manually
sudo systemctl start mysql
```

### Database Connection Errors

**Symptoms:** "Database connection failed" message

**Checks:**
1. Verify MySQL is running: `sudo systemctl status mysql`
2. Test connection:
   ```bash
   mysql -u auction_user -p -h localhost
   ```
3. Check credentials in `config/database.php`
4. Verify user permissions:
   ```sql
   SHOW GRANTS FOR 'auction_user'@'localhost';
   ```

**Fix:**
```sql
-- Recreate user if needed
DROP USER 'auction_user'@'localhost';
CREATE USER 'auction_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON silent_auction.* TO 'auction_user'@'localhost';
FLUSH PRIVILEGES;
```

### Slow Performance

**Symptoms:** Pages load slowly, bid entry > 1 second

**Diagnosis:**
```sql
-- Check for missing indexes
EXPLAIN SELECT * FROM bidders WHERE last_name LIKE 'Smith%';

-- Check table statistics
ANALYZE TABLE bidders, items, winning_bids;

-- Look for table locks
SHOW OPEN TABLES WHERE In_use > 0;
```

**Fixes:**
1. Optimize tables: `OPTIMIZE TABLE bidders, items, winning_bids;`
2. Restart MySQL: `sudo systemctl restart mysql`
3. Check server resources: `top`
4. Review slow query log

### Can't Access from Network

**Symptoms:** Works on server but not from other computers

**Checks:**
1. Verify firewall:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   ```
2. Ping server from client: `ping 192.168.1.100`
3. Check Apache is listening:
   ```bash
   sudo netstat -tulpn | grep :80
   ```
4. Verify network connectivity

### Session/Login Issues

**Symptoms:** Can't login or constantly redirected

**Checks:**
1. Verify session directory:
   ```bash
   ls -la /var/lib/php/sessions
   ```
2. Check permissions:
   ```bash
   sudo chmod 1733 /var/lib/php/sessions
   ```
3. Verify admin password in `config/config.php`
4. Clear browser cache and cookies

### Data Integrity Issues

**Symptoms:** Missing bids, incorrect totals

**Diagnosis:**
```sql
-- Check for orphaned bids
SELECT * FROM winning_bids wb
LEFT JOIN bidders b ON wb.bidder_id = b.bidder_id
WHERE b.bidder_id IS NULL;

-- Check for invalid prices
SELECT * FROM winning_bids WHERE winning_price IS NULL OR winning_price < 0;

-- Verify payment totals
SELECT
  b.bidder_id,
  SUM(wb.winning_price * wb.quantity_won) as amount_bid,
  bp.amount_paid
FROM bidders b
JOIN winning_bids wb ON b.bidder_id = wb.bidder_id
LEFT JOIN bidder_payments bp ON b.bidder_id = bp.bidder_id
  AND bp.auction_id = wb.auction_id
WHERE wb.auction_id = 80
GROUP BY b.bidder_id;
```

## Security Updates

### Update PHP
```bash
# Ubuntu/Debian
sudo apt update
sudo apt upgrade php8.1

# Restart Apache
sudo systemctl restart apache2
```

### Update MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt upgrade mysql-server

# Restart MySQL
sudo systemctl restart mysql
```

### Update Apache
```bash
# Ubuntu/Debian
sudo apt update
sudo apt upgrade apache2

# Restart Apache
sudo systemctl restart apache2
```

### Change Admin Password
```bash
# Edit config file
sudo nano /var/www/html/auction/config/config.php

# Change this line:
define('ADMIN_PASSWORD', 'new_secure_password_here');

# Save and exit
```

## Recovery Procedures

### Complete System Failure

1. **Assess damage**
   - Check hardware
   - Review logs
   - Determine data loss

2. **Restore from backup**
   ```bash
   # Reinstall if needed (see Installation Guide)

   # Restore database
   mysql -u auction_user -p silent_auction < latest_backup.sql

   # Restore files
   tar -xzf auction_backup.tar.gz -C /var/www/html
   ```

3. **Verify restoration**
   - Test login
   - Check recent auction data
   - Verify bidder/item counts

### Data Corruption

1. **Stop making changes immediately**
2. **Backup current state** (even if corrupted)
3. **Restore from most recent known-good backup**
4. **Manual data entry** for any missing recent changes

## Monitoring Checklist

### Daily Checks (2 minutes)
- [ ] System accessible via browser
- [ ] Login works
- [ ] Recent backup exists
- [ ] No critical errors in logs

### Weekly Checks (15 minutes)
- [ ] Database size reasonable
- [ ] Backup restoration tested
- [ ] Performance acceptable
- [ ] Disk space sufficient

### Monthly Checks (30 minutes)
- [ ] All tables optimized
- [ ] Logs reviewed and archived
- [ ] Security updates applied
- [ ] Documentation updated

## Emergency Contacts

**System Down During Auction:**
1. Check server power and network
2. Restart services (Apache, MySQL)
3. Check error logs
4. Contact IT support if needed

**Data Loss:**
1. Stop system immediately
2. Backup current state
3. Restore from backup
4. Document what was lost

## See Also

- [Installation Guide](installation.md) - Initial setup
- [Deployment Guide](deployment.md) - Production deployment
- [Database Schema](database-schema.md) - Database structure
- [Troubleshooting](#troubleshooting) - Common issues
