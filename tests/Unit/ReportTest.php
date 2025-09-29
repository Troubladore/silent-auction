<?php

namespace AuctionSystem\Tests\Unit;

use AuctionSystem\Tests\TestCase;
use Report;

class ReportTest extends TestCase
{
    private $report;
    private $auction;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->report = new Report();
        $this->auction = new \Auction();
    }
    
    private function createAuctionWithBids()
    {
        // Create a complete auction scenario with multiple bidders and items
        $auctionId = $this->createTestAuction([
            'auction_description' => 'Test Charity Auction',
            'auction_date' => '2024-06-01'
        ]);
        
        $bidder1 = $this->createTestBidder([
            'first_name' => 'John', 
            'last_name' => 'Smith',
            'phone' => '5551234567',
            'email' => 'john@example.com'
        ]);
        
        $bidder2 = $this->createTestBidder([
            'first_name' => 'Jane', 
            'last_name' => 'Doe',
            'phone' => '5559876543',
            'email' => 'jane@example.com'
        ]);
        
        $item1 = $this->createTestItem([
            'item_name' => 'Wine Basket',
            'item_description' => 'Premium wine collection',
            'item_quantity' => 1
        ]);
        
        $item2 = $this->createTestItem([
            'item_name' => 'Art Print',
            'item_description' => 'Local artist landscape',
            'item_quantity' => 1
        ]);
        
        $item3 = $this->createTestItem([
            'item_name' => 'Gift Card',
            'item_description' => 'Restaurant gift card',
            'item_quantity' => 1
        ]);
        
        // Associate items with auction
        $item = new \Item();
        $item->addToAuction($item1, $auctionId);
        $item->addToAuction($item2, $auctionId);
        $item->addToAuction($item3, $auctionId);
        
        // Add winning bids
        $this->auction->saveBid($auctionId, $item1, $bidder1, 125.00, 1);
        $this->auction->saveBid($auctionId, $item2, $bidder2, 75.50, 1);
        // Leave item3 unsold
        
        return [
            'auction_id' => $auctionId,
            'bidder1' => $bidder1,
            'bidder2' => $bidder2,
            'item1' => $item1,
            'item2' => $item2,
            'item3' => $item3
        ];
    }
    
    public function testGetAuctionSummary()
    {
        $scenario = $this->createAuctionWithBids();
        
        $summary = $this->report->getAuctionSummary($scenario['auction_id']);
        
        $this->assertIsArray($summary);
        $this->assertEquals($scenario['auction_id'], $summary['auction_id']);
        $this->assertEquals('Test Charity Auction', $summary['auction_description']);
        $this->assertEquals('2024-06-01', $summary['auction_date']);
        $this->assertEquals(3, $summary['total_items']);
        $this->assertEquals(2, $summary['items_sold']);
        $this->assertEquals(1, $summary['items_unsold']);
        $this->assertEquals(2, $summary['unique_bidders']);
        $this->assertEquals('200.50', $summary['total_revenue']); // 125.00 + 75.50
        $this->assertEquals('100.25', $summary['average_price']); // 200.50 / 2
        $this->assertEquals('125.00', $summary['highest_price']);
    }
    
    public function testGetAuctionSummaryNoItems()
    {
        $auctionId = $this->createTestAuction();
        
        $summary = $this->report->getAuctionSummary($auctionId);
        
        $this->assertIsArray($summary);
        $this->assertEquals(0, $summary['total_items']);
        $this->assertEquals(0, $summary['items_sold']);
        $this->assertEquals(0, $summary['items_unsold']);
        $this->assertEquals(0, $summary['unique_bidders']);
        $this->assertNull($summary['total_revenue']);
        $this->assertNull($summary['average_price']);
        $this->assertNull($summary['highest_price']);
    }
    
    public function testGetBidderPayments()
    {
        $scenario = $this->createAuctionWithBids();
        
        $payments = $this->report->getBidderPayments($scenario['auction_id']);
        
        $this->assertCount(2, $payments); // Only bidders with winning bids
        
        // Check first bidder (should be ordered by last name)
        $bidder1Payment = $payments[0]['last_name'] === 'Doe' ? $payments[0] : $payments[1];
        $this->assertEquals('Jane', $bidder1Payment['first_name']);
        $this->assertEquals('Doe', $bidder1Payment['last_name']);
        $this->assertEquals('5559876543', $bidder1Payment['phone']);
        $this->assertEquals('jane@example.com', $bidder1Payment['email']);
        $this->assertEquals(1, $bidder1Payment['items_won']);
        $this->assertEquals('75.50', $bidder1Payment['total_payment']);
        
        // Check second bidder
        $bidder2Payment = $payments[0]['last_name'] === 'Smith' ? $payments[0] : $payments[1];
        $this->assertEquals('John', $bidder2Payment['first_name']);
        $this->assertEquals('Smith', $bidder2Payment['last_name']);
        $this->assertEquals(1, $bidder2Payment['items_won']);
        $this->assertEquals('125.00', $bidder2Payment['total_payment']);
    }
    
    public function testGetBidderPaymentsEmpty()
    {
        $auctionId = $this->createTestAuction();
        
        $payments = $this->report->getBidderPayments($auctionId);
        
        $this->assertIsArray($payments);
        $this->assertEmpty($payments);
    }
    
    public function testGetBidderDetails()
    {
        $scenario = $this->createAuctionWithBids();
        
        $details = $this->report->getBidderDetails($scenario['auction_id'], $scenario['bidder1']);
        
        $this->assertCount(1, $details); // John Smith won 1 item
        
        $detail = $details[0];
        $this->assertEquals('John', $detail['first_name']);
        $this->assertEquals('Smith', $detail['last_name']);
        $this->assertEquals('Wine Basket', $detail['item_name']);
        $this->assertEquals('Premium wine collection', $detail['item_description']);
        $this->assertEquals('125.00', $detail['winning_price']);
        $this->assertEquals(1, $detail['quantity_won']);
        $this->assertEquals('125.00', $detail['line_total']);
    }
    
    public function testGetBidderDetailsMultipleItems()
    {
        $scenario = $this->createAuctionWithBids();
        
        // Add another winning bid for bidder1
        $this->auction->saveBid($scenario['auction_id'], $scenario['item3'], $scenario['bidder1'], 50.00, 1);
        
        $details = $this->report->getBidderDetails($scenario['auction_id'], $scenario['bidder1']);
        
        $this->assertCount(2, $details); // John Smith now won 2 items
        
        // Check items are ordered by name
        $this->assertEquals('Gift Card', $details[0]['item_name']);
        $this->assertEquals('Wine Basket', $details[1]['item_name']);
        
        // Check line totals
        $this->assertEquals('50.00', $details[0]['line_total']);
        $this->assertEquals('125.00', $details[1]['line_total']);
    }
    
    public function testGetBidderDetailsNotFound()
    {
        $scenario = $this->createAuctionWithBids();
        
        $details = $this->report->getBidderDetails($scenario['auction_id'], 999);
        
        $this->assertIsArray($details);
        $this->assertEmpty($details);
    }
    
    public function testGetItemResults()
    {
        $scenario = $this->createAuctionWithBids();
        
        $items = $this->report->getItemResults($scenario['auction_id']);
        
        $this->assertCount(3, $items); // All items in auction
        
        // Find each item (order might vary)
        $wineBasket = $artPrint = $giftCard = null;
        foreach ($items as $item) {
            if ($item['item_name'] === 'Wine Basket') $wineBasket = $item;
            if ($item['item_name'] === 'Art Print') $artPrint = $item;
            if ($item['item_name'] === 'Gift Card') $giftCard = $item;
        }
        
        // Check sold items
        $this->assertNotNull($wineBasket);
        $this->assertEquals('125.00', $wineBasket['winning_price']);
        $this->assertEquals('John Smith', $wineBasket['winner_name']);
        $this->assertEquals('SOLD', $wineBasket['status']);
        
        $this->assertNotNull($artPrint);
        $this->assertEquals('75.50', $artPrint['winning_price']);
        $this->assertEquals('Jane Doe', $artPrint['winner_name']);
        $this->assertEquals('SOLD', $artPrint['status']);
        
        // Check unsold item
        $this->assertNotNull($giftCard);
        $this->assertNull($giftCard['winning_price']);
        $this->assertNull($giftCard['winner_name']);
        $this->assertEquals('UNSOLD', $giftCard['status']);
    }
    
    public function testGetItemResultsEmpty()
    {
        $auctionId = $this->createTestAuction();
        
        $items = $this->report->getItemResults($auctionId);
        
        $this->assertIsArray($items);
        $this->assertEmpty($items);
    }
    
    public function testGetUnsoldItems()
    {
        $scenario = $this->createAuctionWithBids();
        
        $unsoldItems = $this->report->getUnsoldItems($scenario['auction_id']);
        
        $this->assertCount(1, $unsoldItems);
        $this->assertEquals('Gift Card', $unsoldItems[0]['item_name']);
        $this->assertEquals('Restaurant gift card', $unsoldItems[0]['item_description']);
        $this->assertEquals(1, $unsoldItems[0]['item_quantity']);
    }
    
    public function testGetUnsoldItemsAllSold()
    {
        $scenario = $this->createAuctionWithBids();
        
        // Sell the remaining item
        $this->auction->saveBid($scenario['auction_id'], $scenario['item3'], $scenario['bidder1'], 45.00, 1);
        
        $unsoldItems = $this->report->getUnsoldItems($scenario['auction_id']);
        
        $this->assertIsArray($unsoldItems);
        $this->assertEmpty($unsoldItems);
    }
    
    public function testGenerateCSV()
    {
        $data = [
            ['John', 'Smith', '125.00'],
            ['Jane', 'Doe', '75.50']
        ];
        $headers = ['First Name', 'Last Name', 'Total'];
        
        $csv = $this->report->generateCSV($data, $headers);
        
        $this->assertIsString($csv);
        $this->assertStringContainsString('First Name,Last Name,Total', $csv);
        $this->assertStringContainsString('John,Smith,125.00', $csv);
        $this->assertStringContainsString('Jane,Doe,75.50', $csv);
    }
    
    public function testGenerateCSVWithQuotes()
    {
        $data = [
            ['Test Item, Premium', 'Description with "quotes"', '100.00']
        ];
        $headers = ['Name', 'Description', 'Price'];
        
        $csv = $this->report->generateCSV($data, $headers);
        
        $this->assertStringContainsString('Name,Description,Price', $csv);
        // CSV should properly escape commas and quotes
        $this->assertStringContainsString('"Test Item, Premium"', $csv);
        $this->assertStringContainsString('"Description with ""quotes"""', $csv);
    }
    
    public function testExportBidderPayments()
    {
        $scenario = $this->createAuctionWithBids();
        
        $csv = $this->report->exportBidderPayments($scenario['auction_id']);
        
        $this->assertIsString($csv);
        $this->assertStringContainsString('Bidder ID,First Name,Last Name', $csv);
        $this->assertStringContainsString('John,Smith', $csv);
        $this->assertStringContainsString('Jane,Doe', $csv);
        $this->assertStringContainsString('125', $csv);
        $this->assertStringContainsString('75.5', $csv);
    }
    
    public function testExportItemResults()
    {
        $scenario = $this->createAuctionWithBids();
        
        $csv = $this->report->exportItemResults($scenario['auction_id']);
        
        $this->assertIsString($csv);
        $this->assertStringContainsString('Item ID,Item Name,Description', $csv);
        $this->assertStringContainsString('Wine Basket', $csv);
        $this->assertStringContainsString('Art Print', $csv);
        $this->assertStringContainsString('Gift Card', $csv);
        $this->assertStringContainsString('SOLD', $csv);
        $this->assertStringContainsString('UNSOLD', $csv);
    }
    
    public function testGetTopPerformers()
    {
        $scenario = $this->createAuctionWithBids();
        
        // Add more bids to create a ranking
        $bidder3 = $this->createTestBidder(['first_name' => 'Bob', 'last_name' => 'Johnson']);
        $item4 = $this->createTestItem(['item_name' => 'Expensive Item']);
        $item5 = $this->createTestItem(['item_name' => 'Cheap Item']);
        
        $item = new \Item();
        $item->addToAuction($item4, $scenario['auction_id']);
        $item->addToAuction($item5, $scenario['auction_id']);
        
        $this->auction->saveBid($scenario['auction_id'], $scenario['item3'], $bidder3, 200.00, 1);
        $this->auction->saveBid($scenario['auction_id'], $item4, $bidder3, 500.00, 1);
        $this->auction->saveBid($scenario['auction_id'], $item5, $scenario['bidder1'], 25.00, 1);
        
        $topPerformers = $this->report->getTopPerformers($scenario['auction_id'], 3);
        
        $this->assertCount(3, $topPerformers);
        
        // Should be ordered by price DESC
        $this->assertEquals('Expensive Item', $topPerformers[0]['item_name']);
        $this->assertEquals('500.00', $topPerformers[0]['winning_price']);
        $this->assertEquals('Bob Johnson', $topPerformers[0]['winner_name']);
        
        $this->assertEquals('Gift Card', $topPerformers[1]['item_name']);
        $this->assertEquals('200.00', $topPerformers[1]['winning_price']);
        
        $this->assertEquals('Wine Basket', $topPerformers[2]['item_name']);
        $this->assertEquals('125.00', $topPerformers[2]['winning_price']);
    }
    
    public function testGetTopPerformersEmpty()
    {
        $auctionId = $this->createTestAuction();
        
        $topPerformers = $this->report->getTopPerformers($auctionId, 5);
        
        $this->assertIsArray($topPerformers);
        $this->assertEmpty($topPerformers);
    }
    
    public function testMultipleBiddersPerItem()
    {
        // Test edge case: ensure only final winner is reported
        $scenario = $this->createAuctionWithBids();
        
        // Update the winning bid to a different bidder
        $this->auction->saveBid($scenario['auction_id'], $scenario['item1'], $scenario['bidder2'], 150.00, 1);
        
        $details = $this->report->getBidderDetails($scenario['auction_id'], $scenario['bidder2']);
        
        // Jane Doe should now have 2 items (original Art Print + Wine Basket)
        $this->assertCount(2, $details);
        
        $itemNames = array_column($details, 'item_name');
        $this->assertContains('Wine Basket', $itemNames);
        $this->assertContains('Art Print', $itemNames);
        
        // Check that John Smith no longer has the Wine Basket
        $johnDetails = $this->report->getBidderDetails($scenario['auction_id'], $scenario['bidder1']);
        $this->assertEmpty($johnDetails);
    }
    
    public function testQuantityCalculations()
    {
        $scenario = $this->createAuctionWithBids();
        
        // Create an item with multiple quantities
        $multiItem = $this->createTestItem([
            'item_name' => 'Multiple Tickets',
            'item_description' => 'Event tickets',
            'item_quantity' => 5
        ]);
        
        $item = new \Item();
        $item->addToAuction($multiItem, $scenario['auction_id']);
        
        // Bid for 3 out of 5 tickets
        $this->auction->saveBid($scenario['auction_id'], $multiItem, $scenario['bidder1'], 30.00, 3);
        
        $details = $this->report->getBidderDetails($scenario['auction_id'], $scenario['bidder1']);
        
        // Find the multiple tickets item
        $ticketItem = null;
        foreach ($details as $detail) {
            if ($detail['item_name'] === 'Multiple Tickets') {
                $ticketItem = $detail;
                break;
            }
        }
        
        $this->assertNotNull($ticketItem);
        $this->assertEquals('30.00', $ticketItem['winning_price']);
        $this->assertEquals(3, $ticketItem['quantity_won']);
        $this->assertEquals('90.00', $ticketItem['line_total']); // 30.00 * 3
    }
}