// Silent Auction Management System - JavaScript

// Bid Entry Interface
class BidEntry {
    constructor() {
        this.currentItemIndex = 0;
        this.items = window.auctionItems || [];
        this.recentEntries = [];
        this.runningTotal = 0;
        this.processedCount = 0;
        this.selectedBidder = null;
        this.currentBid = null; // Store current bid for editing
        this.activityLog = []; // Activity logging for debugging

        // Typeahead navigation state
        this.highlightedBidderIndex = -1;
        this.highlightedItemIndex = -1;

        // Lookup timeouts for debouncing
        this.bidderLookupTimeout = null;
        this.itemLookupTimeout = null;

        // Store global reference for onclick handlers
        window.bidEntryInstance = this;
        
        this.logActivity('BidEntry initialized', {
            itemCount: this.items.length,
            auctionId: document.getElementById('auction-id')?.value
        });
        
        this.init();
    }
    
    init() {
        if (!this.items.length) {
            this.logActivity('No items found', { itemCount: 0 });
            return;
        }

        this.bindEvents();
        this.loadCurrentItem();
        this.updateProgress();
        this.calculateRunningTotal();

        // Render item status grid with click handlers
        // This replaces the PHP-rendered cards with JS-rendered ones
        this.refreshItemStatuses();

        // Focus first field (now item ID)
        document.getElementById('item-id').focus();

        this.logActivity('BidEntry initialized successfully', {
            currentItemIndex: this.currentItemIndex,
            itemCount: this.items.length
        });
    }
    
    logActivity(action, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            action,
            data: { ...data },
            currentItemIndex: this.currentItemIndex,
            selectedBidder: this.selectedBidder ? {
                id: this.selectedBidder.id,
                name: this.selectedBidder.name
            } : null
        };
        
        this.activityLog.push(logEntry);
        
        // Keep only last 50 entries to prevent memory issues
        if (this.activityLog.length > 50) {
            this.activityLog.shift();
        }
        
