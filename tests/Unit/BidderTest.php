<?php

namespace AuctionSystem\Tests\Unit;

use AuctionSystem\Tests\TestCase;
use Bidder;

class BidderTest extends TestCase
{
    private $bidder;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->bidder = new Bidder();
    }
    
    public function testCreateBidder()
    {
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '5551234567',
            'email' => 'john@example.com',
            'address1' => '123 Main St',
            'city' => 'Anytown',
            'state' => 'NY',
            'postal_code' => '12345'
        ];
        
        $result = $this->bidder->create($data);
        
        $this->assertTrue($result['success']);
        $this->assertIsNumeric($result['id']);
        $this->assertGreaterThan(0, $result['id']);
        $this->assertDatabaseCount('bidders', 1);
    }
    
    public function testCreateBidderRequiredFields()
    {
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe'
        ];
        
        $result = $this->bidder->create($data);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('bidders', 1);
    }
    
    public function testCreateBidderMissingRequired()
    {
        $data = [
            'first_name' => 'John'
            // Missing last_name
        ];
        
        $result = $this->bidder->create($data);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Last name is required', $result['errors']);
        $this->assertDatabaseCount('bidders', 0);
    }
    
    public function testCreateBidderPhoneNumberCleaning()
    {
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '(555) 123-4567' // Formatted phone
        ];
        
        $result = $this->bidder->create($data);
        
        $this->assertTrue($result['success']);
        
        // Verify phone was cleaned (numbers only)
        $bidder = $this->bidder->getById($result['id']);
        $this->assertEquals('5551234567', $bidder['phone']);
    }
    
    public function testGetById()
    {
        $bidderId = $this->createTestBidder([
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'email' => 'jane@example.com'
        ]);
        
        $bidder = $this->bidder->getById($bidderId);
        
        $this->assertIsArray($bidder);
        $this->assertEquals('Jane', $bidder['first_name']);
        $this->assertEquals('Smith', $bidder['last_name']);
        $this->assertEquals('jane@example.com', $bidder['email']);
    }
    
    public function testGetByIdNotFound()
    {
        $bidder = $this->bidder->getById(999);
        $this->assertFalse($bidder); // PDO fetch returns false when no record found
    }
    
    public function testGetAll()
    {
        // Create multiple bidders
        $this->createTestBidder(['first_name' => 'Alice', 'last_name' => 'Johnson']);
        $this->createTestBidder(['first_name' => 'Bob', 'last_name' => 'Smith']);
        $this->createTestBidder(['first_name' => 'Charlie', 'last_name' => 'Brown']);
        
        $bidders = $this->bidder->getAll();
        
        $this->assertCount(3, $bidders);
        // Should be ordered by last name, first name
        $this->assertEquals('Brown', $bidders[0]['last_name']);
        $this->assertEquals('Johnson', $bidders[1]['last_name']);
        $this->assertEquals('Smith', $bidders[2]['last_name']);
    }
    
    public function testGetAllWithSearch()
    {
        $this->createTestBidder(['first_name' => 'John', 'last_name' => 'Smith']);
        $this->createTestBidder(['first_name' => 'Jane', 'last_name' => 'Doe']);
        $this->createTestBidder(['first_name' => 'John', 'last_name' => 'Johnson']);
        
        // Search by first name
        $bidders = $this->bidder->getAll('John');
        $this->assertCount(2, $bidders);
        
        // Search by last name
        $bidders = $this->bidder->getAll('Smith');
        $this->assertCount(1, $bidders);
        $this->assertEquals('John', $bidders[0]['first_name']);
        
        // Search by full name
        $bidders = $this->bidder->getAll('Jane Doe');
        $this->assertCount(1, $bidders);
        $this->assertEquals('Jane', $bidders[0]['first_name']);
    }
    
    public function testGetAllWithPagination()
    {
        // Create 10 bidders
        for ($i = 1; $i <= 10; $i++) {
            $this->createTestBidder([
                'first_name' => "User{$i}",
                'last_name' => 'Test'
            ]);
        }
        
        // Get first page (limit 5)
        $bidders = $this->bidder->getAll('', 5, 0);
        $this->assertCount(5, $bidders);
        
        // Get second page
        $bidders = $this->bidder->getAll('', 5, 5);
        $this->assertCount(5, $bidders);
        
        // Get beyond available records
        $bidders = $this->bidder->getAll('', 5, 10);
        $this->assertCount(0, $bidders);
    }
    
    public function testSearch()
    {
        $bidderId = $this->createTestBidder([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '5551234567',
            'email' => 'john@example.com'
        ]);
        
        // Search by name
        $results = $this->bidder->search('John');
        $this->assertCount(1, $results);
        $this->assertEquals('John Doe', $results[0]['name']);
        
        // Search by ID
        $results = $this->bidder->search((string)$bidderId);
        $this->assertCount(1, $results);
        $this->assertEquals($bidderId, $results[0]['bidder_id']);
        
        // Search partial name
        $results = $this->bidder->search('Doe');
        $this->assertCount(1, $results);
        $this->assertEquals('John Doe', $results[0]['name']);
    }
    
    public function testUpdate()
    {
        $bidderId = $this->createTestBidder([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com'
        ]);
        
        $updateData = [
            'first_name' => 'Jane',
            'last_name' => 'Doe', // Must include required field
            'email' => 'jane@example.com',
            'phone' => '(555) 987-6543'
        ];
        
        $result = $this->bidder->update($bidderId, $updateData);
        
        if (!$result['success']) {
            $this->fail('Update failed: ' . implode(', ', $result['errors'] ?? ['Unknown error']));
        }
        
        $this->assertTrue($result['success']);
        
        // Verify changes
        $bidder = $this->bidder->getById($bidderId);
        $this->assertEquals('Jane', $bidder['first_name']);
        $this->assertEquals('Doe', $bidder['last_name']); // Unchanged
        $this->assertEquals('jane@example.com', $bidder['email']);
        $this->assertEquals('5559876543', $bidder['phone']); // Cleaned
    }
    
    public function testUpdateMissingRequired()
    {
        $bidderId = $this->createTestBidder();
        
        $updateData = [
            'first_name' => '', // Empty required field
            'last_name' => 'Updated'
        ];
        
        $result = $this->bidder->update($bidderId, $updateData);
        
        $this->assertFalse($result['success']);
        $this->assertContains('First name is required', $result['errors']);
    }
    
    public function testDelete()
    {
        $bidderId = $this->createTestBidder();
        
        $result = $this->bidder->delete($bidderId);
        
        $this->assertTrue($result['success']);
        $this->assertDatabaseCount('bidders', 0);
        $this->assertFalse($this->bidder->getById($bidderId)); // PDO returns false for not found
    }
    
    public function testDeleteWithBids()
    {
        // Create complete test scenario
        $scenario = $this->createTestScenario();
        
        // Add a winning bid
        $auction = new \Auction();
        $auction->saveBid(
            $scenario['auction_id'],
            $scenario['item_id'],
            $scenario['bidder_id'],
            50.00,
            1
        );
        
        // Try to delete bidder with bids
        $result = $this->bidder->delete($scenario['bidder_id']);
        
        $this->assertFalse($result['success']);
        $this->assertContains('Cannot delete bidder with existing bids', $result['errors']);
        $this->assertDatabaseCount('bidders', 1); // Should still exist
    }
    
    public function testGetCount()
    {
        $this->assertEquals(0, $this->bidder->getCount());
        
        $this->createTestBidder(['first_name' => 'John', 'last_name' => 'Doe']);
        $this->assertEquals(1, $this->bidder->getCount());
        
        $this->createTestBidder(['first_name' => 'Jane', 'last_name' => 'Smith']);
        $this->assertEquals(2, $this->bidder->getCount());
        
        // Test with search
        $this->assertEquals(1, $this->bidder->getCount('John'));
        $this->assertEquals(0, $this->bidder->getCount('NonExistent'));
    }
}