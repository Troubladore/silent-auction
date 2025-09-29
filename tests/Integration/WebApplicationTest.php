<?php

namespace AuctionSystem\Tests\Integration;

use AuctionSystem\Tests\TestCase;

class WebApplicationTest extends TestCase
{
    private $baseUrl = 'http://localhost:8080';
    
    public function testAllRequiredPagesExistAndLoad()
    {
        $pages = [
            '/pages/index.php',
            '/pages/login.php', 
            '/pages/bid_entry.php',
            '/pages/bidders.php',
            '/pages/items.php',
            '/pages/auctions.php',
            '/pages/reports.php'
        ];
        
        foreach ($pages as $page) {
            $url = $this->baseUrl . $page;
            $headers = get_headers($url);
            
            $this->assertNotFalse($headers, "Failed to get headers for $page - page may not exist");
            
            // Check that we get a valid HTTP response (not 404)
            $statusLine = $headers[0];
            $this->assertStringNotContainsString('404', $statusLine, 
                "Page $page returns 404 Not Found - file missing or path incorrect");
            
            // Should get either 200 (OK) or 302 (redirect to login)
            $validStatuses = ['200', '302'];
            $hasValidStatus = false;
            foreach ($validStatuses as $status) {
                if (strpos($statusLine, $status) !== false) {
                    $hasValidStatus = true;
                    break;
                }
            }
            
            $this->assertTrue($hasValidStatus, 
                "Page $page returned unexpected status: $statusLine");
        }
    }
    
    public function testLoginPageExists()
    {
        $loginUrl = $this->baseUrl . '/pages/login.php';
        $response = file_get_contents($loginUrl);
        
        $this->assertNotFalse($response, 'Login page should be accessible');
        $this->assertStringContainsString('<form', $response, 'Login page should contain a login form');
    }
    
    public function testDatabaseConnectionFromWeb()
    {
        // Test a simple page that would use database
        $biddersUrl = $this->baseUrl . '/pages/bidders.php';
        $headers = get_headers($biddersUrl);
        
        // Should redirect to login, not crash with database error
        $this->assertStringContainsString('302', $headers[0], 
            'Bidders page should redirect to login, not crash with database error');
    }
    
    public function testConfigFilesExist()
    {
        $configFiles = [
            '/config/database.php',
            '/config/config.php'
        ];
        
        foreach ($configFiles as $file) {
            $fullPath = getcwd() . $file;
            $this->assertFileExists($fullPath, "Required config file missing: $file");
        }
    }
    
    public function testIncludesDirectoryExists()
    {
        $includesDir = getcwd() . '/includes';
        $this->assertDirectoryExists($includesDir, 'Includes directory should exist');
        
        $functionsFile = $includesDir . '/functions.php';
        $this->assertFileExists($functionsFile, 'functions.php should exist in includes/');
    }
    
    public function testAllPageFilesExistInPagesDirectory()
    {
        $requiredPages = [
            'index.php',
            'login.php',
            'bid_entry.php', 
            'bidders.php',
            'items.php',
            'auctions.php',
            'reports.php'
        ];
        
        $pagesDir = getcwd() . '/pages';
        $this->assertDirectoryExists($pagesDir, 'Pages directory should exist');
        
        foreach ($requiredPages as $page) {
            $fullPath = $pagesDir . '/' . $page;
            $this->assertFileExists($fullPath, "Required page file missing: pages/$page");
        }
    }
}