// Silent Auction Management System - JavaScript

// Bid Entry Interface
class BidEntry {
    constructor() {
        this.currentItemIndex = 0;
        this.items = window.auctionItems || [];
        this.recentEntries = [];
        this.runningTotal = 0;
        this.processedCount = 0;
        
        this.init();
    }
    
    init() {
        if (!this.items.length) return;
        
        this.bindEvents();
        this.loadCurrentItem();
        this.updateProgress();
        this.calculateRunningTotal();
        
        // Focus first field
        document.getElementById('bidder-id').focus();
    }
    
    bindEvents() {
        const form = document.getElementById('bid-form');
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
            // Escape = Clear form
            else if (e.key === 'Escape') {
                e.preventDefault();
                this.clearForm();
            }
        });
        
        // Bidder lookup
        bidderInput.addEventListener('input', () => {
            this.performLookup('bidder', bidderInput.value);
        });
        
        // Auto-tab through fields
        bidderInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && bidderInput.value) {
                e.preventDefault();
                priceInput.focus();
            }
        });
        
        priceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && priceInput.value) {
                e.preventDefault();
                quantityInput.focus();
            }
        });
        
        // Item navigation buttons
        document.getElementById('prev-item').addEventListener('click', () => {
            this.previousItem();
        });
        
        document.getElementById('next-item').addEventListener('click', () => {
            this.nextItem();
        });
        
        document.getElementById('skip-item').addEventListener('click', () => {
            this.skipItem();
        });
        
        document.getElementById('clear-form').addEventListener('click', () => {
            this.clearForm();
        });
        
        // Item quick navigation
        document.querySelectorAll('.item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.goToItem(index);
            });
        });
    }
    
    loadCurrentItem() {
        if (this.currentItemIndex >= this.items.length) {
            this.showCompletionMessage();
            return;
        }
        
        const item = this.items[this.currentItemIndex];
        const itemInfo = document.getElementById('item-info');
        
        itemInfo.innerHTML = `
            <strong>#${item.item_id}: ${item.item_name}</strong><br>
            <small>${item.item_description || 'No description'}</small><br>
            <small>Available: ${item.item_quantity}</small>
        `;
        
        // Pre-fill if item has existing bid
        if (item.winning_price) {
            document.getElementById('bidder-id').value = item.bidder_id || '';
            document.getElementById('winning-price').value = item.winning_price || '';
            document.getElementById('quantity-won').value = item.quantity_won || 1;
            
            if (item.winner_name) {
                this.showBidderLookup([{
                    id: item.bidder_id,
                    name: item.winner_name,
                    display: item.winner_name + ' (' + item.bidder_id + ')'
                }]);
            }
        } else {
            this.clearForm();
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
    
    performLookup(type, term) {
        if (!term || term.length < 1) {
            this.hideLookup(type);
            return;
        }
        
        fetch(`../api/lookup.php?type=${type}&term=${encodeURIComponent(term)}`)
            .then(response => response.json())
            .then(data => {
                if (data.results) {
                    if (type === 'bidder') {
                        this.showBidderLookup(data.results);
                    }
                }
            })
            .catch(error => {
                console.error('Lookup error:', error);
            });
    }
    
    showBidderLookup(results) {
        const container = document.getElementById('bidder-lookup');
        
        if (!results.length) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = results.map(bidder => `
            <div class="lookup-item" data-id="${bidder.id}" data-name="${bidder.name}">
                <strong>${bidder.display}</strong><br>
                <small>${bidder.phone || ''} ${bidder.email || ''}</small>
            </div>
        `).join('');
        
        // Bind click events
        container.querySelectorAll('.lookup-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const name = item.dataset.name;
                
                document.getElementById('bidder-id').value = id;
                container.innerHTML = `<div class="lookup-item"><strong>${name}</strong></div>`;
                
                // Move focus to price
                document.getElementById('winning-price').focus();
            });
        });
    }
    
    hideLookup(type) {
        if (type === 'bidder') {
            document.getElementById('bidder-lookup').innerHTML = '';
        }
    }
    
    saveBid() {
        const auctionId = document.getElementById('auction-id').value;
        const bidderId = document.getElementById('bidder-id').value;
        const winningPrice = document.getElementById('winning-price').value;
        const quantityWon = document.getElementById('quantity-won').value;
        const currentItem = this.items[this.currentItemIndex];
        
        if (!bidderId || !winningPrice) {
            alert('Please enter both Bidder ID and Winning Price');
            return;
        }
        
        const bidData = {
            auction_id: auctionId,
            item_id: currentItem.item_id,
            bidder_id: parseInt(bidderId),
            winning_price: parseFloat(winningPrice),
            quantity_won: parseInt(quantityWon) || 1,
            action: 'save'
        };
        
        fetch('../api/save_bid.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bidData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update item with new bid info
                currentItem.winning_price = bidData.winning_price;
                currentItem.quantity_won = bidData.quantity_won;
                currentItem.bidder_id = bidData.bidder_id;
                
                // Add to recent entries
                this.addRecentEntry(currentItem, bidData);
                
                // Update running total and progress
                this.calculateRunningTotal();
                this.updateProgress();
                
                // Update item button to show it has a bid
                const itemBtn = document.querySelector(`.item-btn[data-index="${this.currentItemIndex}"]`);
                if (itemBtn) {
                    itemBtn.classList.add('has-bid');
                }
                
                // Move to next item
                this.nextItem();
                
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
    
    nextItem() {
        if (this.currentItemIndex < this.items.length - 1) {
            this.currentItemIndex++;
            this.loadCurrentItem();
        } else {
            this.showCompletionMessage();
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
    
    clearForm() {
        document.getElementById('bidder-id').value = '';
        document.getElementById('winning-price').value = '';
        document.getElementById('quantity-won').value = 1;
        document.getElementById('bidder-lookup').innerHTML = '';
        
        // Focus bidder ID field
        document.getElementById('bidder-id').focus();
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
        
        this.items.forEach(item => {
            if (item.winning_price) {
                this.runningTotal += item.winning_price * (item.quantity_won || 1);
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