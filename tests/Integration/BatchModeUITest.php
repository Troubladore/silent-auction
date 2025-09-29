<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;
use Auction;
use Item;

class BatchModeUITest extends TestCase
{
    private $baseUrl = 'http://localhost:8080/pages';
    
    public function testBatchModeNotificationStaysPersistent()
    {
        // Test that batch mode notification doesn't disappear after a few seconds
        $itemsUrl = $this->baseUrl . '/items.php?batch_auction=1';
        
        // Make multiple requests to simulate time passing
        for ($i = 0; $i < 3; $i++) {
            $response = file_get_contents($itemsUrl);
            $this->assertNotFalse($response, 'Items page should be accessible');
            
            // Check that batch mode indicator is present
            $this->assertStringContainsString('Batch Mode Active:', $response,
                'Batch mode notification should be visible and persistent');
            $this->assertStringContainsString('alert-info', $response,
                'Batch mode notification should have proper styling');
            
            // Simulate time delay
            usleep(500000); // 0.5 second delay
        }
    }
    
    public function testBatchModeCanBeAccessedFromItemsPage()
    {
        $itemsUrl = $this->baseUrl . '/items.php';
        $response = file_get_contents($itemsUrl);
        
        $this->assertNotFalse($response, 'Items page should be accessible');
        
        // Check for batch mode dropdown
        $this->assertStringContainsString('batch_auction_select', $response,
            'Items page should have batch mode selection dropdown');
        $this->assertStringContainsString('enableBatchMode()', $response,
            'Items page should have batch mode JavaScript function');
        $this->assertStringContainsString('Batch Mode:', $response,
            'Items page should have batch mode label');
    }
    
    public function testBatchModeFormSubmissionDoesNotCauseDatabaseError()
    {
        // This test simulates the form submission that was causing "Database error occurred"
        $formData = [
            'item_name' => 'Test Batch Item',
            'item_description' => 'Testing batch mode submission',
            'item_quantity' => '1',
            'batch_auction' => '1' // Simulating batch mode with auction ID 1
        ];
        
        $postData = http_build_query($formData);
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/x-www-form-urlencoded',
                'content' => $postData
            ]
        ]);
        
        $addItemUrl = $this->baseUrl . '/items.php?action=add';
        $response = file_get_contents($addItemUrl, false, $context);
        
        // Should get a redirect or success, not a database error
        $this->assertNotFalse($response, 'Form submission should not fail completely');
        
        // Check that we don't get a database error message
        $this->assertStringNotContainsString('Database error occurred', $response,
            'Should not get database error when submitting batch mode form');
        $this->assertStringNotContainsString('SQLSTATE', $response,
            'Should not get SQL error when submitting batch mode form');
    }
    
    public function testAuctionPageShouldHaveBatchModeEntry()
    {
        // Test requirement: "Additionally, you should be able to enter batch item 
        // entry mode directly from the auction record itself"
        $auctionsUrl = $this->baseUrl . '/auctions.php';
        $response = file_get_contents($auctionsUrl);
        
        $this->assertNotFalse($response, 'Auctions page should be accessible');
        
        // Should have some way to enter batch mode from auction records
        // This will likely fail initially - that's the point, to expose the missing feature
        $hasBatchModeLink = (
            strpos($response, 'batch') !== false || 
            strpos($response, 'Add Items') !== false ||
            strpos($response, 'item entry') !== false
        );
        
        $this->assertTrue($hasBatchModeLink,
            'Auctions page should have a way to enter batch item entry mode directly from auction records. '.
            'Current page does not contain batch mode entry options.');
    }
    
    public function testBatchModeJavaScriptFunctionExists()
    {
        $itemsUrl = $this->baseUrl . '/items.php';
        $response = file_get_contents($itemsUrl);
        
        $this->assertNotFalse($response, 'Items page should be accessible');
        
        // Check that the enableBatchMode function is defined
        $this->assertStringContainsString('function enableBatchMode()', $response,
            'Items page should define enableBatchMode JavaScript function');
        
        // Check that it handles both selection and deselection
        $this->assertStringContainsString("window.location.href = 'items.php?batch_auction=", $response,
            'enableBatchMode should redirect to batch mode URL when auction selected');
        $this->assertStringContainsString("window.location.href = 'items.php'", $response,
            'enableBatchMode should redirect to normal mode when no auction selected');
    }
    
    public function testBatchModePreservesStateInUrls()
    {
        // Test that batch mode state is preserved in pagination and other URLs
        $batchUrl = $this->baseUrl . '/items.php?batch_auction=1';
        $response = file_get_contents($batchUrl);
        
        $this->assertNotFalse($response, 'Batch mode items page should be accessible');
        
        // Check that pagination links preserve batch mode
        if (strpos($response, 'pagination') !== false) {
            $this->assertStringContainsString('batch_auction=1', $response,
                'Pagination links should preserve batch mode state');
        }
        
        // Check that "Add Item" link includes batch mode
        $this->assertStringContainsString('batch_auction=1', $response,
            'Add item link should preserve batch mode state');
    }
}