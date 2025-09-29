<?php

namespace AuctionSystem\Tests\API;

use AuctionSystem\Tests\TestCase;
use Bidder;
use Item;

class LookupTest extends TestCase
{
    private $bidder;
    private $item;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->bidder = new Bidder();
        $this->item = new Item();
    }
    
    private function formatBidderResults($results)
    {
        return array_map(function($b) {
            return [
                'id' => $b['bidder_id'],
                'name' => $b['name'],
                'phone' => $b['phone'],
                'email' => $b['email'],
                'display' => $b['name'] . ' (' . $b['bidder_id'] . ')'
            ];
        }, $results);
    }
    
    private function formatItemResults($results)
    {
        return array_map(function($i) {
            return [
                'id' => $i['item_id'],
                'name' => $i['item_name'],
                'description' => $i['item_description'],
                'quantity' => $i['item_quantity'],
                'display' => $i['item_name'] . ' (' . $i['item_id'] . ')'
            ];
        }, $results);
    }
    
    public function testBidderLookupById()
    {
        $bidderId = $this->createTestBidder([
            'first_name' => 'John',
            'last_name' => 'Smith'
        ]);
        
        $results = $this->bidder->search((string)$bidderId);
        $formatted = $this->formatBidderResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(1, $formatted);
        
        $bidder = $formatted[0];
        $this->assertEquals($bidderId, $bidder['id']);
        $this->assertEquals('John Smith', $bidder['name']);
        $this->assertEquals('John Smith (' . $bidderId . ')', $bidder['display']);
    }
    
    public function testBidderLookupByName()
    {
        $this->createTestBidder(['first_name' => 'Jane', 'last_name' => 'Doe']);
        $this->createTestBidder(['first_name' => 'John', 'last_name' => 'Smith']);
        
        $results = $this->bidder->search('John');
        $formatted = $this->formatBidderResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(1, $formatted);
        $this->assertStringContainsString('John Smith', $formatted[0]['name']);
    }
    
    public function testBidderLookupByPhoneNotSupported()
    {
        // Note: The current Bidder::search() method doesn't support phone search
        // This test verifies that phone search returns no results
        $this->createTestBidder([
            'first_name' => 'Test', 
            'last_name' => 'User',
            'phone' => '5551234567'
        ]);
        
        $results = $this->bidder->search('555123');
        $formatted = $this->formatBidderResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertEmpty($formatted); // Phone search not implemented in current Bidder class
    }
    
    public function testItemLookupById()
    {
        $itemId = $this->createTestItem([
            'item_name' => 'Wine Basket',
            'item_description' => 'Premium wine collection'
        ]);
        
        $results = $this->item->search((string)$itemId);
        $formatted = $this->formatItemResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(1, $formatted);
        
        $item = $formatted[0];
        $this->assertEquals($itemId, $item['id']);
        $this->assertEquals('Wine Basket', $item['name']);
        $this->assertEquals('Premium wine collection', $item['description']);
        $this->assertEquals('Wine Basket (' . $itemId . ')', $item['display']);
    }
    
    public function testItemLookupByName()
    {
        $this->createTestItem(['item_name' => 'Wine Basket']);
        $this->createTestItem(['item_name' => 'Book Set']);
        
        $results = $this->item->search('Wine');
        $formatted = $this->formatItemResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(1, $formatted);
        $this->assertStringContainsString('Wine Basket', $formatted[0]['name']);
    }
    
    public function testItemLookupByDescription()
    {
        $this->createTestItem([
            'item_name' => 'Mystery Box', 
            'item_description' => 'Premium wine collection'
        ]);
        
        $results = $this->item->search('Premium');
        $formatted = $this->formatItemResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(1, $formatted);
        $this->assertStringContainsString('Mystery Box', $formatted[0]['name']);
    }
    
    public function testEmptyTermReturnsEmpty()
    {
        $results = $this->bidder->search('');
        $this->assertIsArray($results);
        $this->assertEmpty($results);
        
        $results = $this->item->search('');
        $this->assertIsArray($results);
        $this->assertEmpty($results);
    }
    
    public function testNoResultsBidder()
    {
        $results = $this->bidder->search('nonexistent');
        $formatted = $this->formatBidderResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertEmpty($formatted);
    }
    
    public function testNoResultsItem()
    {
        $results = $this->item->search('nonexistent');
        $formatted = $this->formatItemResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertEmpty($formatted);
    }
    
    public function testMultipleResults()
    {
        $this->createTestBidder(['first_name' => 'John', 'last_name' => 'Smith']);
        $this->createTestBidder(['first_name' => 'John', 'last_name' => 'Doe']);
        $this->createTestBidder(['first_name' => 'Jane', 'last_name' => 'Johnson']);
        
        $results = $this->bidder->search('Joh');
        $formatted = $this->formatBidderResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(3, $formatted); // John Smith, John Doe, and Jane Johnson (all match 'Joh' in some way)
    }
    
    public function testResultFormatBidder()
    {
        $bidderId = $this->createTestBidder([
            'first_name' => 'Test',
            'last_name' => 'User',
            'phone' => '5551234567',
            'email' => 'test@example.com'
        ]);
        
        $results = $this->bidder->search('Test');
        $formatted = $this->formatBidderResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(1, $formatted);
        
        $bidder = $formatted[0];
        $this->assertArrayHasKey('id', $bidder);
        $this->assertArrayHasKey('name', $bidder);
        $this->assertArrayHasKey('phone', $bidder);
        $this->assertArrayHasKey('email', $bidder);
        $this->assertArrayHasKey('display', $bidder);
        
        $this->assertEquals($bidderId, $bidder['id']);
        $this->assertEquals('test@example.com', $bidder['email']);
    }
    
    public function testResultFormatItem()
    {
        $itemId = $this->createTestItem([
            'item_name' => 'Test Item',
            'item_description' => 'Test Description',
            'item_quantity' => 5
        ]);
        
        $results = $this->item->search('Test');
        $formatted = $this->formatItemResults($results);
        
        $this->assertIsArray($formatted);
        $this->assertCount(1, $formatted);
        
        $item = $formatted[0];
        $this->assertArrayHasKey('id', $item);
        $this->assertArrayHasKey('name', $item);
        $this->assertArrayHasKey('description', $item);
        $this->assertArrayHasKey('quantity', $item);
        $this->assertArrayHasKey('display', $item);
        
        $this->assertEquals($itemId, $item['id']);
        $this->assertEquals('Test Item', $item['name']);
        $this->assertEquals('Test Description', $item['description']);
        $this->assertEquals(5, $item['quantity']);
    }
}