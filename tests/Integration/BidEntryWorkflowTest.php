<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;
use Auction;
use Bidder;
use Item;
use Report;

class BidEntryWorkflowTest extends TestCase
{
    private $auction;
    private $bidder;
    private $item;
    private $report;
    private $db;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->auction = new Auction();
        $this->bidder = new Bidder();
        $this->item = new Item();
        $this->report = new Report();
        $this->db = new \Database();
    }
    
    public function testCompleteAuctionWorkflow()
    {
        // 1. Create an auction
        $auctionResult = $this->auction->create([
            'auction_date' => '2024-06-15',
            'auction_description' => 'Integration Test Auction',
            'status' => 'planning'
        ]);
        
        $this->assertTrue($auctionResult['success']);
        $auctionId = $auctionResult['id'];
        
        // 2. Create bidders
        $bidder1Result = $this->bidder->create([
            'first_name' => 'Alice',
            'last_name' => 'Johnson',
            'phone' => '5551234567',
            'email' => 'alice@example.com',
            'address1' => '123 Main St',
            'city' => 'Anytown',
            'state' => 'NY',
            'postal_code' => '12345'
        ]);
        
        $bidder2Result = $this->bidder->create([
            'first_name' => 'Bob',
            'last_name' => 'Smith',
            'phone' => '5559876543',
            'email' => 'bob@example.com',
            'address1' => '456 Oak Ave',
            'city' => 'Somewhere',
            'state' => 'CA',
            'postal_code' => '54321'
        ]);
        
        $this->assertTrue($bidder1Result['success']);
        $this->assertTrue($bidder2Result['success']);
        $bidder1Id = $bidder1Result['id'];
        $bidder2Id = $bidder2Result['id'];
        
        // 3. Create items
        $item1Result = $this->item->create([
            'item_name' => 'Wine Collection',
            'item_description' => 'Premium wine selection',
            'item_quantity' => 1
        ]);
        
        $item2Result = $this->item->create([
            'item_name' => 'Art Print',
            'item_description' => 'Signed landscape print',
            'item_quantity' => 2
        ]);
        
        $item3Result = $this->item->create([
            'item_name' => 'Gift Basket',
            'item_description' => 'Gourmet food basket',
            'item_quantity' => 1
        ]);
        
        $this->assertTrue($item1Result['success']);
        $this->assertTrue($item2Result['success']);
        $this->assertTrue($item3Result['success']);
        $item1Id = $item1Result['id'];
        $item2Id = $item2Result['id'];
        $item3Id = $item3Result['id'];
        
        // 4. Add items to auction
        $this->assertTrue($this->item->addToAuction($item1Id, $auctionId));
        $this->assertTrue($this->item->addToAuction($item2Id, $auctionId));
        $this->assertTrue($this->item->addToAuction($item3Id, $auctionId));
        
        // 5. Verify auction setup
        $auctionData = $this->auction->getById($auctionId);
        $this->assertEquals('Integration Test Auction', $auctionData['auction_description']);
        
        $auctionItems = $this->item->getForAuction($auctionId);
        $this->assertCount(3, $auctionItems);
        
        // 6. Test bid entry process - get items for bid entry
        $bidEntryItems = $this->auction->getItemsForBidEntry($auctionId);
        $this->assertCount(3, $bidEntryItems);
        
        // All items should have no bids initially
        foreach ($bidEntryItems as $item) {
            $this->assertEmpty($item['winning_price']);
            $this->assertEmpty($item['bidder_id']);
            $this->assertEmpty(trim($item['winner_name']));
        }
        
        // 7. Enter bids
        // Alice wins wine collection
        $bid1 = $this->auction->saveBid($auctionId, $item1Id, $bidder1Id, 150.00, 1);
        $this->assertTrue($bid1['success']);
        
        // Bob wins art print (1 of 2 available)
        $bid2 = $this->auction->saveBid($auctionId, $item2Id, $bidder2Id, 85.50, 1);
        $this->assertTrue($bid2['success']);
        
        // Alice also gets gift basket
        $bid3 = $this->auction->saveBid($auctionId, $item3Id, $bidder1Id, 75.25, 1);
        $this->assertTrue($bid3['success']);
        
        // 8. Verify bids were recorded correctly
        $bidEntryItemsAfter = $this->auction->getItemsForBidEntry($auctionId);
        $this->assertCount(3, $bidEntryItemsAfter);
        
        $itemsByName = [];
        foreach ($bidEntryItemsAfter as $item) {
            $itemsByName[$item['item_name']] = $item;
        }
        
        // Check wine collection
        $this->assertEquals('150.00', $itemsByName['Wine Collection']['winning_price']);
        $this->assertEquals($bidder1Id, $itemsByName['Wine Collection']['bidder_id']);
        $this->assertEquals(1, $itemsByName['Wine Collection']['quantity_won']);
        $this->assertStringContainsString('Alice Johnson', $itemsByName['Wine Collection']['winner_name']);
        
        // Check art print
        $this->assertEquals('85.50', $itemsByName['Art Print']['winning_price']);
        $this->assertEquals($bidder2Id, $itemsByName['Art Print']['bidder_id']);
        $this->assertEquals(1, $itemsByName['Art Print']['quantity_won']);
        $this->assertStringContainsString('Bob Smith', $itemsByName['Art Print']['winner_name']);
        
        // Check gift basket
        $this->assertEquals('75.25', $itemsByName['Gift Basket']['winning_price']);
        $this->assertEquals($bidder1Id, $itemsByName['Gift Basket']['bidder_id']);
        
        // 9. Test auction statistics
        $stats = $this->auction->getWithStats($auctionId);
        $this->assertEquals(3, $stats['item_count']);
        $this->assertEquals(3, $stats['bid_count']);
        $expectedRevenue = 150.00 + 85.50 + 75.25; // 310.75
        $this->assertEquals($expectedRevenue, (float)$stats['total_revenue']);
        
        // 10. Test reporting functionality
        $summary = $this->report->getAuctionSummary($auctionId);
        $this->assertEquals($auctionId, $summary['auction_id']);
        $this->assertEquals('Integration Test Auction', $summary['auction_description']);
        $this->assertEquals(3, $summary['total_items']);
        $this->assertEquals(3, $summary['items_sold']);
        $this->assertEquals(0, $summary['items_unsold']);
        $this->assertEquals(2, $summary['unique_bidders']);
        $this->assertEquals('310.75', $summary['total_revenue']);
        $this->assertEquals('150.00', $summary['highest_price']);
        
        // 11. Test bidder payment reports
        $payments = $this->report->getBidderPayments($auctionId);
        $this->assertCount(2, $payments);
        
        $paymentsByName = [];
        foreach ($payments as $payment) {
            $paymentsByName[$payment['first_name']] = $payment;
        }
        
        // Alice should have 2 items totaling $225.25
        $this->assertEquals(2, $paymentsByName['Alice']['items_won']);
        $this->assertEquals('225.25', $paymentsByName['Alice']['total_payment']);
        
        // Bob should have 1 item totaling $85.50
        $this->assertEquals(1, $paymentsByName['Bob']['items_won']);
        $this->assertEquals('85.50', $paymentsByName['Bob']['total_payment']);
        
        // 12. Test individual bidder details
        $aliceDetails = $this->report->getBidderDetails($auctionId, $bidder1Id);
        $this->assertCount(2, $aliceDetails);
        
        $bobDetails = $this->report->getBidderDetails($auctionId, $bidder2Id);
        $this->assertCount(1, $bobDetails);
        
        // 13. Test item results report
        $itemResults = $this->report->getItemResults($auctionId);
        $this->assertCount(3, $itemResults);
        
        foreach ($itemResults as $result) {
            $this->assertEquals('SOLD', $result['status']);
            $this->assertNotNull($result['winning_price']);
            $this->assertNotNull($result['winner_name']);
        }
        
        // 14. Test unsold items (should be empty)
        $unsoldItems = $this->report->getUnsoldItems($auctionId);
        $this->assertEmpty($unsoldItems);
        
        // 15. Test CSV exports
        $paymentsCSV = $this->report->exportBidderPayments($auctionId);
        $this->assertIsString($paymentsCSV);
        $this->assertStringContainsString('Alice', $paymentsCSV);
        $this->assertStringContainsString('Bob', $paymentsCSV);
        $this->assertStringContainsString('225.25', $paymentsCSV);
        
        $itemsCSV = $this->report->exportItemResults($auctionId);
        $this->assertIsString($itemsCSV);
        $this->assertStringContainsString('Wine Collection', $itemsCSV);
        $this->assertStringContainsString('Art Print', $itemsCSV);
        $this->assertStringContainsString('SOLD', $itemsCSV);
        
        // 16. Test lookup functionality (simulating API)
        $bidderLookup = $this->bidder->search('Alice');
        $this->assertCount(1, $bidderLookup);
        $this->assertEquals('Alice Johnson', $bidderLookup[0]['name']);
        
        $itemLookup = $this->item->search('Wine');
        $this->assertCount(1, $itemLookup);
        $this->assertEquals('Wine Collection', $itemLookup[0]['item_name']);
    }
    
    public function testBidUpdateWorkflow()
    {
        // Create a simple scenario
        $scenario = $this->createTestScenario();
        $bidder2Id = $this->createTestBidder(['first_name' => 'Jane', 'last_name' => 'Doe']);
        
        // Initial bid from first bidder
        $this->auction->saveBid($scenario['auction_id'], $scenario['item_id'], $scenario['bidder_id'], 100.00, 1);
        
        // Verify initial bid
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        $this->assertEquals('100.00', $items[0]['winning_price']);
        $this->assertEquals($scenario['bidder_id'], $items[0]['bidder_id']);
        
        // Higher bid from second bidder (should overwrite)
        $this->auction->saveBid($scenario['auction_id'], $scenario['item_id'], $bidder2Id, 150.00, 1);
        
        // Verify bid was updated
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        $this->assertEquals('150.00', $items[0]['winning_price']);
        $this->assertEquals($bidder2Id, $items[0]['bidder_id']);
        $this->assertStringContainsString('Jane Doe', $items[0]['winner_name']);
        
        // Test reporting shows correct winner
        $summary = $this->report->getAuctionSummary($scenario['auction_id']);
        $this->assertEquals('150.00', $summary['total_revenue']);
        $this->assertEquals(1, $summary['unique_bidders']); // Only Jane Doe won
        
        $payments = $this->report->getBidderPayments($scenario['auction_id']);
        $this->assertCount(1, $payments); // Only Jane Doe has a payment
        $this->assertEquals('Jane', $payments[0]['first_name']);
    }
    
    public function testBidDeletionWorkflow()
    {
        $scenario = $this->createTestScenario();
        
        // Add a bid
        $this->auction->saveBid($scenario['auction_id'], $scenario['item_id'], $scenario['bidder_id'], 125.00, 1);
        
        // Verify bid exists
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        $this->assertEquals('125.00', $items[0]['winning_price']);
        
        $summary = $this->report->getAuctionSummary($scenario['auction_id']);
        $this->assertEquals('125.00', $summary['total_revenue']);
        $this->assertEquals(1, $summary['items_sold']);
        
        // Delete the bid
        $result = $this->auction->deleteBid($scenario['auction_id'], $scenario['item_id']);
        $this->assertTrue($result['success']);
        
        // Verify bid is gone
        $items = $this->auction->getItemsForBidEntry($scenario['auction_id']);
        $this->assertEmpty($items[0]['winning_price']);
        $this->assertEmpty($items[0]['bidder_id']);
        
        $summary = $this->report->getAuctionSummary($scenario['auction_id']);
        $this->assertNull($summary['total_revenue']);
        $this->assertEquals(0, $summary['items_sold']);
        $this->assertEquals(1, $summary['items_unsold']);
        
        // Verify no payments
        $payments = $this->report->getBidderPayments($scenario['auction_id']);
        $this->assertEmpty($payments);
        
        // Verify item shows as unsold
        $unsoldItems = $this->report->getUnsoldItems($scenario['auction_id']);
        $this->assertCount(1, $unsoldItems);
    }
    
    public function testQuantityBidWorkflow()
    {
        $auctionId = $this->createTestAuction();
        $bidderId = $this->createTestBidder();
        $itemId = $this->createTestItem([
            'item_name' => 'Event Tickets',
            'item_description' => 'Concert tickets',
            'item_quantity' => 10
        ]);
        
        // Add item to auction
        $this->item->addToAuction($itemId, $auctionId);
        
        // Bid for 3 out of 10 tickets at $25 each
        $result = $this->auction->saveBid($auctionId, $itemId, $bidderId, 25.00, 3);
        $this->assertTrue($result['success']);
        
        // Verify quantity bid
        $items = $this->auction->getItemsForBidEntry($auctionId);
        $this->assertEquals('25.00', $items[0]['winning_price']);
        $this->assertEquals(3, $items[0]['quantity_won']);
        
        // Test reporting with quantity
        $summary = $this->report->getAuctionSummary($auctionId);
        $this->assertEquals('75.00', $summary['total_revenue']); // 25.00 * 3
        
        $bidderDetails = $this->report->getBidderDetails($auctionId, $bidderId);
        $this->assertCount(1, $bidderDetails);
        $this->assertEquals('25.00', $bidderDetails[0]['winning_price']);
        $this->assertEquals(3, $bidderDetails[0]['quantity_won']);
        $this->assertEquals('75.00', $bidderDetails[0]['line_total']);
        
        // Update quantity to 5 tickets at $30 each
        $result = $this->auction->saveBid($auctionId, $itemId, $bidderId, 30.00, 5);
        $this->assertTrue($result['success']);
        
        // Verify update
        $summary = $this->report->getAuctionSummary($auctionId);
        $this->assertEquals('150.00', $summary['total_revenue']); // 30.00 * 5
        
        $bidderDetails = $this->report->getBidderDetails($auctionId, $bidderId);
        $this->assertEquals('150.00', $bidderDetails[0]['line_total']);
    }
    
    public function testErrorConditions()
    {
        $scenario = $this->createTestScenario();
        
        // Test invalid bidder ID (should fail with foreign key constraint)
        $result = $this->auction->saveBid($scenario['auction_id'], $scenario['item_id'], 999, 100.00, 1);
        $this->assertFalse($result['success']);
        
        // Test invalid item ID (should fail with foreign key constraint)
        $result = $this->auction->saveBid($scenario['auction_id'], 999, $scenario['bidder_id'], 100.00, 1);
        $this->assertFalse($result['success']);
        
        // Test deleting non-existent bid (should succeed)
        $result = $this->auction->deleteBid($scenario['auction_id'], $scenario['item_id']);
        $this->assertTrue($result['success']);
        
        // Test trying to delete item that's in auction (should fail)
        $this->auction->saveBid($scenario['auction_id'], $scenario['item_id'], $scenario['bidder_id'], 100.00, 1);
        $result = $this->item->delete($scenario['item_id']);
        $this->assertFalse($result['success']); // Should fail because item is in auction
        
        // Test trying to delete bidder with bids (should fail)
        $result = $this->bidder->delete($scenario['bidder_id']);
        $this->assertFalse($result['success']); // Should fail because bidder has bids
    }
}