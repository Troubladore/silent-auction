# Claude Code Repository Notes - Silent Auction Management System

## Project Overview
**Repository**: `bchmo_auction`  
**Type**: PHP/MySQL Web Application  
**Purpose**: Silent auction management with speed-optimized bid entry  
**Target Users**: Single maintainer, 2-3 concurrent users maximum  
**Environment**: Local/trusted network deployment  

## Design Intent & Philosophy

### Core Design Principles
1. **Speed Above All**: Fast bid entry is the primary requirement - optimize everything for post-auction speed
2. **Simplicity First**: Minimal features, maximum utility - avoid unnecessary complexity
3. **Single Maintainer**: Design assumes one technically capable person manages everything
4. **Trusted Environment**: Security appropriate for local/internal use, not internet-facing
5. **Workflow-Optimized**: Every feature designed around the actual auction workflow

### Primary Use Case
Silent auction organizations that need to:
- Pre-register bidders and catalog items at their own pace
- Create auctions and associate items flexibly
- **RAPIDLY enter winning bids** after auction concludes (this is the bottleneck)
- Generate professional payment summaries and receipts for settlement
- Export data for accounting integration

## Technical Architecture Decisions

### Technology Stack Rationale
- **PHP 8.1+**: Mature, stable, widely supported, easy deployment
- **MySQL**: Proven reliability for this data scale, excellent performance
- **Vanilla JavaScript**: No framework dependencies, fast loading, simple maintenance
- **Minimal Dependencies**: Only core PHP extensions, no external libraries

### Database Design Philosophy
- **Independent Entities**: Bidders and Items exist independently for reusability
- **Flexible Associations**: Items can be added to auctions at any time via junction table
- **Referential Integrity**: Foreign keys maintain data consistency
- **Performance Indexes**: Strategic indexing for real-time lookup speed

### Security Model
**Trusted Environment Security** (not internet-facing):
- Session-based authentication with single admin password
- SQL injection prevention via prepared statements throughout
- XSS protection via output sanitization
- File access restrictions via .htaccess
- No user registration, password reset, or other complex auth features

## Key Implementation Details

### Speed-Critical: Bid Entry Interface
This is the most important feature - everything else supports this:

**Speed Optimizations**:
- Real-time AJAX lookup (bidder ID → name display in <500ms)
- Keyboard-driven workflow (Enter/Tab/F5/Esc shortcuts)
- Auto-focus progression through fields
- Visual progress tracking
- Quick item navigation (click to jump to any item)
- Running total calculation
- Recent entries feedback
- Form state preservation

**Technical Implementation**:
- `BidEntry` JavaScript class handles all interaction
- `/api/lookup.php` provides sub-second bidder/item search
- `/api/save_bid.php` handles bid persistence with error handling
- Progress tracking via session data and DOM updates
- Optimistic UI updates with server confirmation

### Critical File Relationships
```
Entry Points:
- login.php → pages/index.php (dashboard)
- pages/bid_entry.php (core feature - speed critical)

Core Business Logic:
- classes/Database.php (all data access)
- classes/Auction.php (bid entry backend)
- classes/Bidder.php (lookup functionality)  
- classes/Report.php (settlement reports)

Speed-Critical APIs:
- api/lookup.php (real-time search)
- api/save_bid.php (bid persistence)

Asset Pipeline:
- assets/css/style.css (complete styling)
- assets/js/auction.js (bid entry interface)
```

### Configuration Management
**Environment-Specific Settings**:
- `config/database.php` - Database connection (modify per environment)
- `config/config.php` - App settings and admin password
- `.htaccess` - Web server security and optimization

**Deployment Variations**:
- Local development: XAMPP/WAMP with default settings
- Production: Update database credentials and admin password

## Maintenance Guidelines

### Code Maintenance Principles
1. **Preserve Speed**: Any changes must maintain bid entry performance
2. **Maintain Simplicity**: Resist feature creep - this is intentionally minimal
3. **Test Bid Entry**: Any database or API changes must be tested in bid entry interface
4. **Backup Before Changes**: Always backup database before schema changes

### Common Maintenance Tasks

#### Database Updates
```sql
-- Always backup first
mysqldump -u user -p silent_auction > backup_$(date +%Y%m%d).sql

-- Index maintenance (run monthly)
OPTIMIZE TABLE bidders, items, auctions, auction_items, winning_bids;

-- Performance analysis
EXPLAIN SELECT * FROM bidders WHERE first_name LIKE '%term%';
```

#### Security Updates
- Update PHP to latest stable version
- Monitor error logs: `/var/log/apache2/error.log`
- Review and update admin password regularly
- Check .htaccess file integrity

#### Performance Monitoring
- Monitor bid entry API response times (`/api/lookup.php` should be <500ms)
- Check database query performance during busy periods
- Monitor session storage and cleanup

### Extension Guidelines

#### Safe Extensions
- **Additional report formats**: Add new report types in `Report.php`
- **CSV export variations**: Modify export functions for different accounting software
- **UI styling**: Update `assets/css/style.css` for visual customization
- **Validation rules**: Add business rule validation in model classes

