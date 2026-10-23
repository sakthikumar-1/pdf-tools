<?php
/**
 * Database Configuration (Stub / Future Phase Placeholder)
 *
 * NOTE: Simatrix Academy PDF Tools currently operates as a fully stateless
 * document utility suite. Database connectivity is disabled by design.
 * No database connection is initialized in Phase 1.
 */

class Database {
    // Credentials must be provided via environment variables in future database phases
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn = null;

    public function __construct() {
        $this->host = getenv('DB_HOST') ?: '127.0.0.1';
        $this->db_name = getenv('DB_NAME') ?: 'simatrix_pdf_tools';
        $this->username = getenv('DB_USER') ?: '';
        $this->password = getenv('DB_PASS') ?: '';
    }

    public function getConnection() {
        // Explicitly disabled in stateless Phase 1 to prevent unauthorized or unintended connections
        error_log("[Database Notice] Database connection is disabled in stateless mode.");
        return null;
    }
}
