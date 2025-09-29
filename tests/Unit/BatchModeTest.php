<?php

namespace AuctionSystem\Tests\Unit;

use AuctionSystem\Tests\TestCase;
use Item;
use Auction;

class BatchModeTest extends TestCase
{
    private $item;
    private $auction;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->item = new Item();
        $this->auction = new Auction();
    }
    
    public function testBatchModeItemCreationAndAuctionAssociation()
    {
        // Create an auction first
        $auction_data = [
            'auction_date' => '2024-01-15',
            'auction_description' => 'Test Batch Auction'
        ];
        $auction_result = $this->auction->create($auction_data);
        $this->assertTrue($auction_result['success'], 'Failed to create auction for batch test');
        $auction_id = $auction_result['id'];
        
        // Create an item
        $item_data = [
            'item_name' => 'Batch Test Item',
            'item_description' => 'Test item for batch mode',
            'item_quantity' => 1
        ];
        $item_result = $this->item->create($item_data);
        $this->assertTrue($item_result['success'], 'Failed to create item');
        $item_id = $item_result['id'];
        
        // Test batch mode - add item to auction
        $batch_result = $this->item->addToAuction($item_id, $auction_id);
        $this->assertTrue($batch_result, 'Batch mode failed - item not added to auction');
        
        // Verify the association exists in auction_items table
        $this->assertDatabaseHas('auction_items', [
            'auction_id' => $auction_id,
            'item_id' => $item_id
        ]);
    }
    
    public function testBatchModeWithInvalidAuctionId()
    {
        // Create an item
        $item_data = [
            'item_name' => 'Test Item',
            'item_description' => 'Test description',
            'item_quantity' => 1
        ];
        $item_result = $this->item->create($item_data);
        $this->assertTrue($item_result['success']);
        $item_id = $item_result['id'];
        
        // Try to add to non-existent auction
        $batch_result = $this->item->addToAuction($item_id, 999999);
        $this->assertFalse($batch_result, 'Should fail when adding item to non-existent auction');
    }
    
    public function testBatchModeWithInvalidItemId()
    {
        // Create an auction
        $auction_data = [
            'auction_date' => '2024-01-15',
            'auction_description' => 'Test Auction'
        ];
        $auction_result = $this->auction->create($auction_data);
        $this->assertTrue($auction_result['success']);
        $auction_id = $auction_result['id'];
        
        // Try to add non-existent item to auction
        $batch_result = $this->item->addToAuction(999999, $auction_id);
        $this->assertFalse($batch_result, 'Should fail when adding non-existent item to auction');
    }
    
    public function testBatchModePreventsDoubleAssociation()
    {
        // Create auction and item
        $auction_data = [
            'auction_date' => '2024-01-15',
            'auction_description' => 'Test Auction'
        ];
        $auction_result = $this->auction->create($auction_data);
        $auction_id = $auction_result['id'];
        
        $item_data = [
            'item_name' => 'Test Item',
            'item_description' => 'Test description',
            'item_quantity' => 1
        ];
        $item_result = $this->item->create($item_data);
        $item_id = $item_result['id'];
        
        // Add item to auction first time
        $first_result = $this->item->addToAuction($item_id, $auction_id);
        $this->assertTrue($first_result, 'First association should succeed');
        
        // Try to add the same item to the same auction again
        $second_result = $this->item->addToAuction($item_id, $auction_id);
        $this->assertFalse($second_result, 'Should prevent duplicate associations');
        
        // Verify only one association exists
        $this->assertDatabaseHas('auction_items', [
            'auction_id' => $auction_id,
            'item_id' => $item_id
        ]);
        
        // Also verify count is exactly 1
        $count = $GLOBALS['test_pdo']->query("SELECT COUNT(*) FROM auction_items WHERE auction_id = $auction_id AND item_id = $item_id")->fetchColumn();
        $this->assertEquals(1, $count, 'Should have exactly one association');
    }
    
    public function testBatchModeCanHandleMultipleItemsToSameAuction()
    {
        // Create one auction
        $auction_data = [
            'auction_date' => '2024-01-15',
            'auction_description' => 'Multi-Item Test Auction'
        ];
        $auction_result = $this->auction->create($auction_data);
        $auction_id = $auction_result['id'];
        
        // Create multiple items
        $item_ids = [];
        for ($i = 1; $i <= 3; $i++) {
            $item_data = [
                'item_name' => "Batch Item $i",
                'item_description' => "Test item number $i",
                'item_quantity' => 1
            ];
            $item_result = $this->item->create($item_data);
            $this->assertTrue($item_result['success'], "Failed to create item $i");
            $item_ids[] = $item_result['id'];
        }
        
        // Add all items to the same auction
        foreach ($item_ids as $item_id) {
            $batch_result = $this->item->addToAuction($item_id, $auction_id);
            $this->assertTrue($batch_result, "Failed to add item $item_id to auction");
        }
        
        // Verify all associations exist
        foreach ($item_ids as $item_id) {
            $this->assertDatabaseHas('auction_items', [
                'auction_id' => $auction_id,
                'item_id' => $item_id
            ]);
        }
        
        // Verify total count
        $total_count = $GLOBALS['test_pdo']->query("SELECT COUNT(*) FROM auction_items WHERE auction_id = $auction_id")->fetchColumn();
        $this->assertEquals(3, $total_count, 'Should have 3 items associated with auction');
    }
    
    public function testAddToAuctionMethodExists()
    {
        $this->assertTrue(method_exists($this->item, 'addToAuction'), 
            'Item class must have addToAuction method for batch mode to work');
    }
    
    public function testAuctionItemsTableStructure()
    {
        // Test that auction_items table has correct structure
        try {
            $GLOBALS['test_pdo']->query("SELECT auction_id, item_id FROM auction_items LIMIT 0");
            $this->assertTrue(true, 'auction_items table has required columns');
        } catch (Exception $e) {
            $this->fail('auction_items table missing or has incorrect structure: ' . $e->getMessage());
        }
    }
}