#### Risky Extensions
- **Authentication changes**: Current system assumes single admin
- **Database schema changes**: Could break existing data
- **JavaScript framework additions**: Could slow down bid entry interface
- **Complex user management**: Against design philosophy

#### Never Change
- **Bid entry keyboard shortcuts**: Users depend on muscle memory
- **Database connection pattern**: Uses prepared statements for security
- **Core API endpoints**: Bid entry interface depends on exact responses
- **Session security**: Current implementation is appropriate for use case

## File Organization Logic

### Directory Structure Rationale
```
config/          # Environment-specific settings (secured via .htaccess)
includes/        # Shared UI components and utility functions  
classes/         # Business logic in object-oriented classes
pages/           # User interface pages (main application)
api/             # AJAX endpoints (optimized for speed)
assets/          # Static resources (single CSS/JS files)
setup/           # Database installation (block access after setup)
documentation/   # Complete project documentation
```

### Critical Dependencies
- `config/config.php` → All pages (authentication and app settings)
- `classes/Database.php` → All other classes (data access layer)
- `includes/functions.php` → All pages (utility functions)
- `assets/js/auction.js` → `pages/bid_entry.php` (core functionality)

## Testing & Quality Assurance

### Critical Test Scenarios
1. **Bid Entry Speed Test**: Time full auction processing (should be <2 min per item)
2. **Lookup Performance**: Search response times under load
3. **Data Integrity**: Ensure bids save correctly and totals calculate properly
4. **Cross-Browser**: Test in Chrome, Firefox, Safari on desktop
5. **Error Handling**: Network failures during bid entry should recover gracefully

### Deployment Testing
- [ ] Database connection successful
- [ ] Login works with configured password
- [ ] Bidder/Item CRUD operations function
- [ ] Auction creation and item association works
- [ ] **Bid entry interface fully functional** (critical test)
- [ ] Reports generate correctly and export properly
- [ ] Real-time lookup responds quickly

## Backup & Recovery

### Critical Backup Components
1. **Database**: Contains all auction data (most critical)
2. **Configuration Files**: `config/database.php` and `config/config.php`
3. **Uploaded Assets**: Any customizations to CSS/images

### Backup Commands
```bash
# Complete backup
mysqldump -u user -p silent_auction > backup_$(date +%Y%m%d).sql
tar -czf auction_system_backup_$(date +%Y%m%d).tar.gz auction_system/

# Restore database
mysql -u user -p silent_auction < backup_20241201.sql
```

## Troubleshooting Common Issues

### Performance Issues
- **Slow Lookup**: Check database indexes, particularly on bidders/items tables
- **Slow Bid Entry**: Verify API response times, check session storage
- **Page Load Issues**: Review asset compression and database query efficiency

### Data Issues
- **Missing Bids**: Check `winning_bids` table for foreign key constraint violations
- **Incorrect Totals**: Verify `winning_price` and `quantity_won` data types
- **Search Problems**: Check bidder/item data for special characters

### Configuration Issues
- **Database Connection**: Verify credentials in `config/database.php`
- **Login Problems**: Check admin password in `config/config.php`
- **Permission Errors**: Verify web server can read all files

## Future Enhancement Considerations

### Potential Improvements (Maintain Design Philosophy)
- **Mobile Optimization**: Touch-friendly bid entry for tablets
- **Advanced Reporting**: Custom report builder
- **Email Integration**: Automated receipt delivery
- **API Expansion**: RESTful API for external integrations

### Avoid These Enhancements (Against Design Intent)
- **Multi-user Authentication**: Contradicts single-maintainer design
- **Online Bidding**: This is for post-auction settlement only
- **Complex Inventory**: Keep item management simple
- **Social Features**: Not needed for auction management

## Documentation Maintenance

### Keep Updated
- `FEATURES.md`: When adding new capabilities
- `TECHNICAL.md`: When changing architecture or APIs
- `README.md`: When changing setup or basic usage
- `INSTALL.md`: When changing requirements or deployment

### Version Information
- **Current Version**: 1.0
- **PHP Requirements**: 8.1+
- **Database**: MySQL 8.0+ / MariaDB 10.6+
- **Browser Support**: Modern browsers (last 2 versions)

## Claude Code Integration Notes

### Repository Type Recognition
This is a **specialized web application** with:
- Domain-specific functionality (auction management)
- Performance-critical workflows (bid entry)
- Simple deployment model (single server)
- Maintenance by single person

### Code Analysis Patterns
When analyzing this code:
1. **Focus on bid entry workflow** - this is the core functionality
2. **Understand the speed requirements** - sub-second responses critical
3. **Recognize security model** - appropriate for trusted environment
4. **Respect simplicity** - resist over-engineering suggestions

### Assistance Guidelines
- **Performance**: Always consider impact on bid entry speed
- **Security**: Remember trusted environment context
- **Complexity**: Favor simple solutions over complex ones  
- **Workflow**: Understand the real-world auction process
- **Documentation**: Keep all documentation current with changes

---

**Last Updated**: December 2024  
**Repository Status**: Complete and Production-Ready  
**Maintenance Mode**: Stable - enhance cautiously