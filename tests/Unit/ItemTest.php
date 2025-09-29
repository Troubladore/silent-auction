<?php

namespace AuctionSystem\Tests\Unit;

use AuctionSystem\Tests\TestCase;
use Item;

class ItemTest extends TestCase
{
    private $item;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->item = new Item();
    }
    
    public function testCreateItem()
    {
        $data = [
            'item_name' => 'Test Item',
            'item_description' => 'A detailed test item description',
            'item_quantity' => 2
        ];
        
        $result = $this->item->create($data);
        
        $this->assertTrue($result['success']);
        $this->assertIsNumeric($result['id']);
        $this->assertGreaterThan(0, $result['id']);
        $this->assertDatabaseCount('items', 1);
    }
    
    public function testCreateItemRequiredFields()
    {
        $data = [
            'item_name' => 'Minimal Item'
        ];
        
        $result = $this->item->create($data);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('items', 1);
        
        // Check default quantity is 1
        $item = $this->item->getById($result['id']);
        $this->assertEquals(1, $item['item_quantity']);
    }
    
    public function testCreateItemMissingRequired()
    {
        $data = [
            'item_description' => 'Item without name'
            // Missing item_name
        ];
        
        $result = $this->item->create($data);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Item name is required', $result['errors']);
        $this->assertDatabaseCount('items', 0);
    }
    
    public function testCreateItemQuantityValidation()
    {
        $data = [
            'item_name' => 'Test Item',
            'item_quantity' => 0 // Invalid quantity
        ];
        
        $result = $this->item->create($data);
        
        $this->assertTrue($result['success']);
        
        // Check quantity was defaulted to 1
        $item = $this->item->getById($result['id']);
        $this->assertEquals(1, $item['item_quantity']);
    }
    
    public function testGetById()
    {
        $itemId = $this->createTestItem([
            'item_name' => 'Special Item',
            'item_description' => 'Very special item',
            'item_quantity' => 3
        ]);
        
        $item = $this->item->getById($itemId);
        
        $this->assertIsArray($item);
        $this->assertEquals('Special Item', $item['item_name']);
        $this->assertEquals('Very special item', $item['item_description']);
        $this->assertEquals(3, $item['item_quantity']);
    }
    
    public function testGetByIdNotFound()
    {
        $item = $this->item->getById(999);
        $this->assertFalse($item);
    }
    
    public function testGetAll()
    {
        // Create multiple items
        $this->createTestItem(['item_name' => 'Apple Basket']);
        $this->createTestItem(['item_name' => 'Book Collection']);
        $this->createTestItem(['item_name' => 'Chocolate Box']);
        
        $items = $this->item->getAll();
        
        $this->assertCount(3, $items);
        // Should be ordered by item name
        $this->assertEquals('Apple Basket', $items[0]['item_name']);
        $this->assertEquals('Book Collection', $items[1]['item_name']);
        $this->assertEquals('Chocolate Box', $items[2]['item_name']);
    }
    
    public function testGetAllWithSearch()
    {
        $this->createTestItem(['item_name' => 'Wine Basket', 'item_description' => 'Local wines']);
        $this->createTestItem(['item_name' => 'Book Set', 'item_description' => 'Classic literature']);
        $this->createTestItem(['item_name' => 'Wine Glass Set', 'item_description' => 'Crystal glasses']);
        
        // Search by name
        $items = $this->item->getAll('Wine');
        $this->assertCount(2, $items);
        
        // Search by description
        $items = $this->item->getAll('Classic');
        $this->assertCount(1, $items);
        $this->assertEquals('Book Set', $items[0]['item_name']);
        
        // Search by ID
        $itemId = $this->createTestItem(['item_name' => 'Searchable Item']);
        $items = $this->item->getAll((string)$itemId);
        $this->assertCount(1, $items);
        $this->assertEquals('Searchable Item', $items[0]['item_name']);
    }
    
    public function testGetAllWithPagination()
    {
        // Create 10 items
        for ($i = 1; $i <= 10; $i++) {
            $this->createTestItem(['item_name' => "Item " . str_pad($i, 2, '0', STR_PAD_LEFT)]);
        }
        
        // Get first page (limit 5)
        $items = $this->item->getAll('', 5, 0);
        $this->assertCount(5, $items);
        
        // Get second page
        $items = $this->item->getAll('', 5, 5);
        $this->assertCount(5, $items);
        
        // Get beyond available records
        $items = $this->item->getAll('', 5, 10);
        $this->assertCount(0, $items);
    }
    
    public function testSearch()
    {
        $itemId = $this->createTestItem([
            'item_name' => 'Wine Gift Basket',
            'item_description' => 'Premium wines and snacks',
            'item_quantity' => 2
        ]);
        
        // Search by name
        $results = $this->item->search('Wine');
        $this->assertCount(1, $results);
        $this->assertEquals('Wine Gift Basket', $results[0]['item_name']);
        
        // Search by ID
        $results = $this->item->search((string)$itemId);
        $this->assertCount(1, $results);
        $this->assertEquals($itemId, $results[0]['item_id']);
        
        // Search by description
        $results = $this->item->search('Premium');
        $this->assertCount(1, $results);
        $this->assertEquals('Wine Gift Basket', $results[0]['item_name']);
    }
    
    public function testUpdate()
    {
        $itemId = $this->createTestItem([
            'item_name' => 'Original Name',
            'item_description' => 'Original description',
            'item_quantity' => 1
        ]);
        
        $updateData = [
            'item_name' => 'Updated Name',
            'item_description' => 'Updated description',
            'item_quantity' => 3
        ];
        
        $result = $this->item->update($itemId, $updateData);
        
        if (!$result['success']) {
            $this->fail('Update failed: ' . implode(', ', $result['errors'] ?? ['Unknown error']));
        }
        
        $this->assertTrue($result['success']);
        
        // Verify changes
        $item = $this->item->getById($itemId);
        $this->assertEquals('Updated Name', $item['item_name']);
        $this->assertEquals('Updated description', $item['item_description']);
        $this->assertEquals(3, $item['item_quantity']);
    }
    
    public function testUpdateMissingRequired()
    {
        $itemId = $this->createTestItem();
        
        $updateData = [
            'item_name' => '', // Empty required field
            'item_description' => 'Updated description'
        ];
        
        $result = $this->item->update($itemId, $updateData);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Item name is required', $result['errors']);
    }
    
    public function testDelete()
    {
        $itemId = $this->createTestItem();
        
        $result = $this->item->delete($itemId);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('items', 0);
        $this->assertFalse($this->item->getById($itemId));
    }
    
    public function testDeleteInAuction()
    {
        // Create item and add to auction
        $scenario = $this->createTestScenario();
        
        // Try to delete item that's in an auction
        $result = $this->item->delete($scenario['item_id']);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Cannot delete item that is part of auctions', $result['errors']);
        $this->assertDatabaseCount('items', 1); // Should still exist
    }
    
    public function testAddToAuction()
    {
        $itemId = $this->createTestItem();
        $auctionId = $this->createTestAuction();
        
        $result = $this->item->addToAuction($itemId, $auctionId);
        
        $this->assertTrue($result);
        $this->assertDatabaseHas('auction_items', [
            'item_id' => $itemId,
            'auction_id' => $auctionId
        ]);
    }
    
    public function testAddToAuctionDuplicate()
    {
        $scenario = $this->createTestScenario();
        
        // Try to add same item to same auction again
        $result = $this->item->addToAuction($scenario['item_id'], $scenario['auction_id']);
        
        $this->assertFalse($result);
    }
    
    public function testRemoveFromAuction()
    {
        $scenario = $this->createTestScenario();
        
        $result = $this->item->removeFromAuction($scenario['item_id'], $scenario['auction_id']);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseMissing('auction_items', [
            'item_id' => $scenario['item_id'],
            'auction_id' => $scenario['auction_id']
        ]);
    }
    
    public function testRemoveFromAuctionWithBids()
    {
        // Create scenario with winning bid
        $scenario = $this->createTestScenario();
        
        // Add a winning bid
        $auction = new \Auction();
        $auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            75.00,
            1
        );
        
        // Try to remove item with bids
        $result = $this->item->removeFromAuction($scenario['item_id'], $scenario['auction_id']);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Cannot remove item with winning bids', $result['errors']);
    }
    
    public function testGetAvailableForAuction()
    {
        // Start fresh - we know exactly what we have
        $this->assertDatabaseCount('items', 0);
        
        $auction1 = $this->createTestAuction();
        $auction2 = $this->createTestAuction(['auction_description' => 'Second Auction']);
        
        $item1 = $this->createTestItem(['item_name' => 'Available Item']);
        $item2 = $this->createTestItem(['item_name' => 'Used Item']);
        
        // Add item2 to auction1
        $this->item->addToAuction($item2, $auction1);
        
        // Get available items for auction2
        $available = $this->item->getAvailableForAuction($auction2);
        
        // Debug: show what we actually got
        if (count($available) != 1) {
            $names = array_map(fn($item) => $item['item_name'], $available);
            $this->fail("Expected 1 available item but got " . count($available) . ": " . implode(', ', $names));
        }
        
        // Should only include item1 (item2 is already in auction1)
        $this->assertCount(1, $available);
        $this->assertEquals('Available Item', $available[0]['item_name']);
    }
    
    public function testGetForAuction()
    {
        $scenario = $this->createTestScenario(['item_name' => 'Auction Item']);
        
        $items = $this->item->getForAuction($scenario['auction_id']);
        
        $this->assertCount(1, $items);
        $this->assertEquals('Auction Item', $items[0]['item_name']);
        $this->assertArrayHasKey('auction_item_id', $items[0]);
    }
    
    public function testGetCount()
    {
        $this->assertEquals(0, $this->item->getCount());
        
        $this->createTestItem(['item_name' => 'Item 1']);
        $this->assertEquals(1, $this->item->getCount());
        
        $this->createTestItem(['item_name' => 'Item 2']);
        $this->assertEquals(2, $this->item->getCount());
        
        // Test with search
        $this->assertEquals(1, $this->item->getCount('Item 1'));
        $this->assertEquals(0, $this->item->getCount('NonExistent'));
    }
}