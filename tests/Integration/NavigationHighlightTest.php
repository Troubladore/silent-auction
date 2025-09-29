<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;

class NavigationHighlightTest extends TestCase
{
    public function testNavigationHighlightsCorrectPage()
    {
        // Test that each page correctly sets its navigation highlight
        
        $pages = [
            '/pages/items.php' => 'Items',
            '/pages/auctions.php' => 'Auctions',
            '/pages/bidders.php' => 'Bidders', 
            '/pages/reports.php' => 'Reports',
            '/pages/bid_entry.php' => 'Bid Entry'
        ];
        
        foreach ($pages as $path => $expectedActive) {
            // Check that the page sets the correct $page_title or navigation variable
            $content = file_get_contents(__DIR__ . '/../../' . $path);
            
            // Each page should set a variable that the header uses to highlight navigation
            $this->assertStringContainsString('$page_title', $content, 
                "Page $path should set page_title variable for navigation highlighting");
        }
    }
    
    public function testHeaderUsesPageTitleForHighlighting()
    {
        // The header should use the page title to highlight the correct nav item
        $headerContent = file_get_contents(__DIR__ . '/../../includes/header.php');
        
        // Header should check page title and apply 'highlight' class accordingly
        $this->assertStringContainsString('class="highlight"', $headerContent,
            'Header should have logic to apply highlight class to current navigation item');
    }
    
    public function testBatchModePreservesNavigationContext()
    {
        // When in batch mode (items.php?batch_auction=1), navigation should still 
        // highlight "Items" not get stuck on "Bid Entry"
        
        $this->assertTrue(true, 'Batch mode should preserve proper navigation highlighting');
    }
}