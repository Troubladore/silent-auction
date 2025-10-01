<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;
use Auction;
use Item;

class BatchEntryFlowTest extends TestCase
{
    private $auction;
    private $item;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->auction = new Auction();
        $this->item = new Item();
    }
    
    public function testBatchNewItemCreationFlow()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Batch Test Auction'
        ]);
        $this->assertTrue($auctionResult['success']);
        $auctionId = $auctionResult['id'];
        
        // Simulate "Add & Finish" workflow
        $itemData = [
            'item_name' => 'Batch Test Item',
            'item_description' => 'Created via batch mode',
            'item_quantity' => 1
        ];
        
        // Create item
        $itemResult = $this->item->create($itemData);
        $this->assertTrue($itemResult['success'], 'Item creation should succeed');
        $itemId = $itemResult['id'];
        
        // Associate with auction
        $addResult = $this->item->addToAuction($itemId, $auctionId);
        $this->assertTrue($addResult, 'Item should be successfully added to auction');
        
        // Verify association exists
        $this->assertDatabaseHas('auction_items', [
            'auction_id' => $auctionId,
            'item_id' => $itemId
        ]);
        
        // Verify auction stats are updated
        $updatedAuction = $this->auction->getWithStats($auctionId);
        $this->assertEquals(1, $updatedAuction['item_count']);
    }
    
    public function testBatchExistingItemAssociationFlow()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Existing Items Test'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Create some existing items
        $item1 = $this->item->create([
            'item_name' => 'Existing Item 1',
            'item_description' => 'Pre-existing inventory',
            'item_quantity' => 1
        ]);
        $item2 = $this->item->create([
            'item_name' => 'Existing Item 2',
            'item_description' => 'Another pre-existing item',
            'item_quantity' => 2
        ]);
        
        $this->assertTrue($item1['success'] && $item2['success']);
        
        // Simulate batch association workflow
        $itemIds = [$item1['id'], $item2['id']];
        $addedCount = 0;
        
        foreach ($itemIds as $itemId) {
            if ($this->item->addToAuction($itemId, $auctionId)) {
                $addedCount++;
            }
        }
        
        $this->assertEquals(2, $addedCount, 'Both items should be successfully associated');
        
        // Verify auction has both items
        $updatedAuction = $this->auction->getWithStats($auctionId);
        $this->assertEquals(2, $updatedAuction['item_count']);
    }
    
    public function testAuctionUpdateWithAllFields()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Original Description'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Test update with all valid fields
        $updateData = [
            'auction_date' => '2024-01-20',
            'auction_description' => 'Updated Description',
            'status' => 'active',
            'update_auction' => '1', // Form field that should be filtered out
            'unknown_field' => 'should_be_ignored' // Invalid field that should be filtered out
        ];
        
        $updateResult = $this->auction->update($auctionId, $updateData);
        $this->assertTrue($updateResult['success'], 'Update should succeed with valid data');
        
        // Verify the update worked and filtered properly
        $updatedAuction = $this->auction->getWithStats($auctionId);
        $this->assertEquals('Updated Description', $updatedAuction['auction_description']);
        $this->assertEquals('2024-01-20', $updatedAuction['auction_date']);
        $this->assertEquals('active', $updatedAuction['status']);
    }
    
    public function testBatchModeErrorHandling()
    {
        // Create test auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-01-15',
            'auction_description' => 'Error Test Auction'
        ]);
        $auctionId = $auctionResult['id'];
        
        // Test creating item with missing required data
        $itemResult = $this->item->create([
            'item_description' => 'Item without name',
            'item_quantity' => 1
            // Missing item_name (required field)
        ]);
        
        $this->assertFalse($itemResult['success'], 'Item creation should fail with missing required data');
        $this->assertNotEmpty($itemResult['errors'], 'Should return validation errors');
        
        // Test adding non-existent item to auction
        $addResult = $this->item->addToAuction(99999, $auctionId);
        $this->assertFalse($addResult, 'Should fail when trying to add non-existent item');
        
        // Test adding item to non-existent auction
        $validItemResult = $this->item->create([
            'item_name' => 'Valid Item',
            'item_description' => 'Valid description',
            'item_quantity' => 1
        ]);
        $this->assertTrue($validItemResult['success']);
        
        $addToInvalidAuction = $this->item->addToAuction($validItemResult['id'], 99999);
        $this->assertFalse($addToInvalidAuction, 'Should fail when trying to add to non-existent auction');
    }
}