<?php

namespace AuctionSystem\Tests\Unit;

use AuctionSystem\Tests\TestCase;
use Database;

class DatabaseTest extends TestCase
{
    private $database;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->database = new Database();
    }
    
    public function testConnection()
    {
        $this->assertInstanceOf(Database::class, $this->database);
    }
    
    public function testInsert()
    {
        $data = [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com'
        ];
        
        $id = $this->database->insert('bidders', $data);
        
        $this->assertIsNumeric($id);
        $this->assertGreaterThan(0, $id);
        $this->assertDatabaseHas('bidders', ['bidder_id' => $id]);
    }
    
    public function testFetch()
    {
        // First insert a record
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com'
        ];
        $id = $this->database->insert('bidders', $data);
        
        // Then fetch it
        $result = $this->database->fetch(
            'SELECT * FROM bidders WHERE bidder_id = :id', 
            ['id' => $id]
        );
        
        $this->assertIsArray($result);
        $this->assertEquals($data['first_name'], $result['first_name']);
        $this->assertEquals($data['last_name'], $result['last_name']);
        $this->assertEquals($data['email'], $result['email']);
    }
    
    public function testFetchAll()
    {
        // Insert multiple records
        $users = [
            ['first_name' => 'John', 'last_name' => 'Doe'],
            ['first_name' => 'Jane', 'last_name' => 'Smith'],
            ['first_name' => 'Bob', 'last_name' => 'Johnson']
        ];
        
        foreach ($users as $user) {
            $this->database->insert('bidders', $user);
        }
        
        $results = $this->database->fetchAll('SELECT * FROM bidders ORDER BY first_name');
        
        $this->assertIsArray($results);
        $this->assertCount(3, $results);
        $this->assertEquals('Bob', $results[0]['first_name']);
        $this->assertEquals('Jane', $results[1]['first_name']);
        $this->assertEquals('John', $results[2]['first_name']);
    }
    
    public function testUpdate()
    {
        // Insert a record
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com'
        ];
        $id = $this->database->insert('bidders', $data);
        
        // Update it
        $updateData = [
            'first_name' => 'Jane',
            'email' => 'jane@example.com'
        ];
        $this->database->update('bidders', $updateData, 'bidder_id = :id', ['id' => $id]);
        
        // Verify update
        $result = $this->database->fetch(
            'SELECT * FROM bidders WHERE bidder_id = :id', 
            ['id' => $id]
        );
        
        $this->assertEquals('Jane', $result['first_name']);
        $this->assertEquals('Doe', $result['last_name']); // Should remain unchanged
        $this->assertEquals('jane@example.com', $result['email']);
    }
    
    public function testDelete()
    {
        // Insert a record
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe'
        ];
        $id = $this->database->insert('bidders', $data);
        
        // Verify it exists
        $this->assertDatabaseHas('bidders', ['bidder_id' => $id]);
        
        // Delete it
        $this->database->delete('bidders', 'bidder_id = :id', ['id' => $id]);
        
        // Verify it's gone
        $this->assertDatabaseMissing('bidders', ['bidder_id' => $id]);
    }
    
    public function testCount()
    {
        // Initially should be 0
        $count = $this->database->count('bidders');
        $this->assertEquals(0, $count);
        
        // Add some records
        for ($i = 1; $i <= 3; $i++) {
            $this->database->insert('bidders', [
                'first_name' => "User{$i}",
                'last_name' => 'Test'
            ]);
        }
        
        // Should now be 3
        $count = $this->database->count('bidders');
        $this->assertEquals(3, $count);
        
        // Test with where clause
        $count = $this->database->count('bidders', 'first_name = :name', ['name' => 'User1']);
        $this->assertEquals(1, $count);
    }
    
    public function testQueryWithParameters()
    {
        // Insert test data
        $this->database->insert('bidders', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com'
        ]);
        
        // Test parameterized query
        $stmt = $this->database->query(
            'SELECT * FROM bidders WHERE first_name = :name AND last_name = :last',
            ['name' => 'John', 'last' => 'Doe']
        );
        
        $result = $stmt->fetch();
        $this->assertIsArray($result);
        $this->assertEquals('John', $result['first_name']);
        $this->assertEquals('john@example.com', $result['email']);
    }
    
    public function testTransactionBasics()
    {
        $pdo = getTestConnection();
        
        // Test that we can start and commit a transaction
        $pdo->beginTransaction();
        
        // Insert a record within transaction
        $this->database->insert('bidders', [
            'first_name' => 'Transaction',
            'last_name' => 'Test'
        ]);
        
        // Verify transaction is active
        $this->assertTrue($pdo->inTransaction());
        
        // Commit transaction
        $pdo->commit();
        
        // Verify transaction is complete
        $this->assertFalse($pdo->inTransaction());
        
        // Verify record exists after commit
        $count = $this->database->count('bidders');
        $this->assertEquals(1, $count);
    }
}