        // Also log to console in development
        console.log(`[BidEntry] ${action}:`, data);
    }
    
    getActivityLog() {
        return this.activityLog;
    }
    
    downloadActivityLog() {
        const logData = JSON.stringify(this.activityLog, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bid-entry-log-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    bindEvents() {
        const form = document.getElementById('bid-form');
        const itemInput = document.getElementById('item-id');
        const bidderInput = document.getElementById('bidder-id');
        const priceInput = document.getElementById('winning-price');
        const quantityInput = document.getElementById('quantity-won');

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBid();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // F5 = Skip item
            if (e.key === 'F5') {
                e.preventDefault();
                this.skipItem();
            }
            // F6 = No bid
            else if (e.key === 'F6') {
                e.preventDefault();
                this.markNoBid();
            }
            // Escape = Clear form
            else if (e.key === 'Escape') {
                e.preventDefault();
                this.clearForm();
            }
        });
        
        // No bid button
        const noBidButton = document.getElementById('no-bid');
        if (noBidButton) {
            noBidButton.addEventListener('click', () => {
                this.markNoBid();
            });
        }
        
        // Item lookup with typeahead
        itemInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            // Clear previous timeout
            clearTimeout(this.itemLookupTimeout);

            // Clear selected item whenever input changes - force revalidation
            this.selectedItem = null;

            // Reset highlighted index when user types
            this.highlightedItemIndex = -1;

            if (value.length === 0) {
                this.clearItemSelection();
                return;
            }

            // Debounce the lookup to avoid too many requests
            this.itemLookupTimeout = setTimeout(() => {
                this.performLookup('item', value, false, document.getElementById('auction-id').value);
            }, 300);
        });
        
        // Validate on blur (click away) - constraint validation pattern
        itemInput.addEventListener('blur', async (e) => {
            // Small delay to allow click on dropdown items
            setTimeout(async () => {
                const lookupContainer = document.getElementById('item-lookup');
                // Don't validate if clicking on dropdown
                if (lookupContainer && lookupContainer.contains(document.activeElement)) {
                    return;
                }

                // Run validation
                const isValid = await this.validateItemField();

                // If invalid and not empty, refocus to force correction
                if (!isValid && itemInput.value.trim()) {
                    itemInput.focus();
                }
            }, 200);
        });
        
        // Validate item field before allowing tab/enter, handle arrow key navigation
        itemInput.addEventListener('keydown', async (e) => {
            const container = document.getElementById('item-lookup');
            const items = container.querySelectorAll('.lookup-item:not(.no-results)');

            // Handle arrow key navigation in dropdown
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (items.length > 0 && container.style.display !== 'none') {
                    e.preventDefault();

                    if (e.key === 'ArrowDown') {
                        this.highlightedItemIndex = Math.min(this.highlightedItemIndex + 1, items.length - 1);
                        this.highlightDropdownItem(items, this.highlightedItemIndex);
                    } else if (e.key === 'ArrowUp') {
                        this.highlightedItemIndex = Math.max(this.highlightedItemIndex - 1, -1);
                        if (this.highlightedItemIndex === -1) {
                            this.clearDropdownHighlight(items);
                        } else {
                            this.highlightDropdownItem(items, this.highlightedItemIndex);
                        }
                    }
                    return;
                }
            }

            // Handle Enter key - select highlighted item or validate
            if (e.key === 'Enter') {
                // If an item is highlighted, select it
                if (this.highlightedItemIndex >= 0 && items[this.highlightedItemIndex]) {
                    e.preventDefault();
                    const item = items[this.highlightedItemIndex];
                    this.selectItem(item.dataset.id, item.dataset.name);
                    this.hideLookup('item');
                    this.highlightedItemIndex = -1;
                    bidderInput.focus();
                    return;
                }

                // Otherwise validate and navigate
                const value = itemInput.value.trim();
                if (!value) {
                    e.preventDefault();
                    bidderInput.focus();
                    return;
                }

                e.preventDefault();
                const isValid = await this.validateItemField(true);
                if (isValid) {
                    bidderInput.focus();
                }
                return;
            }

            // Handle Tab key - validate (only forward Tab, allow Shift+Tab for backward navigation)
            if (e.key === 'Tab' && !e.shiftKey) {
                const value = itemInput.value.trim();

                if (!value) {
                    // Empty is allowed
                    return;
                }

                // Always prevent default first, we'll manually navigate if valid
                e.preventDefault();

                // Use centralized validation - hide dropdown on navigation
                const isValid = await this.validateItemField(true);

                // Only navigate if valid
                if (isValid) {
                    bidderInput.focus();
                }
            }

            // Handle Escape - close dropdown
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hideLookup('item');
                this.highlightedItemIndex = -1;
            }
        });
        
        // Bidder lookup with improved typeahead
        bidderInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            // Clear previous timeout
            clearTimeout(this.bidderLookupTimeout);

            // Clear selected bidder whenever input changes - force revalidation
            this.selectedBidder = null;

            // Reset highlighted index when user types
            this.highlightedBidderIndex = -1;

            if (value.length === 0) {
                this.clearBidderSelection();
                return;
            }

            // Debounce the lookup to avoid too many requests
            this.bidderLookupTimeout = setTimeout(() => {
                this.performLookup('bidder', value);
            }, 300);
        });
        
        // Validate on blur (click away) - constraint validation pattern
        bidderInput.addEventListener('blur', (e) => {
            // Small delay to allow click on dropdown items
            setTimeout(async () => {
                const lookupContainer = document.getElementById('bidder-lookup');
                // Don't validate if clicking on dropdown
                if (lookupContainer && lookupContainer.contains(document.activeElement)) {
                    return;
                }

                // Run validation
                const isValid = await this.validateBidderField();

                // If invalid and not empty, refocus to force correction
                if (!isValid && bidderInput.value.trim()) {
                    bidderInput.focus();
                }
            }, 200);
        });
        
        // Validate bidder field before allowing tab/enter, handle arrow key navigation
        bidderInput.addEventListener('keydown', async (e) => {
            const container = document.getElementById('bidder-lookup');
            const items = container.querySelectorAll('.lookup-item:not(.no-results)');

            // Handle arrow key navigation in dropdown
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (items.length > 0 && container.style.display !== 'none') {
                    e.preventDefault();

                    if (e.key === 'ArrowDown') {
                        this.highlightedBidderIndex = Math.min(this.highlightedBidderIndex + 1, items.length - 1);
                        this.highlightDropdownItem(items, this.highlightedBidderIndex);
                    } else if (e.key === 'ArrowUp') {
                        this.highlightedBidderIndex = Math.max(this.highlightedBidderIndex - 1, -1);
                        if (this.highlightedBidderIndex === -1) {
                            this.clearDropdownHighlight(items);
                        } else {
                            this.highlightDropdownItem(items, this.highlightedBidderIndex);
                        }
                    }
                    return;
                }
            }

            // Handle Enter key - select highlighted bidder or validate
            if (e.key === 'Enter') {
                // If a bidder is highlighted, select it
                if (this.highlightedBidderIndex >= 0 && items[this.highlightedBidderIndex]) {
                    e.preventDefault();
                    const item = items[this.highlightedBidderIndex];
                    this.selectBidder(item.dataset.id, item.dataset.name, item.dataset.phone, item.dataset.email);
                    this.hideLookup('bidder');
                    this.highlightedBidderIndex = -1;
                    priceInput.focus();
                    return;
                }

                // Otherwise validate and navigate
                const value = bidderInput.value.trim();
                if (!value) {
                    e.preventDefault();
                    priceInput.focus();
                    return;
                }

                e.preventDefault();
                const isValid = await this.validateBidderField(true);
                if (isValid) {
                    priceInput.focus();
                }
                return;
            }

            // Handle Tab key - validate
            if (e.key === 'Tab' && !e.shiftKey) {
                const value = bidderInput.value.trim();

                if (!value) {
                    // Empty is allowed - can skip bidder field
                    return;
                }

                // Use centralized validation - hide dropdown on navigation
                e.preventDefault();
                const isValid = await this.validateBidderField(true);
                if (isValid) {
                    priceInput.focus();
                }
            }

            // Handle Escape - close dropdown
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hideLookup('bidder');
                this.highlightedBidderIndex = -1;
            }
        });
        
        // Validate price field on blur and tab/enter
        priceInput.addEventListener('blur', (e) => {
            setTimeout(() => {
                const quantityFocused = document.activeElement === quantityInput;
                if (!quantityFocused) {
                    this.validatePriceField();
                }
            }, 100);
        });

        priceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' || e.key === 'Enter') {
                const value = priceInput.value.trim();

                if (!value) {
                    // Empty is allowed
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        quantityInput.focus();
                    }
                    return;
                }

                const isValid = this.validatePriceField();

                if (!isValid) {
                    e.preventDefault();
                    return;
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    quantityInput.focus();
                }
            }
        });

        // Validate quantity field on blur and tab/enter
        quantityInput.addEventListener('blur', (e) => {
            setTimeout(() => {
                this.validateQuantityField();
            }, 100);
        });

        quantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' || e.key === 'Enter') {
                const value = quantityInput.value.trim();

                if (!value) {
                    // Empty is allowed (defaults to 1)
                    return;
                }

                const isValid = this.validateQuantityField();

                if (!isValid) {
                    e.preventDefault();
                    return;
                }
            }
        });


        // Item navigation buttons (batch mode only)
        const prevButton = document.getElementById('prev-item');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.previousItem();
            });
        }

        // Next item button (batch mode only)
        const nextButton = document.getElementById('next-item');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.nextItem();
            });
        }

        // Skip item button (may not exist in all modes)
        const skipButton = document.getElementById('skip-item');
        if (skipButton) {
            skipButton.addEventListener('click', () => {
                this.skipItem();
            });
        }

        // Clear form button (may not exist in all modes)
        const clearButton = document.getElementById('clear-form');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearForm();
            });
        }

        // Item quick navigation (batch mode only)
        document.querySelectorAll('.item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.goToItem(index);
            });
        });
    }
    
    loadCurrentItem() {
        // Check if this is batch mode (has item-info element)
        const itemInfo = document.getElementById('item-info');
        if (!itemInfo) {
            // Not in batch mode, skip this method
            return;
        }

        // Ensure currentItemIndex is within bounds - don't auto-complete
        if (this.currentItemIndex >= this.items.length) {
            this.currentItemIndex = this.items.length - 1;
        }
        if (this.currentItemIndex < 0) {
            this.currentItemIndex = 0;
        }

        const item = this.items[this.currentItemIndex];

        // Update item-info (batch mode only)
        itemInfo.innerHTML = `
            <strong>#${item.item_id}: ${item.item_name}</strong><br>
            <small>${item.item_description || 'No description'}</small><br>
            <small>Available: ${item.item_quantity}</small>
        `;

        // Pre-fill if item has existing bid and show edit options
        if (item.winning_price) {
            document.getElementById('bidder-id').value = item.bidder_id || '';
            document.getElementById('winning-price').value = item.winning_price || '';
            document.getElementById('quantity-won').value = item.quantity_won || 1;

            // Set up selected bidder info
            if (item.winner_name) {
                this.selectedBidder = {
                    id: item.bidder_id,
                    name: item.winner_name,
                    phone: '', // Would need to be added to the data if available
                    email: ''
                };

                // Show current bid info with edit/delete options
                const lookupContainer = document.getElementById('bidder-lookup');
                lookupContainer.innerHTML = `
                    <div class="current-bid">
                        <div class="bidder-info">
                            <strong>Current Bid: ${item.winner_name}</strong><br>
                            <small>ID: ${item.bidder_id} | Price: $${parseFloat(item.winning_price).toFixed(2)} | Quantity: ${item.quantity_won || 1}</small>
                        </div>
                        <div class="bid-actions">
                            <button type="button" class="edit-bid-btn" onclick="window.bidEntryInstance.editBid()">Edit</button>
                            <button type="button" class="delete-bid-btn" onclick="window.bidEntryInstance.deleteBidBatchMode()">Delete Bid</button>
                        </div>
                    </div>
                `;

                // Store current bid for editing
                this.currentBid = {
                    bidder_id: item.bidder_id,
                    winning_price: item.winning_price,
                    quantity_won: item.quantity_won || 1,
                    winner_name: item.winner_name
                };
            }

            // Update save button text
            const saveBtn = document.getElementById('save-bid');
            if (saveBtn) {
                saveBtn.innerHTML = 'UPDATE BID (Enter)';
                saveBtn.classList.add('update-mode');
            }
        } else {
            this.clearForm();
            this.currentBid = null;

            // Reset save button text
            const saveBtn = document.getElementById('save-bid');
            if (saveBtn) {
                saveBtn.innerHTML = 'SAVE BID (Enter)';
                saveBtn.classList.remove('update-mode');
            }
        }

        // Update item buttons
        this.updateItemButtons();

        // Update current item index hidden field
        document.getElementById('current-item-index').value = this.currentItemIndex;
    }
    
    updateItemButtons() {
        document.querySelectorAll('.item-btn').forEach((btn, index) => {
            btn.classList.remove('active');
            if (index === this.currentItemIndex) {
                btn.classList.add('active');
            }
        });
    }
    
    async validateItemInAuction(itemId, auctionId) {
        try {
            const response = await fetch(
                `../api/validate_item.php?item_id=${itemId}&auction_id=${auctionId}`,
                { credentials: 'same-origin' }
            );
            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('Item validation error:', error);
            return false;
        }
    }

    /**
     * Validate item field - can be called from keydown or blur
     * Returns true if valid, false if invalid (and shows error)
     * @param {boolean} hideDropdown - Whether to hide dropdown on success (true for Tab/Enter, false for blur)
     */
    async validateItemField(hideDropdown = false) {
        const itemInput = document.getElementById('item-id');
        const value = itemInput.value.trim();

        // Empty is allowed
        if (!value) {
            this.clearItemConfirmation();
            return true;
        }

        // Check if numeric
        const isNumeric = /^\d+$/.test(value);
        if (!isNumeric) {
            this.showFieldError(itemInput, 'Invalid item entry. Enter an item ID or select from the list.');
            itemInput.select();
            this.clearItemConfirmation();
            return false;
        }

        // Fetch item details and validate
        const itemId = parseInt(value);
        const auctionId = document.getElementById('auction-id').value;

        try {
            const response = await fetch(`../api/lookup.php?type=item&term=${itemId}&auction_id=${auctionId}`, {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (data.error) {
                this.showFieldError(itemInput, `Item #${itemId} not found or not part of this auction.`);
                itemInput.select();
                this.clearItemConfirmation();
                return false;
            }

            // API returns {results: [...]} format
            const results = data.results || [];

            // Find exact match by ID
            const item = results.find(i => parseInt(i.id) === itemId);

            if (!item) {
                this.showFieldError(itemInput, `Item #${itemId} not found or not part of this auction.`);
                itemInput.select();
                this.clearItemConfirmation();
                return false;
            }

            // Valid! Check if item has existing bids
            if (!this.selectedItem || this.selectedItem.id != itemId) {
                // Cancel any pending lookup
                clearTimeout(this.itemLookupTimeout);

                // Hide dropdown first
                if (hideDropdown) {
                    this.hideLookup('item');
                }

                // Call full selectItem to show inventory/existing bids
                // This will display bids with edit buttons if any exist
                await this.selectItem(itemId, item.name, item.description || '', item.quantity || 1);
            }

        } catch (error) {
            this.showFieldError(itemInput, 'Error verifying item. Please try again.');
            itemInput.select();
            this.clearItemConfirmation();
            return false;
        }

        return true;
    }

    /**
     * Validate bidder field - can be called from keydown or blur
     * Returns true if valid, false if invalid (and shows error)
     * @param {boolean} hideDropdown - Whether to hide dropdown on success (true for Tab/Enter, false for blur)
     */
    async validateBidderField(hideDropdown = false) {
        const bidderInput = document.getElementById('bidder-id');
        const value = bidderInput.value.trim();

        // Empty is allowed
        if (!value) {
            this.clearBidderConfirmation();
            return true;
        }

        // Check if numeric
        const isNumeric = /^\d+$/.test(value);
        if (!isNumeric && !this.selectedBidder) {
            this.showFieldError(bidderInput, 'Invalid bidder entry. Enter a bidder ID or select from the list.');
            bidderInput.select();
            this.clearBidderConfirmation();
            return false;
        }

        // If numeric and not already selected, fetch bidder details
        if (isNumeric && (!this.selectedBidder || this.selectedBidder.id != parseInt(value))) {
            const bidderId = parseInt(value);

            // Fetch bidder details for confirmation
            try {
                const response = await fetch(`../api/lookup.php?type=bidder&term=${bidderId}`, {
                    credentials: 'same-origin'
                });
                const data = await response.json();

                if (data.error) {
                    this.showFieldError(bidderInput, `Bidder #${bidderId} not found. Please verify ID.`);
                    bidderInput.select();
                    this.clearBidderConfirmation();
                    return false;
                }

                // API returns {results: [...]} format
                const results = data.results || [];

                // Find exact match by ID
                const bidder = results.find(b => parseInt(b.id) === bidderId);

                if (!bidder) {
                    this.showFieldError(bidderInput, `Bidder #${bidderId} not found. Please verify ID.`);
                    bidderInput.select();
                    this.clearBidderConfirmation();
                    return false;
                }

                // Set selected bidder
                this.selectedBidder = {
                    id: bidderId,
                    name: bidder.name,
                    phone: bidder.phone || '',
                    email: bidder.email || ''
                };

                // Cancel any pending lookup that would override our confirmation
                clearTimeout(this.bidderLookupTimeout);

                // Hide dropdown first (clears HTML), then display confirmation
                if (hideDropdown) {
                    this.hideLookup('bidder');
                }

                // Display confirmation (sets new HTML)
                this.displayBidderConfirmation(this.selectedBidder.name);

            } catch (error) {
                this.showFieldError(bidderInput, 'Error verifying bidder. Please try again.');
                bidderInput.select();
                this.clearBidderConfirmation();
                return false;
            }
        }

        return true;
    }

    validatePriceField() {
        const priceInput = document.getElementById('winning-price');
        const value = priceInput.value.trim();

        // Empty is allowed
        if (!value) {
            return true;
        }

        // Check if valid number (allow decimals)
        const isNumeric = /^\d+(\.\d{1,2})?$/.test(value);
        if (!isNumeric) {
            this.showFieldError(priceInput, 'Invalid price. Enter a valid dollar amount (e.g., 25 or 25.50).');
            priceInput.select();
            return false;
        }

        // Check if positive
        const price = parseFloat(value);
        if (price < 0) {
            this.showFieldError(priceInput, 'Price must be a positive number.');
            priceInput.select();
            return false;
        }

        return true;
    }

    validateQuantityField() {
        const quantityInput = document.getElementById('quantity-won');
        const itemInput = document.getElementById('item-id');
        const value = quantityInput.value.trim();

        // Empty defaults to 1
        if (!value) {
            quantityInput.value = '1';
            return true;
        }

        // Check if valid integer
        const isInteger = /^\d+$/.test(value);
        if (!isInteger) {
            this.showFieldError(quantityInput, 'Quantity must be a whole number.');
            quantityInput.select();
            return false;
        }

        const quantity = parseInt(value);

        // Check if positive
        if (quantity <= 0) {
            this.showFieldError(quantityInput, 'Quantity must be at least 1.');
            quantityInput.select();
            return false;
        }

        // Check against available inventory if item is selected
        if (this.selectedItem && this.selectedItem.quantity) {
            const available = this.selectedItem.quantity;
            if (quantity > available) {
                this.showFieldError(quantityInput, `Only ${available} available in inventory.`);
                quantityInput.select();
                return false;
            }
        }

        return true;
    }

    performLookup(type, term, autoSelect = false, auctionId = null) {
        if (!term || term.length < 1) {
            this.hideLookup(type);
            return;
        }
        
        const lookupId = Date.now();
        this.logActivity('AJAX lookup started', {
            type,
            term,
            autoSelect,
            auctionId,
            lookupId
        });
        
        let url = `../api/lookup.php?type=${type}&term=${encodeURIComponent(term)}`;
        if (type === 'item' && auctionId) {
            url += `&auction_id=${encodeURIComponent(auctionId)}`;
        }
        
        fetch(url, {
            credentials: 'same-origin'
        })
            .then(response => {
                this.logActivity('AJAX lookup response received', {
                    lookupId,
                    status: response.status,
                    ok: response.ok
                });
                return response.json();
            })
            .then(data => {
                this.logActivity('AJAX lookup data processed', {
                    lookupId,
                    resultCount: data.results ? data.results.length : 0,
                    hasError: !!data.error,
                    autoSelect
                });
                
                if (data.results) {
                    if (type === 'bidder') {
                        if (autoSelect && data.results.length === 1) {
                            // Auto-select single result
                            const bidder = data.results[0];
                            this.logActivity('Auto-selecting single result', {
                                lookupId,
                                bidderId: bidder.id,
                                bidderName: bidder.name
                            });
                            this.selectBidder(bidder.id, bidder.name, bidder.phone, bidder.email);
                        } else {
                            this.showBidderLookup(data.results);
                        }
                    } else if (type === 'item') {
                        if (autoSelect && data.results.length === 1) {
                            // Auto-select single result
                            const item = data.results[0];
                            this.logActivity('Auto-selecting single item result', {
                                lookupId,
                                itemId: item.id,
                                itemName: item.name
                            });
                            this.selectItem(item.id, item.name, item.description, item.quantity);
                        } else {
                            this.showItemLookup(data.results);
                        }
                    }
                }
            })
            .catch(error => {
                this.logActivity('AJAX lookup error', {
                    lookupId,
                    error: error.message,
                    stack: error.stack
                });
                console.error('Lookup error:', error);
            });
    }
    
    showBidderLookup(results) {
        const container = document.getElementById('bidder-lookup');
        
        if (!results.length) {
            container.innerHTML = '<div class="lookup-item no-results">No matching bidders found</div>';
            return;
        }
        
        // Format results compactly: "ID (FirstName LastName) - email"
        // Note: No tabindex - clicking only, Tab moves to next form field
        container.innerHTML = results.map((bidder, index) => `
            <div class="lookup-item compact" data-id="${bidder.id}" data-name="${bidder.name}"
                 data-phone="${bidder.phone || ''}" data-email="${bidder.email || ''}"
                 data-index="${index}">
                <strong>${bidder.id}</strong> (${bidder.name})${bidder.email ? ' - ' + bidder.email : ''}
            </div>
        `).join('');
        
        // Show the dropdown
        container.style.display = 'block';
        
        // Bind click events only (no keyboard navigation to avoid Tab interference)
        container.querySelectorAll('.lookup-item').forEach(item => {
            if (item.classList.contains('no-results')) return;

            item.addEventListener('click', () => {
                this.selectBidder(item.dataset.id, item.dataset.name, item.dataset.phone, item.dataset.email);
            });
        });
    }
    
    selectBidder(id, name, phone = '', email = '') {
        this.logActivity('Bidder selected', {
            id,
            name,
            phone,
            email,
            previousBidder: this.selectedBidder
        });
        
        const bidderInput = document.getElementById('bidder-id');
        const lookupContainer = document.getElementById('bidder-lookup');
        
        // Verify ID matches what's in the field
        const currentFieldValue = bidderInput.value;
        if (currentFieldValue && currentFieldValue !== id) {
            this.logActivity('WARNING: ID mismatch detected', {
                fieldValue: currentFieldValue,
                selectedId: id,
                selectedName: name
            });
            console.warn('[BidEntry] ID mismatch: field has', currentFieldValue, 'but selecting ID', id);
        }
        
        // Set the bidder ID
        bidderInput.value = id;
        
        // Show selected bidder info below the input
        lookupContainer.innerHTML = `
            <div class="selected-bidder">
                <div class="bidder-info">
                    <strong>Selected: ${name}</strong><br>
                    <small>ID: ${id}${phone ? ' | Phone: ' + phone : ''}${email ? ' | Email: ' + email : ''}</small>
                </div>
                <button type="button" class="clear-bidder" onclick="window.bidEntryInstance.clearBidderSelection()">×</button>
            </div>
        `;
        
        // Store selected bidder data
        this.selectedBidder = { id, name, phone, email };
        
        // Move focus to price field
        document.getElementById('winning-price').focus();
    }
    
    showItemLookup(results) {
        const container = document.getElementById('item-lookup');
        
        if (!results.length) {
            container.innerHTML = '<div class="lookup-item no-results">No matching items found</div>';
            return;
        }
        
        // Format results compactly: "ID (ItemName) - quantity available"
        // Note: No tabindex - clicking only, Tab moves to next form field
        container.innerHTML = results.map((item, index) => `
            <div class="lookup-item compact" data-id="${item.id}" data-name="${item.name}"
                 data-description="${item.description || ''}" data-quantity="${item.quantity || 1}"
                 data-index="${index}">
                <strong>#${item.id}</strong> (${item.name})${item.quantity > 1 ? ` - ${item.quantity} available` : ''}
            </div>
        `).join('');

        // Show the dropdown
        container.style.display = 'block';

        // Bind click events only (no keyboard navigation to avoid Tab interference)
        container.querySelectorAll('.lookup-item').forEach(item => {
            if (item.classList.contains('no-results')) return;

            item.addEventListener('click', () => {
                this.selectItem(
                    item.dataset.id,
                    item.dataset.name,
                    item.dataset.description,
                    item.dataset.quantity
                );
            });
        });
    }
    
    async selectItem(id, name, description, quantity) {
        this.logActivity('Item selected', {
            id,
            name,
            description,
            quantity,
            previousItem: this.selectedItem
        });

        const itemInput = document.getElementById('item-id');
        const lookupContainer = document.getElementById('item-lookup');
        const auctionId = document.getElementById('auction-id').value;

        // Update field
        itemInput.value = id;

        // Fetch real-time inventory information
        try {
            const response = await fetch(`../api/check_inventory.php?item_id=${id}&auction_id=${auctionId}`, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            console.log('[selectItem] check_inventory response:', data);

            if (data.error) {
                console.error('[selectItem] API error:', data.error);
                throw new Error(data.error);
            }

            // Store selected item data
            this.selectedItem = {
                id,
                name,
                description,
                quantity: data.available_quantity,
                total_quantity: data.total_quantity,
                allocated_quantity: data.allocated_quantity,
                can_add_bid: data.can_add_bid,
                existing_bids: data.existing_bids
            };

            console.log('[selectItem] existing_bids:', data.existing_bids);

            // If item has existing bid(s), auto-populate form for editing
            if (data.existing_bids && data.existing_bids.length > 0) {
                console.log('[selectItem] Auto-populating form for editing, bid:', data.existing_bids[0]);
                const bid = data.existing_bids[0]; // Use first bid

                // Populate form
                document.getElementById('bidder-id').value = bid.bidder_id;
                this.selectedBidder = { id: bid.bidder_id, name: bid.bidder_name };
                document.getElementById('winning-price').value = bid.winning_price || '';
                document.getElementById('quantity-won').value = bid.quantity_won;

                // Mark as editing
                this.editingBidId = bid.bid_id;

                // Update button to show UPDATE mode
                const saveButton = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
                if (saveButton) {
                    saveButton.textContent = 'UPDATE BID';
                    saveButton.classList.add('editing');
                }

                // Show DELETE button next to UPDATE button
                this.showDeleteButton();

                // Show simple confirmation (not blocking popup)
                lookupContainer.innerHTML = `
                    <div class="field-confirmation">
                        <span class="confirmation-text">✓ ${name} (editing existing bid)</span>
                    </div>
                `;
                lookupContainer.style.display = 'block';

                // Focus bidder field for editing
                document.getElementById('bidder-id').focus();
            } else {
                // No existing bids - clear form and reset to new bid mode
                document.getElementById('bidder-id').value = '';
                document.getElementById('winning-price').value = '';
                document.getElementById('quantity-won').value = '1';
                document.getElementById('bidder-lookup').innerHTML = '';

                this.selectedBidder = null;
                this.editingBidId = null;

                // Reset button to SAVE mode
                const saveButton = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
                if (saveButton) {
                    saveButton.textContent = 'SAVE BID (Enter)';
                    saveButton.classList.remove('editing');
                }

                // Hide DELETE button
                this.hideDeleteButton();

                // Show simple confirmation
                lookupContainer.innerHTML = `
                    <div class="field-confirmation">
                        <span class="confirmation-text">✓ ${name}</span>
                    </div>
                `;
                lookupContainer.style.display = 'block';

                // Move focus to bidder field
                document.getElementById('bidder-id').focus();
            }

        } catch (error) {
            console.error('Error fetching inventory:', error);
            console.error('Error details:', error.message, error.stack);
            // Fallback to simple confirmation (assume new entry)
            lookupContainer.innerHTML = `
                <div class="field-confirmation">
                    <span class="confirmation-text">✓ ${name}</span>
                </div>
            `;
            lookupContainer.style.display = 'block';

            this.selectedItem = { id, name, description, quantity };

            // Move focus to bidder field
            document.getElementById('bidder-id').focus();
        }
    }
    
    clearItemSelection() {
        document.getElementById('item-id').value = '';
        document.getElementById('item-lookup').innerHTML = '';
        this.selectedItem = null;

        // Reset editing mode
        this.editingBidId = null;
        const saveButton = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
        if (saveButton) {
            saveButton.textContent = 'SAVE BID (Enter)';
            saveButton.classList.remove('editing');
        }

        // Hide delete button
        this.hideDeleteButton();

        // Clear the entire form when exiting edit mode
        this.clearForm();

        document.getElementById('item-id').focus();
    }

    async editBid(bidId) {
        if (!this.selectedItem || !this.selectedItem.existing_bids) {
            alert('Error: No item selected');
            return;
        }

        // Find the bid in existing bids
        const bid = this.selectedItem.existing_bids.find(b => b.bid_id === bidId);
        if (!bid) {
            alert('Error: Bid not found');
            return;
        }

        // Populate form with bid data
        document.getElementById('bidder-id').value = bid.bidder_id;
        this.selectedBidder = { id: bid.bidder_id, name: bid.bidder_name };

        document.getElementById('winning-price').value = bid.winning_price || '';
        document.getElementById('quantity-won').value = bid.quantity_won;

        // Store that we're editing
        this.editingBidId = bidId;

        // Change button text
        const saveButton = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
        if (saveButton) {
            saveButton.textContent = 'UPDATE BID';
            saveButton.classList.add('editing');
        }

        // Focus bidder field
        document.getElementById('bidder-id').focus();
    }

    async deleteBid(bidId) {
        if (!confirm('Are you sure you want to delete this bid? This will free up the inventory.')) {
            return;
        }

        try {
            const response = await fetch('../api/update_bid.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'delete',
                    bid_id: bidId
                })
            });

            const data = await response.json();

            if (data.error) {
                alert('Error deleting bid: ' + data.error);
                return;
            }

            // Clear editing state and form
            this.editingBidId = null;
            this.selectedItem = null;

            // Reset button text
            const saveButton = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
            if (saveButton) {
                saveButton.textContent = 'SAVE BID (Enter)';
                saveButton.classList.remove('editing');
            }

            // Clear form completely
            this.clearForm();
            document.getElementById('item-id').value = '';
            document.getElementById('item-lookup').innerHTML = '';

            alert('Bid deleted successfully');

            // Update progress
            this.updateProgress();
            this.calculateRunningTotal();

            // Refresh item statuses to show updated bid data
            this.refreshItemStatuses();

        } catch (error) {
            console.error('Error deleting bid:', error);
            alert('Error deleting bid: ' + error.message);
        }
    }

    clearBidderSelection() {
        document.getElementById('bidder-id').value = '';
        document.getElementById('bidder-lookup').innerHTML = '';
        this.selectedBidder = null;
        document.getElementById('bidder-id').focus();
    }

    displayBidderConfirmation(bidderName) {
        const lookupContainer = document.getElementById('bidder-lookup');
        lookupContainer.innerHTML = `
            <div class="field-confirmation">
                <span class="confirmation-text">✓ ${bidderName}</span>
            </div>
        `;
        lookupContainer.style.display = 'block';
    }

    clearBidderConfirmation() {
        const lookupContainer = document.getElementById('bidder-lookup');
        const confirmation = lookupContainer.querySelector('.field-confirmation');
        if (confirmation) {
            lookupContainer.innerHTML = '';
            lookupContainer.style.display = 'none';
        }
    }

    displayItemConfirmation(itemName) {
        const lookupContainer = document.getElementById('item-lookup');
        lookupContainer.innerHTML = `
            <div class="field-confirmation">
                <span class="confirmation-text">✓ ${itemName}</span>
            </div>
        `;
        lookupContainer.style.display = 'block';
    }

    clearItemConfirmation() {
        const lookupContainer = document.getElementById('item-lookup');
        const confirmation = lookupContainer.querySelector('.field-confirmation');
        if (confirmation) {
            lookupContainer.innerHTML = '';
            lookupContainer.style.display = 'none';
        }
    }

    // Unified dropdown navigation methods
    highlightDropdownItem(items, index) {
        this.clearDropdownHighlight(items);
        if (items[index]) {
            items[index].classList.add('highlighted');
            items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    clearDropdownHighlight(items) {
        items.forEach(item => item.classList.remove('highlighted'));
    }
    
    hideLookup(type) {
        if (type === 'bidder') {
            const container = document.getElementById('bidder-lookup');
            container.innerHTML = '';
            container.style.display = 'none';
        } else if (type === 'item') {
            const container = document.getElementById('item-lookup');
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }
    
    async saveBid() {
        const auctionId = document.getElementById('auction-id').value;
        const itemId = document.getElementById('item-id').value;
        const bidderId = document.getElementById('bidder-id').value;
        const winningPrice = document.getElementById('winning-price').value;
        const quantityWon = document.getElementById('quantity-won').value;

        this.logActivity('Save bid initiated', {
            auctionId,
            itemId,
            bidderId,
            winningPrice,
            quantityWon,
            selectedItem: this.selectedItem,
            selectedBidder: this.selectedBidder,
            editingBidId: this.editingBidId
        });

        // Check if we're editing an existing bid
        if (this.editingBidId) {
            return this.updateExistingBid();
        }

        // Check if inventory is available for new bids
        if (this.selectedItem && !this.selectedItem.can_add_bid) {
            alert('No inventory available for this item. Please edit or delete existing bids to free up inventory.');
            return;
        }

        // Validate inputs
        if (!itemId || !bidderId || !winningPrice) {
            alert('Please enter Item ID, Bidder ID, and Winning Price');
            if (!itemId) {
                document.getElementById('item-id').focus();
            } else if (!bidderId) {
                document.getElementById('bidder-id').focus();
            } else {
                document.getElementById('winning-price').focus();
            }
            return;
        }

        // If no bidder selected but there's a numeric ID, allow it (for direct ID entry)
        const numericBidderId = parseInt(bidderId);
        if (!this.selectedBidder && (!bidderId || isNaN(numericBidderId))) {
            alert('Please enter a valid bidder ID or select a bidder from the dropdown');
            document.getElementById('bidder-id').focus();
            return;
        }

        const price = parseFloat(winningPrice);
        if (isNaN(price) || price <= 0) {
            alert('Please enter a valid price greater than 0');
            document.getElementById('winning-price').focus();
            return;
        }

        const quantity = parseInt(quantityWon) || 1;
        if (quantity <= 0) {
            alert('Quantity must be at least 1');
            document.getElementById('quantity-won').focus();
            return;
        }

        // Check if this item already has a bid (to determine if this is an update)
        const numericItemId = parseInt(itemId);
        const existingItem = this.items.find(item => item.item_id === numericItemId);

        const bidData = {
            auction_id: auctionId,
            item_id: numericItemId,
            bidder_id: parseInt(bidderId),
            winning_price: price,
            quantity_won: quantity,
            action: existingItem?.winning_price ? 'update' : 'save' // Update if bid exists
        };

        const saveId = Date.now();
        this.logActivity('Save bid API call started', {
            saveId,
            bidData: { ...bidData }
        });

        fetch('../api/save_bid.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(bidData)
        })
        .then(response => {
            this.logActivity('Save bid API response received', {
                saveId,
                status: response.status,
                ok: response.ok
            });
            return response.json();
        })
        .then(data => {
            this.logActivity('Save bid API data processed', {
                saveId,
                success: data.success,
                error: data.error,
                beforeState: {
                    itemBidderId: existingItem?.bidder_id,
                    itemWinningPrice: existingItem?.winning_price
                }
            });
            
            if (data.success) {
                // Update or add item with new bid info
                if (existingItem) {
                    existingItem.winning_price = bidData.winning_price;
                    existingItem.quantity_won = bidData.quantity_won;
                    existingItem.bidder_id = bidData.bidder_id;
                    existingItem.winner_name = this.selectedBidder?.name || '';
                } else {
                    // Add new item to the items array if not found
                    const newItem = {
                        item_id: bidData.item_id,
                        item_name: this.selectedItem?.name || `Item #${bidData.item_id}`,
                        item_description: this.selectedItem?.description || '',
                        item_quantity: this.selectedItem?.quantity || 1,
                        winning_price: bidData.winning_price,
                        quantity_won: bidData.quantity_won,
                        bidder_id: bidData.bidder_id,
                        winner_name: this.selectedBidder?.name || ''
                    };
                    this.items.push(newItem);
                }
                
                // Add to recent entries
                const itemForEntry = existingItem || this.items[this.items.length - 1];
                this.addRecentEntry(itemForEntry, bidData);

                // Update running total and progress
                this.calculateRunningTotal();
                this.updateProgress();

                // Refresh item statuses to show updated bid data
                this.refreshItemStatuses();

                // Update item button to show it has a bid (if using old navigation)
                const itemIndex = this.items.findIndex(item => item.item_id === bidData.item_id);
                if (itemIndex >= 0) {
                    const itemBtn = document.querySelector(`.item-btn[data-index="${itemIndex}"]`);
                    if (itemBtn) {
                        itemBtn.classList.add('has-bid');
                    }
                }
                
                // Clear form for next entry and focus on item ID field
                this.clearForm();
                
                // Show success message briefly
                const itemName = existingItem?.item_name || this.selectedItem?.name || `Item #${bidData.item_id}`;
                const message = `Bid saved: ${itemName} → ${this.selectedBidder?.name || 'ID ' + bidData.bidder_id} ($${bidData.winning_price})`;
                this.showSuccessMessage(message);
                
            } else {
                alert('Error saving bid: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Save error:', error);
            alert('Failed to save bid. Please try again.');
        });
    }
    
    skipItem() {
        this.nextItem();
    }

    async updateExistingBid() {
        const bidderId = document.getElementById('bidder-id').value;
        const winningPrice = document.getElementById('winning-price').value;
        const quantityWon = document.getElementById('quantity-won').value;

        if (!this.editingBidId) {
            alert('Error: No bid being edited');
            return;
        }

        try {
            const response = await fetch('../api/update_bid.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'update',
                    bid_id: this.editingBidId,
                    bidder_id: parseInt(bidderId),
                    winning_price: parseFloat(winningPrice),
                    quantity_won: parseInt(quantityWon)
                })
            });

            const data = await response.json();

            if (data.error) {
                alert('Error updating bid: ' + data.error);
                return;
            }

            // Clear editing state
            this.editingBidId = null;
            this.selectedItem = null;

            // Reset button text
            const saveButton = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
            if (saveButton) {
                saveButton.textContent = 'SAVE BID (Enter)';
                saveButton.classList.remove('editing');
            }

            // Clear form completely
            this.clearForm();
            document.getElementById('item-id').value = '';
            document.getElementById('item-lookup').innerHTML = '';

            alert('Bid updated successfully');

            // Update progress
            this.updateProgress();
            this.calculateRunningTotal();

            // Refresh item statuses to show updated bid data
            this.refreshItemStatuses();

        } catch (error) {
            console.error('Error updating bid:', error);
            alert('Error updating bid: ' + error.message);
        }
    }

    markNoBid() {
        // Check if item field has a value (even if not formally selected)
        const itemInput = document.getElementById('item-id');
        const itemValue = itemInput.value.trim();
        
        if (!itemValue) {
            alert('Please enter an item ID first');
            itemInput.focus();
            return;
        }
        
        // If no selectedItem but we have a numeric value, create it
        if (!this.selectedItem && /^\d+$/.test(itemValue)) {
            this.selectedItem = { id: parseInt(itemValue) };
        }
        
        if (!this.selectedItem || !this.selectedItem.id) {
            alert('Please enter a valid item ID');
            itemInput.focus();
            return;
        }
        
        const auctionId = document.getElementById('auction-id').value;
        
        const bidData = {
            action: 'save',
            auction_id: auctionId,
            item_id: this.selectedItem.id,
            bidder_id: 0, // Explicitly use bidder_id 0 for "No Bid"
            winning_price: 0, // Use 0 instead of null
            quantity_won: 0,
            no_bid: true // flag to indicate this was intentionally marked as no bid
        };
        
        this.logActivity('Marking item as no bid', bidData);
        
        fetch('../api/save_bid.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(bidData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the item in our local data
                const existingItem = window.auctionItems.find(i => i.item_id == bidData.item_id);
                if (existingItem) {
                    existingItem.bidder_id = 0; // Set to "No Bid" bidder
                    existingItem.winning_price = 0;
                    existingItem.quantity_won = 0;
                    existingItem.winner_name = 'No Bid';
                }
                
                // Clear form for next entry and focus on item ID field
                this.clearForm();
                
                // Show success message briefly
                const itemName = existingItem?.item_name || this.selectedItem?.name || `Item #${bidData.item_id}`;
                const message = `No bid recorded: ${itemName}`;
                this.showSuccessMessage(message);

                // Refresh item statuses to show updated bid data
                this.refreshItemStatuses();
                
            } else {
                alert('Error saving no-bid status: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('No-bid save error:', error);
            alert('Failed to save no-bid status. Please try again.');
        });
    }
    
    nextItem() {
        if (this.currentItemIndex < this.items.length - 1) {
            this.currentItemIndex++;
            this.loadCurrentItem();
        } else {
            // Only show completion if user tries to go beyond last item
            // and wants to finish (could add a confirmation here)
            if (confirm('You have reached the last item. Would you like to complete bid entry?')) {
                this.showCompletionMessage();
            }
            // Otherwise stay on the current item
        }
    }
    
    previousItem() {
        if (this.currentItemIndex > 0) {
            this.currentItemIndex--;
            this.loadCurrentItem();
        }
    }
    
    goToItem(index) {
        if (index >= 0 && index < this.items.length) {
            this.currentItemIndex = index;
            this.loadCurrentItem();
        }
    }
    
    editBid() {
        this.logActivity('Edit bid mode activated', {
            currentBid: this.currentBid,
            selectedBidder: this.selectedBidder
        });
        
        // Store the current bid data before clearing
        const currentBidData = { ...this.currentBid };
        
        // Get form field elements
        const bidderInput = document.getElementById('bidder-id');
        const priceInput = document.getElementById('winning-price');
        const quantityInput = document.getElementById('quantity-won');
        const bidderLookup = document.getElementById('bidder-lookup');
        
        // Ensure all fields are enabled and accessible first
        bidderInput.disabled = false;
        priceInput.disabled = false;
        quantityInput.disabled = false;
        bidderInput.readOnly = false;
        priceInput.readOnly = false;
        quantityInput.readOnly = false;
        
        // Clear any existing bidder selection display (but don't call clearBidderSelection)
        if (bidderLookup) {
            bidderLookup.innerHTML = '';
        }
        this.selectedBidder = null;
        
        // Pre-fill with current values for editing
        if (currentBidData) {
            bidderInput.value = currentBidData.bidder_id || '';
            priceInput.value = currentBidData.winning_price || '';
            quantityInput.value = currentBidData.quantity_won || 1;
        }
        
        // Update save button to indicate update mode
        const saveBtn = document.getElementById('save-bid');
        if (saveBtn) {
            saveBtn.innerHTML = 'UPDATE BID (Enter)';
            saveBtn.classList.add('update-mode');
        }
        
        // Focus bidder field for editing after a brief delay
        setTimeout(() => {
            bidderInput.focus();
            this.logActivity('Edit mode setup complete', {
                fieldValues: {
                    bidderId: bidderInput.value,
                    price: priceInput.value,
                    quantity: quantityInput.value
                },
                fieldStates: {
                    bidderDisabled: bidderInput.disabled,
                    bidderReadOnly: bidderInput.readOnly,
                    priceDisabled: priceInput.disabled,
                    priceReadOnly: priceInput.readOnly,
                    quantityDisabled: quantityInput.disabled,
                    quantityReadOnly: quantityInput.readOnly
                },
                elementVisible: bidderInput.offsetParent !== null,
                elementInDOM: document.contains(bidderInput)
            });
        }, 100);
    }
    
    deleteBidBatchMode() {
        if (!confirm('Are you sure you want to delete this bid? This action cannot be undone.')) {
            return;
        }

        const currentItem = this.items[this.currentItemIndex];
        const bidData = {
            auction_id: document.getElementById('auction-id').value,
            item_id: currentItem.item_id,
            action: 'delete'
        };
        
        fetch('../api/save_bid.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(bidData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Clear the item's bid data locally
                currentItem.winning_price = null;
                currentItem.bidder_id = null;
                currentItem.quantity_won = null;
                currentItem.winner_name = null;
                
                // Refresh current item display
                this.loadCurrentItem();
                
                // Update calculations
                this.calculateRunningTotal();
                this.updateProgress();
                
                // Update item button
                const itemBtn = document.querySelector(`.item-btn[data-index="${this.currentItemIndex}"]`);
                if (itemBtn) {
                    itemBtn.classList.remove('has-bid');
                }
                
                alert('Bid deleted successfully');
            } else {
                alert('Error deleting bid: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Delete error:', error);
            alert('Failed to delete bid. Please try again.');
        });
    }

    clearForm() {
        document.getElementById('item-id').value = '';
        document.getElementById('bidder-id').value = '';
        document.getElementById('winning-price').value = '';
        document.getElementById('quantity-won').value = 1;
        document.getElementById('item-lookup').innerHTML = '';
        document.getElementById('bidder-lookup').innerHTML = '';

        // Enable all fields
        document.getElementById('item-id').disabled = false;
        document.getElementById('bidder-id').disabled = false;
        document.getElementById('winning-price').disabled = false;
        document.getElementById('quantity-won').disabled = false;

        // Clear selected item and bidder
        this.selectedItem = null;
        this.selectedBidder = null;
        this.currentBid = null;

        // Reset editing mode
        this.editingBidId = null;
        const saveButton = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
        if (saveButton) {
            saveButton.textContent = 'SAVE BID (Enter)';
            saveButton.classList.remove('editing');
        }

        // Hide delete button
        this.hideDeleteButton();

        // Focus item ID field
        document.getElementById('item-id').focus();
    }

    showDeleteButton() {
        // Find or create delete button next to submit button
        let deleteBtn = document.getElementById('delete-bid-btn');
        if (!deleteBtn) {
            const submitBtn = document.querySelector('button[type="submit"]') || document.getElementById('save-bid');
            if (submitBtn && submitBtn.parentElement) {
                deleteBtn = document.createElement('button');
                deleteBtn.id = 'delete-bid-btn';
                deleteBtn.type = 'button';
                deleteBtn.className = 'btn btn-danger';
                deleteBtn.textContent = 'DELETE BID';
                deleteBtn.style.marginLeft = '10px';
                deleteBtn.onclick = () => this.deleteBid(this.editingBidId);
                submitBtn.parentElement.appendChild(deleteBtn);
            }
        } else {
            deleteBtn.style.display = 'inline-block';
            deleteBtn.onclick = () => this.deleteBid(this.editingBidId);
        }
    }

    hideDeleteButton() {
        const deleteBtn = document.getElementById('delete-bid-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    }
    
    showFieldError(field, message) {
        const formGroup = field.parentElement;
        const label = formGroup.querySelector('label');

        // Remove any existing error for this field
        const existingError = formGroup.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create passive error message
        const errorElement = document.createElement('span');
        errorElement.className = 'field-error-message';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #dc3545;
            font-size: 12px;
            margin-left: 12px;
            padding: 2px 8px;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 3px;
            font-weight: normal;
            white-space: nowrap;
        `;

        // Insert after the label
        if (label) {
            label.parentElement.insertBefore(errorElement, label.nextSibling);
        }

        // Remove error when user starts typing
        const removeErrorOnInput = () => {
            if (errorElement.parentElement) {
                errorElement.remove();
            }
            field.removeEventListener('input', removeErrorOnInput);
        };
        field.addEventListener('input', removeErrorOnInput);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorElement.parentElement) {
                errorElement.style.opacity = '0';
                errorElement.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    if (errorElement.parentElement) {
                        errorElement.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    showSuccessMessage(message) {
        // Create or update success message element
        let messageElement = document.getElementById('success-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'success-message';
            messageElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
                font-weight: 500;
                max-width: 400px;
                word-wrap: break-word;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(messageElement);
        }
        
        messageElement.textContent = message;
        
        // Show animation
        setTimeout(() => {
            messageElement.style.transform = 'translateX(0)';
        }, 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            messageElement.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 300);
        }, 3000);
    }
    
    addRecentEntry(item, bid) {
        const entry = {
            item_name: item.item_name,
            item_id: item.item_id,
            bidder_id: bid.bidder_id,
            winning_price: bid.winning_price,
            quantity_won: bid.quantity_won
        };
        
        this.recentEntries.unshift(entry);
        if (this.recentEntries.length > 5) {
            this.recentEntries.pop();
        }
        
        this.updateRecentDisplay();
    }
    
    updateRecentDisplay() {
        const container = document.getElementById('recent-list');
        
        container.innerHTML = this.recentEntries.map(entry => `
            <div class="recent-entry">
                Bidder ${entry.bidder_id} won Item #${entry.item_id} (${entry.item_name}) 
                for $${entry.winning_price.toFixed(2)}
                ${entry.quantity_won > 1 ? ` x${entry.quantity_won}` : ''}
            </div>
        `).join('');
    }
    
    calculateRunningTotal() {
        this.runningTotal = 0;
        this.processedCount = 0;
        
        // Use window.auctionItems if available, fallback to this.items
        const items = window.auctionItems || this.items;
        
        items.forEach(item => {
            // Only count items with real bids (not no-bid entries with bidder_id 0)
            if (item.winning_price && item.bidder_id && item.bidder_id != 0) {
                this.runningTotal += item.winning_price * (item.quantity_won || 1);
            }
            // Count all processed items (including no-bid) for progress
            if (item.bidder_id !== null && item.bidder_id !== undefined) {
                this.processedCount++;
            }
        });
        
        document.getElementById('running-total').textContent = '$' + this.runningTotal.toFixed(2);
    }
    
    updateProgress() {
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        const total = this.items.length;
        
        progressText.textContent = `${this.processedCount} of ${total} items processed`;
        
        const percentage = total > 0 ? (this.processedCount / total) * 100 : 0;
        progressFill.style.width = percentage + '%';
    }
    
    showCompletionMessage() {
        const container = document.querySelector('.entry-form-container');
        container.innerHTML = `
            <div class="completion-message">
                <h3>🎉 Bid Entry Complete!</h3>
                <p>All ${this.items.length} items have been processed.</p>
                <p>Total Revenue: <strong>$${this.runningTotal.toFixed(2)}</strong></p>
                <div style="margin-top: 20px;">
                    <a href="../pages/reports.php?auction_id=${document.getElementById('auction-id').value}" class="btn btn-primary">View Reports</a>
                    <button onclick="window.location.reload()" class="btn btn-secondary">Review Entries</button>
                </div>
            </div>
        `;
    }
    
    initializeItemStatusGrid() {
        // Set up click handlers for item cards
        document.querySelectorAll('.item-status-card').forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.dataset.itemId;
                this.loadItemForEditing(itemId);
            });
        });
        
        // Start periodic refresh of item status from database
        this.startStatusRefresh();
        
        // Initial update of completion stats
        this.updateCompletionStats();
    }
    
    loadItemForEditing(itemId) {
        // Find item in current data
        const item = window.auctionItems.find(i => i.item_id == itemId);
        if (!item) return;
        
        // Check if item has multiple winners - show detailed view
        const hasMultipleWinners = item.winner_count > 1;
        if (hasMultipleWinners) {
            this.showMultipleWinnersModal(item);
            return;
        }
        
        // Pre-fill form with item data
        const itemInput = document.getElementById('item-id');
        const bidderInput = document.getElementById('bidder-id');
        const priceInput = document.getElementById('winning-price');
        const quantityInput = document.getElementById('quantity-won');
        
        // Set selected item
        this.selectedItem = { 
            id: parseInt(itemId), 
            name: item.item_name 
        };
        
        // Fill form fields
        itemInput.value = itemId;
        this.showSelectedItem(item.item_name);
        
        if (item.winning_price) {
            // Editing existing bid - for single winner items
            bidderInput.value = item.bidder_id || '';
            priceInput.value = item.winning_price || '';
            quantityInput.value = item.quantity_won || 1;
            
            // Update button to indicate edit mode
            const saveBtn = document.getElementById('save-bid');
            saveBtn.innerHTML = 'UPDATE BID (Enter)';
            saveBtn.classList.add('update-mode');
            
            // Focus bidder field for quick editing
            bidderInput.focus();
            bidderInput.select();
        } else {
            // New bid entry
            bidderInput.focus();
        }
    }
    
    showMultipleWinnersModal(item) {
        // Create modal to show all winners for this item
        const modal = document.createElement('div');
        modal.id = 'multiple-winners-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        // Parse the winner data
        const bidderIds = item.bidder_ids ? item.bidder_ids.split(',') : [];
        const winnerNames = item.winner_names ? item.winner_names.split('|') : [];
        const prices = item.winning_prices ? item.winning_prices.split(',') : [];
        const quantities = item.quantities_won ? item.quantities_won.split(',') : [];
        
        const winners = bidderIds.map((id, index) => ({
            bidder_id: id,
            winner_name: winnerNames[index] || `ID ${id}`,
            winning_price: parseFloat(prices[index]) || 0,
            quantity_won: parseInt(quantities[index]) || 0
        }));
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 20px; max-width: 500px; width: 90%; max-height: 80%; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3>Multiple Winners - Item #${item.item_id}</h3>
                    <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <p><strong>${item.item_name}</strong></p>
                <p>Available Quantity: ${item.item_quantity} | Total Won: ${item.quantity_won}</p>
                <hr>
                <div class="winners-list">
                    ${winners.map((winner, index) => `
                        <div class="winner-row" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: ${index % 2 === 0 ? '#f8f9fa' : 'white'}; border-radius: 4px; margin: 4px 0;">
                            <div>
                                <strong>${winner.winner_name}</strong><br>
                                <small>Bidder ID: ${winner.bidder_id}</small>
                            </div>
                            <div style="text-align: right;">
                                <div>$${winner.winning_price.toFixed(2)}</div>
                                <div>Qty: ${winner.quantity_won}</div>
                            </div>
                            <button class="edit-winner-btn btn btn-sm btn-outline" data-bidder-id="${winner.bidder_id}" style="margin-left: 10px;">Edit</button>
                        </div>
                    `).join('')}
                </div>
                <hr>
                <div style="margin-top: 15px; text-align: center;">
                    <button id="add-winner-btn" class="btn btn-primary">Add Another Winner</button>
                    <button id="close-modal-btn" class="btn btn-secondary">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event handlers
        modal.querySelector('#close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#close-modal-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#add-winner-btn').addEventListener('click', () => {
            // Close modal and set up form for adding new winner
            document.body.removeChild(modal);
            this.setupFormForNewWinner(item);
        });
        
        // Edit winner buttons
        modal.querySelectorAll('.edit-winner-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bidderId = e.target.dataset.bidderId;
                const winner = winners.find(w => w.bidder_id == bidderId);
                if (winner) {
                    document.body.removeChild(modal);
                    this.setupFormForEditWinner(item, winner);
                }
            });
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    setupFormForNewWinner(item) {
        // Set up form to add a new winner for this item
        const itemInput = document.getElementById('item-id');
        const bidderInput = document.getElementById('bidder-id');
        const priceInput = document.getElementById('winning-price');
        const quantityInput = document.getElementById('quantity-won');
        
        this.selectedItem = { 
            id: parseInt(item.item_id), 
            name: item.item_name 
        };
        
        itemInput.value = item.item_id;
        this.showSelectedItem(item.item_name);
        
        // Clear other fields for new entry
        bidderInput.value = '';
        priceInput.value = '';
        quantityInput.value = '1';
        
        // Update button
        const saveBtn = document.getElementById('save-bid');
        saveBtn.innerHTML = 'ADD WINNER (Enter)';
        saveBtn.classList.add('update-mode');
        
        bidderInput.focus();
    }
    
    setupFormForEditWinner(item, winner) {
        // Set up form to edit a specific winner
        const itemInput = document.getElementById('item-id');
        const bidderInput = document.getElementById('bidder-id');
        const priceInput = document.getElementById('winning-price');
        const quantityInput = document.getElementById('quantity-won');
        
        this.selectedItem = { 
            id: parseInt(item.item_id), 
            name: item.item_name 
        };
        
        itemInput.value = item.item_id;
        this.showSelectedItem(item.item_name);
        
        // Fill with winner data
        bidderInput.value = winner.bidder_id;
        priceInput.value = winner.winning_price;
        quantityInput.value = winner.quantity_won;
        
        // Update button
        const saveBtn = document.getElementById('save-bid');
        saveBtn.innerHTML = 'UPDATE WINNER (Enter)';
        saveBtn.classList.add('update-mode');
        
        bidderInput.focus();
        bidderInput.select();
    }
    
    startStatusRefresh() {
        // Refresh item status from database every 5 seconds
        this.statusRefreshInterval = setInterval(() => {
            this.refreshItemStatus();
        }, 5000);
    }
    
    refreshItemStatus() {
        const auctionId = document.getElementById('auction-id').value;
        if (!auctionId) return;
        
        fetch(`../api/get_auction_items.php?auction_id=${auctionId}`, {
            credentials: 'same-origin'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.updateItemStatusGrid(data.items);
                    window.auctionItems = data.items; // Update global items array
                }
            })
            .catch(error => {
                console.error('Failed to refresh item status:', error);
            });
    }
    
    updateItemStatusGrid(items) {
        items.forEach(item => {
            const card = document.querySelector(`[data-item-id="${item.item_id}"]`);
            if (!card) return;
            
            const statusIndicator = card.querySelector('.status-indicator');
            const bidInfo = card.querySelector('.bid-info');
            const noBidInfo = card.querySelector('.no-bid-info');
            
            if (item.bidder_id == 0) {
                // Item explicitly marked as no bid (bidder_id 0)
                card.classList.remove('has-bid');
                card.classList.add('no-bid');
                statusIndicator.classList.remove('pending', 'completed', 'multiple');
                statusIndicator.classList.add('no-bid');
                
                if (bidInfo) bidInfo.style.display = 'none';
                if (noBidInfo) {
                    noBidInfo.innerHTML = '<span class="no-bid-text">No Bid</span>';
                    noBidInfo.style.display = 'block';
                }
                
            } else if (item.winning_price && item.bidder_id) {
                // Item has bid(s)
                card.classList.remove('no-bid');
                card.classList.add('has-bid');
                statusIndicator.classList.remove('pending', 'no-bid');
                
                // Check if multiple winners
                const hasMultipleWinners = item.winner_count > 1 || (item.winner_name && item.winner_name.includes('Winners'));
                
                if (hasMultipleWinners) {
                    statusIndicator.classList.remove('completed');
                    statusIndicator.classList.add('multiple');
                } else {
                    statusIndicator.classList.remove('multiple');
                    statusIndicator.classList.add('completed');
                }
                
                // Update bid info
                if (bidInfo) {
                    const winnerDiv = bidInfo.querySelector('.winner');
                    const priceDiv = bidInfo.querySelector('.price');
                    const quantityDiv = bidInfo.querySelector('.quantity');
                    
                    if (winnerDiv) {
                        if (hasMultipleWinners) {
                            winnerDiv.textContent = item.winner_name; // e.g., "3 Winners"
                            winnerDiv.style.fontWeight = 'bold';
                        } else {
                            winnerDiv.textContent = item.winner_name || `ID ${item.bidder_id}`;
                            winnerDiv.style.fontWeight = 'normal';
                        }
                    }
                    
                    if (priceDiv) {
                        if (hasMultipleWinners) {
                            // Show average price for multiple winners
                            priceDiv.textContent = `Avg: $${parseFloat(item.winning_price).toFixed(2)}`;
                        } else {
                            priceDiv.textContent = `$${parseFloat(item.winning_price).toFixed(2)}`;
                        }
                    }
                    
                    if (quantityDiv) {
                        if (item.quantity_won > 1) {
                            quantityDiv.textContent = `Qty: ${item.quantity_won}`;
                            quantityDiv.style.display = 'block';
                        } else {
                            quantityDiv.style.display = 'none';
                        }
                    }
                }
                
                if (noBidInfo) noBidInfo.style.display = 'none';
                if (bidInfo) bidInfo.style.display = 'block';
                
            } else {
                // Item has no entry yet (unprocessed)
                card.classList.remove('has-bid');
                card.classList.add('no-bid');
                statusIndicator.classList.remove('completed', 'no-bid', 'multiple');
                statusIndicator.classList.add('pending');
                
                if (bidInfo) bidInfo.style.display = 'none';
                if (noBidInfo) noBidInfo.style.display = 'block';
            }
        });
        
        this.updateCompletionStats();
    }
    
    updateCompletionStats() {
        const totalItems = window.auctionItems ? window.auctionItems.length : 0;
        const completedItems = window.auctionItems ? window.auctionItems.filter(item => item.bidder_id !== null).length : 0;
        
        const statsElement = document.getElementById('completion-stats');
        if (statsElement) {
            statsElement.textContent = `(${completedItems} of ${totalItems} completed)`;
        }
        
        // Update progress bar and running total
        this.processedCount = completedItems;
        this.calculateRunningTotal();
        this.updateProgress();
    }
    
    updateItemCardStatus(itemId, status) {
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!card) return;
        
        const statusIndicator = card.querySelector('.status-indicator');
        const bidInfo = card.querySelector('.bid-info');
        const noBidInfo = card.querySelector('.no-bid-info');
        
        // Reset all status classes
        statusIndicator.classList.remove('pending', 'completed', 'no-bid', 'multiple');
        card.classList.remove('has-bid', 'no-bid');
        
        if (status === 'no-bid') {
            statusIndicator.classList.add('no-bid');
            card.classList.add('no-bid');
            
            // Update content to show "No Bid"
            if (bidInfo) bidInfo.style.display = 'none';
            if (noBidInfo) {
                noBidInfo.innerHTML = '<span class="no-bid-text">No Bid</span>';
                noBidInfo.style.display = 'block';
            }
        } else if (status === 'completed') {
            statusIndicator.classList.add('completed');
            card.classList.add('has-bid');
            
            if (bidInfo) bidInfo.style.display = 'block';
            if (noBidInfo) noBidInfo.style.display = 'none';
        } else {
            statusIndicator.classList.add('pending');
            if (bidInfo) bidInfo.style.display = 'none';
            if (noBidInfo) noBidInfo.style.display = 'block';
        }
    }

    async refreshItemStatuses() {
        const auctionId = document.getElementById('auction-id')?.value;
        if (!auctionId) return;

        try {
            const response = await fetch(`../api/get_auction_items.php?auction_id=${auctionId}`, {
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (data.error) {
                console.error('Error refreshing item statuses:', data.error);
                return;
            }

            if (!data.items) {
                console.error('No items data returned');
                return;
            }

            // Update global items array
            window.auctionItems = data.items;
            this.items = data.items;

            // Re-render the item status grid
            const grid = document.getElementById('item-status-grid');
            if (!grid) return;

            grid.innerHTML = '';

            data.items.forEach(item => {
                const hasMultipleWinners = (item.winner_count || 0) > 1;
                const isNoBid = item.bidder_id == 0;
                const hasBid = item.winning_price && item.bidder_id && !isNoBid;

                const cardClass = hasBid ? 'has-bid' : 'no-bid';
                const statusClass = isNoBid ? 'no-bid' : (hasBid ? (hasMultipleWinners ? 'multiple' : 'completed') : 'pending');

                const card = document.createElement('div');
                card.className = `item-status-card ${cardClass}`;
                card.dataset.itemId = item.item_id;
                card.title = 'Click to edit this item\'s bid';

                let bidDisplay = '';
                if (isNoBid) {
                    bidDisplay = '<div class="no-bid-info"><span class="no-bid-text">No Bid</span></div>';
                } else if (hasBid) {
                    const winnerStyle = hasMultipleWinners ? 'style="font-weight: bold;"' : '';
                    const priceLabel = hasMultipleWinners ? 'Avg: ' : '';
                    const quantityDisplay = item.quantity_won > 1 ? `<div class="quantity">Qty: ${item.quantity_won}</div>` : '';

                    bidDisplay = `
                        <div class="bid-info">
                            <div class="winner" ${winnerStyle}>${item.winner_name || 'ID ' + item.bidder_id}</div>
                            <div class="price">${priceLabel}$${parseFloat(item.winning_price).toFixed(2)}</div>
                            ${quantityDisplay}
                        </div>
                    `;
                } else {
                    bidDisplay = `<div class="no-bid-info"><span class="quantity-available">${item.item_quantity} available</span></div>`;
                }

                card.innerHTML = `
                    <div class="item-header">
                        <span class="item-id">#${item.item_id}</span>
                        <span class="status-indicator ${statusClass}"></span>
                    </div>
                    <div class="item-name">${this.escapeHtml(item.item_name)}</div>
                    ${bidDisplay}
                `;

                // Add click handler to load item for editing
                card.addEventListener('click', () => {
                    document.getElementById('item-id').value = item.item_id;
                    this.selectItem(item.item_id, item.item_name, item.item_description, item.item_quantity);
                });

                grid.appendChild(card);
            });

            // Update completion stats
            this.updateCompletionStats();

        } catch (error) {
            console.error('Error refreshing item statuses:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize bid entry when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize bid entry interface if on bid entry page
    if (document.getElementById('bid-form') && window.auctionItems) {
        new BidEntry();
    }
    
    // Auto-focus first input on forms
    const firstInput = document.querySelector('form input[type="text"]:first-of-type, form input[type="email"]:first-of-type, form input[type="number"]:first-of-type');
    if (firstInput) {
        firstInput.focus();
    }
    
    // Confirm delete actions
    document.querySelectorAll('a[onclick*="confirm"]').forEach(link => {
        link.addEventListener('click', function(e) {
            if (!confirm(this.getAttribute('onclick').match(/'([^']+)'/)[1])) {
                e.preventDefault();
            }
        });
    });
    
    // Auto-dismiss alerts after 5 seconds (except batch mode notifications)
    setTimeout(() => {
        document.querySelectorAll('.alert').forEach(alert => {
            // Don't auto-dismiss error alerts or batch mode notifications
            if (!alert.classList.contains('alert-error') && 
                !alert.textContent.includes('Batch Mode Active')) {
                alert.style.transition = 'opacity 0.5s';
                alert.style.opacity = '0';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 500);
            }
        });
    }, 5000);
    
    // Phone number formatting
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', function() {
            let x = this.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
            this.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    });
});

// Utility functions
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return '(' + cleaned.substr(0,3) + ') ' + cleaned.substr(3,3) + '-' + cleaned.substr(6,4);
    }
    return phone;
}

// Export for use in other scripts
window.AuctionUtils = {
    formatCurrency,
    formatPhone
};