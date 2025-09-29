<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;
use Auction;
use Item;

class ImprovedBatchModeTest extends TestCase
{
    private $auction;
    private $item;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->auction = new Auction();
        $this->item = new Item();
    }
    
    public function testBatchModePageExists()
    {
        // Test that the new batch_items.php page exists and is accessible
        $batchPagePath = __DIR__ . '/../../pages/batch_items.php';
        $this->assertFileExists($batchPagePath, 'batch_items.php page should exist');
        
        // Test that it requires auction_id parameter
        $content = file_get_contents($batchPagePath);
        $this->assertStringContainsString('auction_id', $content, 
            'Batch page should require auction_id parameter');
        $this->assertStringContainsString('Batch Mode Active', $content,
            'Batch page should display batch mode indicator');
    }
    
    public function testBatchModeShowsAuctionContext()
    {
        $batchPageContent = file_get_contents(__DIR__ . '/../../pages/batch_items.php');
        
        // Should display auction information prominently
        $this->assertStringContainsString('auction_description', $batchPageContent,
            'Batch mode should display auction description');
        $this->assertStringContainsString('auction_date', $batchPageContent,
            'Batch mode should display auction date');
        $this->assertStringContainsString('item_count', $batchPageContent,
            'Batch mode should show current item count');
        $this->assertStringContainsString('total_revenue', $batchPageContent,
            'Batch mode should show auction revenue');
    }
    
    public function testBatchModeOffersBothWorkflows()
    {
        $batchPageContent = file_get_contents(__DIR__ . '/../../pages/batch_items.php');
        
        // Should offer both new item creation and existing item association
        $this->assertStringContainsString('Create New Items', $batchPageContent,
            'Batch mode should offer new item creation');
        $this->assertStringContainsString('Add Existing Items', $batchPageContent,
            'Batch mode should offer existing item association');
        $this->assertStringContainsString('action=add_new', $batchPageContent,
            'Should have link to new item workflow');
        $this->assertStringContainsString('action=add_existing', $batchPageContent,
            'Should have link to existing item workflow');
    }
    
    public function testBatchModeHasReturnToAuctionLink()
    {
        $batchPageContent = file_get_contents(__DIR__ . '/../../pages/batch_items.php');
        
        // Should have clear way to return to the source auction
        $this->assertStringContainsString('Back to Auction', $batchPageContent,
            'Batch mode should have link back to auction');
        $this->assertStringContainsString('auctions.php?action=edit', $batchPageContent,
            'Back link should go to auction edit page');
    }
    
    public function testBatchModeHasAddAnotherFunctionality()
    {
        $batchPageContent = file_get_contents(__DIR__ . '/../../pages/batch_items.php');
        
        // Should have "Add & Add Another" button for rapid entry
        $this->assertStringContainsString('Add & Add Another', $batchPageContent,
            'Should have Add & Add Another button for rapid entry');
        $this->assertStringContainsString('add_another', $batchPageContent,
            'Should handle add another functionality');
    }
    
    public function testAuctionLinksToBatchMode()
    {
        $auctionsPageContent = file_get_contents(__DIR__ . '/../../pages/auctions.php');
        
        // Auction page should link to new batch_items.php instead of old items.php
        $this->assertStringContainsString('batch_items.php', $auctionsPageContent,
            'Auctions page should link to dedicated batch_items.php page');
        $this->assertStringNotContainsString('items.php?batch_auction', $auctionsPageContent,
            'Should not use old batch mode URL pattern');
    }
    
    public function testBatchModeCreatesItemsAndAssociatesWithAuction()
    {
        // Test the backend functionality for new item creation in batch mode
        
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Batch Mode Test Auction'
        ]);
        $this->assertTrue($auctionResult['success']);
        $auctionId = $auctionResult['id'];
        
        // Create new item
        $itemResult = $this->item->create([
            'item_name' => 'Batch Created Item',
            'item_description' => 'Item created via batch mode',
            'item_quantity' => 1
        ]);
        $this->assertTrue($itemResult['success']);
        $itemId = $itemResult['id'];
        
        // Associate with auction (simulating batch mode)
        $associationResult = $this->item->addToAuction($itemId, $auctionId);
        $this->assertTrue($associationResult);
        
        // Verify association exists
        $this->assertDatabaseHas('auction_items', [
            'auction_id' => $auctionId,
            'item_id' => $itemId
        ]);
        
        // Verify auction stats are updated
        $updatedAuction = $this->auction->getWithStats($auctionId);
        $this->assertEquals(1, $updatedAuction['item_count']);
    }
    
    public function testBatchModeAssociatesExistingItems()
    {
        // Test the backend functionality for existing item association
        
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15', 
            'auction_description' => 'Existing Items Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Create some existing items
        $item1 = $this->item->create([
            'item_name' => 'Existing Item 1',
            'item_description' => 'Pre-existing inventory item',
            'item_quantity' => 1
        ]);
        $item2 = $this->item->create([
            'item_name' => 'Existing Item 2', 
            'item_description' => 'Another pre-existing item',
            'item_quantity' => 2
        ]);
        
        $this->assertTrue($item1['success'] && $item2['success']);
        
        // Associate multiple existing items (simulating batch selection)
        $associated1 = $this->item->addToAuction($item1['id'], $auctionId);
        $associated2 = $this->item->addToAuction($item2['id'], $auctionId);
        
        $this->assertTrue($associated1 && $associated2);
        
        // Verify auction has both items
        $updatedAuction = $this->auction->getWithStats($auctionId);
        $this->assertEquals(2, $updatedAuction['item_count']);
    }
}