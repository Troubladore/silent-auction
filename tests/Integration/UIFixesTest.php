<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;
use Auction;
use Item;

class UIFixesTest extends TestCase
{
    private $auction;
    private $item;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->auction = new Auction();
        $this->item = new Item();
    }
    
    public function testUpdateAuctionWithValidData()
    {
        // Create test auction
        $result = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Test Auction for Update'
        ]);
        $this->assertTrue($result['success']);
        $auctionId = $result['id'];
        
        // Test updating auction with valid data
        $updateResult = $this->auction->update($auctionId, [
            'auction_date' => '2024-01-20',
            'auction_description' => 'Updated Test Auction',
            'status' => 'active'
        ]);
        
        $this->assertTrue($updateResult['success'], 'Update auction should succeed with valid data');
        
        // Verify the update worked
        $updatedAuction = $this->auction->getWithStats($auctionId);
        $this->assertEquals('Updated Test Auction', $updatedAuction['auction_description']);
        $this->assertEquals('2024-01-20', $updatedAuction['auction_date']);
    }
    
    public function testUpdateAuctionWithMissingRequiredData()
    {
        // Create test auction
        $result = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Test Auction'
        ]);
        $auctionId = $result['id'];
        
        // Test updating with missing required field
        $updateResult = $this->auction->update($auctionId, [
            'auction_date' => '2024-01-20'
            // Missing auction_description
        ]);
        
        $this->assertFalse($updateResult['success'], 'Update should fail with missing required data');
        $this->assertNotEmpty($updateResult['errors'], 'Should return validation errors');
    }
    
    public function testBatchItemCreationAndAssociation()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Batch Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Test creating item for batch addition
        $itemData = [
            'item_name' => 'Batch Created Item',
            'item_description' => 'Item created via batch mode',
            'item_quantity' => 1
        ];
        
        $itemResult = $this->item->create($itemData);
        $this->assertTrue($itemResult['success'], 'Item creation should succeed');
        $itemId = $itemResult['id'];
        
        // Test adding item to auction (batch mode simulation)
        $addResult = $this->item->addToAuction($itemId, $auctionId);
        $this->assertTrue($addResult, 'Adding item to auction should succeed');
        
        // Verify association exists
        $this->assertDatabaseHas('auction_items', [
            'auction_id' => $auctionId,
            'item_id' => $itemId
        ]);
    }
    
    public function testBatchItemCreationWithInvalidData()
    {
        // Test item creation with missing required data
        $itemResult = $this->item->create([
            'item_description' => 'Item without name',
            'item_quantity' => 1
            // Missing item_name
        ]);
        
        $this->assertFalse($itemResult['success'], 'Item creation should fail with missing name');
        $this->assertNotEmpty($itemResult['errors'], 'Should return validation errors');
    }
    
    public function testAddToAuctionWithInvalidItemId()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Try to add non-existent item
        $result = $this->item->addToAuction(99999, $auctionId);
        $this->assertFalse($result, 'Should fail when item does not exist');
    }
    
    public function testAddToAuctionWithInvalidAuctionId()
    {
        // Create test item
        $itemResult = $this->item->create([
            'item_name' => 'Test Item',
            'item_description' => 'Test Description',
            'item_quantity' => 1
        ]);
        $itemId = $itemResult['id'];
        
        // Try to add to non-existent auction
        $result = $this->item->addToAuction($itemId, 99999);
        $this->assertFalse($result, 'Should fail when auction does not exist');
    }
    
    public function testDuplicateItemAssociationPrevention()
    {
        // Create test auction and item
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Test Auction'
        ]);
        $itemResult = $this->item->create([
            'item_name' => 'Test Item',
            'item_description' => 'Test Description',
            'item_quantity' => 1
        ]);
        
        $auctionId = $auctionResult['id'];
        $itemId = $itemResult['id'];
        
        // Add item to auction first time
        $firstAdd = $this->item->addToAuction($itemId, $auctionId);
        $this->assertTrue($firstAdd, 'First association should succeed');
        
        // Try to add same item to same auction again
        $secondAdd = $this->item->addToAuction($itemId, $auctionId);
        $this->assertFalse($secondAdd, 'Duplicate association should be prevented');
        
        // Verify only one association exists
        $db = new \Database();
        $result = $db->fetch('SELECT COUNT(*) as count FROM auction_items WHERE auction_id = :auction_id AND item_id = :item_id', [
            'auction_id' => $auctionId,
            'item_id' => $itemId
        ]);
        $this->assertEquals(1, $result['count'], 'Should have exactly one association record');
    }
}