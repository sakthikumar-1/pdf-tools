<?php
/**
 * Database Configuration (Prepared for Future Module Extensions)
 */

class Database {
    private $host = "localhost";
    private $db_name = "simatrix_pdf_tools";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8mb4");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            // Log error silently without exposing credentials
            error_log("Database connection error: " . $exception->getMessage());
        }
        return $this->conn;
    }
}
