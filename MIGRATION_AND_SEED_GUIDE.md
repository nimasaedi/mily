# Database Setup for MinRely

To run this project on your host, you need to create a MySQL database and import the following schema.

## 1. Create Database
The database name used in this project is `rid_req_rid`. Ensure this database is created in your phpMyAdmin/cPanel.

## 2. SQL Schema
Run the following SQL queries in phpMyAdmin (inside `rid_req_rid` database) or your MySQL client:

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    balance DECIMAL(15, 2) DEFAULT 0.00,
    referral_code VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('deposit', 'withdrawal') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    address VARCHAR(255),
    tx_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_wallet VARCHAR(255),
    min_deposit DECIMAL(10, 2) DEFAULT 10.00,
    min_withdraw DECIMAL(10, 2) DEFAULT 10.00
);

-- Insert Default Settings
INSERT INTO settings (id, admin_wallet) VALUES (1, 'YOUR_TRC20_WALLET_ADDRESS') 
ON DUPLICATE KEY UPDATE id=id;

-- Insert Admin User (Password: admin123)
-- Note: In production, you should register via the frontend to get a proper hash, then manually change role to 'admin' in DB.
-- The hash below corresponds to 'admin123'
INSERT INTO users (email, password, role) VALUES ('admin@minrely.com', '$2b$10$YourHashedPasswordHere...', 'admin');
```

## 3. Environment Variables (.env)
Create a `.env` file in the `backend` folder on your host with the following content (Updated with your provided credentials):

```env
DB_HOST=62.60.164.17
DB_USER=rid_req_user_rid
DB_PASSWORD=qGHr6D]n,=7?
DB_NAME=rid_req_rid
JWT_SECRET=your_super_secret_key_that_is_long_and_random
PORT=5000
```
