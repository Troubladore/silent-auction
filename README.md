# Silent Auction Management System

A streamlined PHP/MySQL web application designed for rapid post-auction bid entry and settlement. Built for small organizations running silent auctions with 2-3 concurrent users on a trusted local network.

## Quick Start

**Prerequisites:** PHP 8.1+, MySQL 8.0+, Apache/Nginx web server

```bash
# 1. Clone and setup
git clone <repository-url> auction-system
cd auction-system

# 2. Configure database
cp config/database.php.example config/database.php
# Edit database credentials in config/database.php

# 3. Initialize database
mysql -u root -p < setup/install.sql

# 4. Configure web server to point to this directory

# 5. Login with default admin password (change in config/config.php)
```

**📖 [Complete Installation Guide](docs/installation.md)** - Detailed setup for local network deployment

## Core Workflow

1. **Pre-Auction:** Register bidders, catalog items, create auction, assign items
2. **Post-Auction:** Speed-optimized bid entry (sub-second response, keyboard-driven)
3. **Settlement:** Process payments, print receipts, generate reports

## Key Features

- ⚡ **Speed-Optimized Bid Entry** - Keyboard-driven with real-time lookup (<500ms)
- 💰 **Payment Tracking** - Record cash/check payments with integrated receipts
- 📊 **Comprehensive Reports** - Bidder details, item results, payment summaries
- 🔍 **Live Search Filtering** - Dynamic bidder search on reports
- 📄 **Print-Ready Receipts** - Clean checkout receipts with auction info
- 🔒 **Session-Based Auth** - Simple single-admin security model

## Documentation

### Getting Started
- **[Installation Guide](docs/installation.md)** - Complete setup for local network
- **[User Guide](docs/user-guide.md)** - Step-by-step workflow for running an auction
- **[Quick Reference](docs/quick-reference.md)** - Common tasks and shortcuts

### Technical Documentation
- **[Directory Structure](docs/directory-structure.md)** - Codebase organization
- **[Features Overview](docs/features.md)** - Detailed feature descriptions
- **[Database Schema](docs/database-schema.md)** - Table structure and relationships
- **[API Reference](docs/api-reference.md)** - Endpoint documentation
- **[Technical Details](docs/technical.md)** - Architecture and design decisions

### Maintenance & Development
- **[Deployment Guide](docs/deployment.md)** - Production deployment checklist
- **[Maintenance Guide](docs/maintenance.md)** - Backup, updates, troubleshooting
- **[Developer Notes](docs/developer-notes.md)** - For Claude Code and maintainers

## System Requirements

- **PHP:** 8.1 or higher
- **Database:** MySQL 8.0+ or MariaDB 10.6+
- **Web Server:** Apache 2.4+ or Nginx 1.18+
- **Browser:** Modern browser (Chrome, Firefox, Safari, Edge - last 2 versions)
- **Network:** Local/trusted network environment

## Design Philosophy

This system prioritizes **speed and simplicity** for small organizations:

- **Single-purpose:** Post-auction settlement (not live bidding)
- **Speed-critical:** Bid entry optimized for rapid data collection
- **Minimal complexity:** No frameworks, simple maintenance
- **Trusted environment:** Appropriate security for local networks
- **Single maintainer:** Designed for one technically capable admin

## Technology Stack

- **Backend:** PHP 8.1+ (vanilla, no frameworks)
- **Database:** MySQL 8.0+ with prepared statements
- **Frontend:** Vanilla JavaScript, responsive CSS
- **Dependencies:** None (core PHP extensions only)

## Project Status

**Version:** 1.0
**Status:** Production Ready
**Maintenance:** Stable - enhance cautiously

## Support & Contribution

- **Issues:** Report via GitHub Issues
- **Documentation:** All docs in `/docs` folder
- **Updates:** Check CHANGELOG.md for version history

## License

[Include your license information here]

---

**Need Help?** Start with the [User Guide](docs/user-guide.md) or [Installation Guide](docs/installation.md).
