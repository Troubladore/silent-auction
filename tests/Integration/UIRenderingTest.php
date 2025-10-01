<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;
use Auction;
use Item;

class UIRenderingTest extends TestCase
{
    private $auction;
    private $item;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->auction = new Auction();
        $this->item = new Item();
        
        // Set up session to bypass authentication
        if (!isset($_SESSION)) {
            session_start();
        }
        $_SESSION['authenticated'] = true;
    }
    
    public function testBatchModePageRenders()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'UI Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Simulate GET parameters
        $_GET['auction_id'] = $auctionId;
        $_GET['action'] = 'choose';
        
        // Capture the rendered output
        ob_start();
        
        // Temporarily change working directory to pages
        $originalDir = getcwd();
        chdir(__DIR__ . '/../../pages');
        
        try {
            include 'batch_items.php';
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
            chdir($originalDir);
            // Clean up GET params
            unset($_GET['auction_id'], $_GET['action']);
        }
        
        // Validate the output contains expected batch mode elements
        $this->assertStringContainsString('Batch Mode Active', $output, 
            'Page should display batch mode banner');
        
        $this->assertStringContainsString('UI Test Auction', $output,
            'Page should display auction description');
            
        $this->assertStringContainsString('Create New Items', $output,
            'Page should offer create new items option');
            
        $this->assertStringContainsString('Add Existing Items', $output,
            'Page should offer add existing items option');
            
        $this->assertStringContainsString('Back to Auction', $output,
            'Page should have back to auction link');
    }
    
    public function testBatchModeTextVisibility()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Text Visibility Test'
        ]);
        $auctionId = $auctionResult['id'];
        
        $_GET['auction_id'] = $auctionId;
        $_GET['action'] = 'choose';
        
        ob_start();
        $originalDir = getcwd();
        chdir(__DIR__ . '/../../pages');
        
        try {
            include 'batch_items.php';
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
            chdir($originalDir);
            unset($_GET['auction_id'], $_GET['action']);
        }
        
        // Check for CSS that ensures text visibility
        $this->assertStringContainsString('color: white !important', $output,
            'CSS should force white text color with !important');
            
        $this->assertStringContainsString('.auction-context strong', $output,
            'CSS should target auction context strong elements');
            
        $this->assertStringContainsString('.auction-meta', $output,
            'CSS should target auction meta elements');
    }
    
    public function testAuctionEditPageRendering()
    {
        // Create test auction with items
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Edit Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Create and associate test item
        $itemResult = $this->item->create([
            'item_name' => 'Test Item',
            'item_description' => 'Test Description',
            'item_quantity' => 1
        ]);
        $this->item->addToAuction($itemResult['id'], $auctionId);
        
        $_GET['action'] = 'edit';
        $_GET['id'] = $auctionId;
        
        ob_start();
        $originalDir = getcwd();
        chdir(__DIR__ . '/../../pages');
        
        try {
            include 'auctions.php';
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
            chdir($originalDir);
            unset($_GET['action'], $_GET['id']);
        }
        
        // Validate auction edit page elements
        $this->assertStringContainsString('Edit Test Auction', $output,
            'Page should display auction description');
            
        $this->assertStringContainsString('Update Auction', $output,
            'Page should have update auction button');
            
        $this->assertStringContainsString('Items in Auction', $output,
            'Page should show items section');
            
        $this->assertStringContainsString('Test Item', $output,
            'Page should display associated items');
            
        $this->assertStringContainsString('batch_items.php', $output,
            'Page should link to batch items page');
    }
    
    public function testBatchNewItemFormRendering()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Form Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        $_GET['auction_id'] = $auctionId;
        $_GET['action'] = 'add_new';
        
        ob_start();
        $originalDir = getcwd();
        chdir(__DIR__ . '/../../pages');
        
        try {
            include 'batch_items.php';
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
            chdir($originalDir);
            unset($_GET['auction_id'], $_GET['action']);
        }
        
        // Validate form elements
        $this->assertStringContainsString('Create New Item for Auction', $output,
            'Page should have form title');
            
        $this->assertStringContainsString('name="item_name"', $output,
            'Form should have item name field');
            
        $this->assertStringContainsString('name="item_description"', $output,
            'Form should have item description field');
            
        $this->assertStringContainsString('name="item_quantity"', $output,
            'Form should have item quantity field');
            
        $this->assertStringContainsString('Add & Add Another', $output,
            'Form should have Add & Add Another button');
            
        $this->assertStringContainsString('Add & Finish', $output,
            'Form should have Add & Finish button');
    }
    
    public function testBatchExistingItemsRendering()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Existing Items Test'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Create available items
        $this->item->create([
            'item_name' => 'Available Item 1',
            'item_description' => 'Available for association',
            'item_quantity' => 1
        ]);
        $this->item->create([
            'item_name' => 'Available Item 2',
            'item_description' => 'Another available item',
            'item_quantity' => 2
        ]);
        
        $_GET['auction_id'] = $auctionId;
        $_GET['action'] = 'add_existing';
        
        ob_start();
        $originalDir = getcwd();
        chdir(__DIR__ . '/../../pages');
        
        try {
            include 'batch_items.php';
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
            chdir($originalDir);
            unset($_GET['auction_id'], $_GET['action']);
        }
        
        // Validate existing items interface
        $this->assertStringContainsString('Add Existing Items to Auction', $output,
            'Page should have existing items title');
            
        $this->assertStringContainsString('Available Item 1', $output,
            'Page should list available items');
            
        $this->assertStringContainsString('Available Item 2', $output,
            'Page should list all available items');
            
        $this->assertStringContainsString('Select All', $output,
            'Page should have select all functionality');
            
        $this->assertStringContainsString('Add Selected Items to Auction', $output,
            'Page should have submit button');
            
        $this->assertStringContainsString('name="item_ids[]"', $output,
            'Form should have checkboxes for item selection');
    }
    
    public function testBatchModeJavaScriptPresence()
    {
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'JS Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        $_GET['auction_id'] = $auctionId;
        $_GET['action'] = 'add_existing';
        
        ob_start();
        $originalDir = getcwd();
        chdir(__DIR__ . '/../../pages');
        
        try {
            include 'batch_items.php';
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
            chdir($originalDir);
            unset($_GET['auction_id'], $_GET['action']);
        }
        
        // Check for JavaScript functionality
        $this->assertStringContainsString('select-all', $output,
            'Page should have select-all checkbox with proper ID');
            
        $this->assertStringContainsString('addEventListener', $output,
            'Page should include JavaScript event listeners');
            
        $this->assertStringContainsString('checkbox.checked = this.checked', $output,
            'JavaScript should handle select all functionality');
            
        $this->assertStringContainsString('focus()', $output,
            'JavaScript should auto-focus first input');
    }
}