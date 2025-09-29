<?php

namespace AuctionSystem\Tests\Unit;

use AuctionSystem\Tests\TestCase;
use Auction;

class AuctionTest extends TestCase
{
    private $auction;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->auction = new Auction();
    }
    
    public function testCreateAuction()
    {
        $data = [
            'auction_date' => '2024-06-15',
            'auction_description' => 'Summer Charity Auction',
            'status' => 'planning'
        ];
        
        $result = $this->auction->create($data);
        
        $this->assertTrue($result['success']);
        $this->assertIsNumeric($result['id']);
        $this->assertGreaterThan(0, $result['id']);
        $this->assertDatabaseCount('auctions', 1);
    }
    
    public function testCreateAuctionRequiredFields()
    {
        $data = [
            'auction_date' => '2024-06-15',
            'auction_description' => 'Minimal Auction'
        ];
        
        $result = $this->auction->create($data);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('auctions', 1);
        
        // Check default status is 'planning'
        $auction = $this->auction->getById($result['id']);
        $this->assertEquals('planning', $auction['status']);
    }
    
    public function testCreateAuctionMissingRequired()
    {
        $data = [
            'auction_date' => '2024-06-15'
            // Missing auction_description
        ];
        
        $result = $this->auction->create($data);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Auction description is required', $result['errors']);
        $this->assertDatabaseCount('auctions', 0);
    }
    
    public function testCreateAuctionInvalidDate()
    {
        $data = [
            'auction_date' => 'invalid-date',
            'auction_description' => 'Test Auction'
        ];
        
        $result = $this->auction->create($data);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Invalid date format', $result['errors']);
        $this->assertDatabaseCount('auctions', 0);
    }
    
    public function testGetById()
    {
        $auctionId = $this->createTestAuction([
            'auction_description' => 'Special Auction',
            'auction_date' => '2024-07-01',
            'status' => 'active'
        ]);
        
        $auction = $this->auction->getById($auctionId);
        
        $this->assertIsArray($auction);
        $this->assertEquals('Special Auction', $auction['auction_description']);
        $this->assertEquals('2024-07-01', $auction['auction_date']);
        $this->assertEquals('active', $auction['status']);
    }
    
    public function testGetByIdNotFound()
    {
        $auction = $this->auction->getById(999);
        $this->assertFalse($auction);
    }
    
    public function testGetAll()
    {
        // Create multiple auctions
        $this->createTestAuction(['auction_description' => 'Spring Auction', 'auction_date' => '2024-03-15']);
        $this->createTestAuction(['auction_description' => 'Summer Auction', 'auction_date' => '2024-06-15']);
        $this->createTestAuction(['auction_description' => 'Fall Auction', 'auction_date' => '2024-09-15']);
        
        $auctions = $this->auction->getAll();
        
        $this->assertCount(3, $auctions);
        // Should be ordered by date DESC (newest first)
        $this->assertEquals('Fall Auction', $auctions[0]['auction_description']);
        $this->assertEquals('Summer Auction', $auctions[1]['auction_description']);
        $this->assertEquals('Spring Auction', $auctions[2]['auction_description']);
    }
    
    public function testGetAllWithPagination()
    {
        // Create 10 auctions
        for ($i = 1; $i <= 10; $i++) {
            $this->createTestAuction([
                'auction_description' => "Auction $i",
                'auction_date' => date('Y-m-d', strtotime("+$i days"))
            ]);
        }
        
        // Get first page (limit 5)
        $auctions = $this->auction->getAll(5, 0);
        $this->assertCount(5, $auctions);
        
        // Get second page
        $auctions = $this->auction->getAll(5, 5);
        $this->assertCount(5, $auctions);
        
        // Get beyond available records
        $auctions = $this->auction->getAll(5, 10);
        $this->assertCount(0, $auctions);
    }
    
    public function testGetWithStats()
    {
        $scenario = $this->createTestScenario();
        
        // Add a winning bid
        $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            125.50,
            1
        );
        
        $auction = $this->auction->getWithStats($scenario['auction_id']);
        
        $this->assertIsArray($auction);
        $this->assertEquals(1, $auction['item_count']);
        $this->assertEquals(1, $auction['bid_count']);
        $this->assertEquals('125.50', $auction['total_revenue']);
    }
    
    public function testUpdate()
    {
        $auctionId = $this->createTestAuction([
            'auction_description' => 'Original Description',
            'auction_date' => '2024-06-01',
            'status' => 'planning'
        ]);
        
        $updateData = [
            'auction_description' => 'Updated Description',
            'auction_date' => '2024-06-15',
            'status' => 'active'
        ];
        
        $result = $this->auction->update($auctionId, $updateData);
        
        if (!$result['success']) {
            $this->fail('Update failed: ' . implode(', ', $result['errors'] ?? ['Unknown error']));
        }
        
        $this->assertTrue($result['success']);
        
        // Verify changes
        $auction = $this->auction->getById($auctionId);
        $this->assertEquals('Updated Description', $auction['auction_description']);
        $this->assertEquals('2024-06-15', $auction['auction_date']);
        $this->assertEquals('active', $auction['status']);
    }
    
    public function testUpdateMissingRequired()
    {
        $auctionId = $this->createTestAuction();
        
        $updateData = [
            'auction_description' => '', // Empty required field
            'auction_date' => '2024-06-15'
        ];
        
        $result = $this->auction->update($auctionId, $updateData);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Auction description is required', $result['errors']);
    }
    
    public function testUpdateInvalidDate()
    {
        $auctionId = $this->createTestAuction();
        
        $updateData = [
            'auction_description' => 'Valid Description',
            'auction_date' => 'invalid-date'
        ];
        
        $result = $this->auction->update($auctionId, $updateData);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Invalid date format', $result['errors']);
    }
    
    public function testDelete()
    {
        $auctionId = $this->createTestAuction();
        
        $result = $this->auction->delete($auctionId);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('auctions', 0);
        $this->assertFalse($this->auction->getById($auctionId));
    }
    
    public function testDeleteWithBids()
    {
        // Create scenario with winning bid
        $scenario = $this->createTestScenario();
        
        // Add a winning bid
        $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            75.00,
            1
        );
        
        // Try to delete auction with bids
        $result = $this->auction->delete($scenario['auction_id']);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Cannot delete auction with existing bids', $result['errors']);
        $this->assertDatabaseCount('auctions', 1); // Should still exist
    }
    
    public function testUpdateStatus()
    {
        $auctionId = $this->createTestAuction(['status' => 'planning']);
        
        // Update to active
        $result = $this->auction->updateStatus($auctionId, 'active');
        $this->assertTrue($result['success']);
        
        $auction = $this->auction->getById($auctionId);
        $this->assertEquals('active', $auction['status']);
        
        // Update to completed
        $result = $this->auction->updateStatus($auctionId, 'completed');
        $this->assertTrue($result['success']);
        
        $auction = $this->auction->getById($auctionId);
        $this->assertEquals('completed', $auction['status']);
    }
    
    public function testUpdateStatusInvalid()
    {
        $auctionId = $this->createTestAuction();
        
        $result = $this->auction->updateStatus($auctionId, 'invalid_status');
        
        $this->assertFalse($result['success']);
        $this->assertContains('Invalid status', $result['errors']);
    }
    
    public function testGetItemsForBidEntry()
    {
        $scenario = $this->createTestScenario(['item_name' => 'Bid Entry Item']);
        
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        
        $this->assertCount(1, $items);
        $this->assertEquals('Bid Entry Item', $items[0]['item_name']);
        $this->assertEmpty($items[0]['bidder_id']); // No winner yet
        $this->assertEmpty($items[0]['winning_price']);
        $this->assertTrue(empty(trim($items[0]['winner_name'])), 
                         "Expected empty winner_name but got: '" . $items[0]['winner_name'] . "'");
    }
    
    public function testGetItemsForBidEntryWithBids()
    {
        $scenario = $this->createTestScenario();
        
        // Add a winning bid
        $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            99.99,
            2
        );
        
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        
        $this->assertCount(1, $items);
        $this->assertEquals($scenario['bidder_id'], $items[0]['bidder_id']);
        $this->assertEquals('99.99', $items[0]['winning_price']);
        $this->assertEquals(2, $items[0]['quantity_won']);
        $this->assertStringContainsString('Doe', $items[0]['winner_name']); // From default test bidder
    }
    
    public function testSaveBid()
    {
        $scenario = $this->createTestScenario();
        
        $result = $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            87.50,
            1
        );
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('winning_bids', 1);
        $this->assertDatabaseHas('winning_bids', [
            'auction_id' => $scenario['auction_id'],
            'item_id' => $scenario['item_id'],
            'bidder_id' => $scenario['bidder_id'],
            'winning_price' => '87.50',
            'quantity_won' => 1
        ]);
    }
    
    public function testSaveBidUpdate()
    {
        $scenario = $this->createTestScenario();
        
        // Save initial bid
        $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            50.00,
            1
        );
        
        $this->assertDatabaseCount('winning_bids', 1);
        
        // Update the bid (different bidder, higher price)
        $newBidderId = $this->createTestBidder(['first_name' => 'Jane', 'last_name' => 'Smith']);
        $result = $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $newBidderId,
            75.00,
            1
        );
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('winning_bids', 1); // Still only 1 record
        
        // Verify it was updated
        $this->assertDatabaseHas('winning_bids', [
            'auction_id' => $scenario['auction_id'],
            'item_id' => $scenario['item_id'],
            'bidder_id' => $newBidderId,
            'winning_price' => '75.00'
        ]);
    }
    
    public function testDeleteBid()
    {
        $scenario = $this->createTestScenario();
        
        // Add a bid first
        $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            65.00,
            1
        );
        
        $this->assertDatabaseCount('winning_bids', 1);
        
        // Delete the bid
        $result = $this->auction->deleteBid($scenario['auction_id'], $scenario['item_id']);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('winning_bids', 0);
    }
    
    public function testSaveBidWithQuantity()
    {
        $scenario = $this->createTestScenario([
            'item_name' => 'Multiple Item',
            'item_quantity' => 5
        ]);
        
        $result = $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            25.00,
            3 // Buy 3 out of 5
        );
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseHas('winning_bids', [
            'auction_id' => $scenario['auction_id'],
            'item_id' => $scenario['item_id'],
            'quantity_won' => 3
        ]);
    }
    
    public function testSaveBidDefaultQuantity()
    {
        $scenario = $this->createTestScenario();
        
        // Save bid without specifying quantity (should default to 1)
        $result = $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            55.00
        );
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseHas('winning_bids', [
            'auction_id' => $scenario['auction_id'],
            'item_id' => $scenario['item_id'],
            'quantity_won' => 1
        ]);
    }
    
    public function testGetCount()
    {
        $this->assertEquals(0, $this->auction->getCount());
        
        $this->createTestAuction(['auction_description' => 'Auction 1']);
        $this->assertEquals(1, $this->auction->getCount());
        
        $this->createTestAuction(['auction_description' => 'Auction 2']);
        $this->assertEquals(2, $this->auction->getCount());
    }
    
    public function testBidEntryWorkflow()
    {
        // Test a complete bid entry workflow
        $scenario = $this->createTestScenario(['item_name' => 'Workflow Item']);
        
        // Initially no bids
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        $this->assertEmpty($items[0]['winning_price']);
        
        // Add a bid
        $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            150.00,
            1
        );
        
        // Verify bid is recorded
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        $this->assertEquals('150.00', $items[0]['winning_price']);
        $this->assertEquals($scenario['bidder_id'], $items[0]['bidder_id']);
        
        // Update the bid (higher price, different quantity)
        $this->auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            175.00,
            2
        );
        
        // Verify update
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        $this->assertEquals('175.00', $items[0]['winning_price']);
        $this->assertEquals(2, $items[0]['quantity_won']);
        
        // Get auction stats
        $stats = $this->auction->getWithStats($scenario['auction_id']);
        $this->assertEquals(1, $stats['item_count']);
        $this->assertEquals(1, $stats['bid_count']);
        
        // Revenue should be 175.00 * 2 = 350.00 (price * quantity)
        $expected_revenue = 175.00 * 2;
        $this->assertEquals($expected_revenue, (float)$stats['total_revenue']);
    }
}