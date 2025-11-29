# Database Setup for MinRely

To run this project on your host, you need to create a MySQL database and import the following schema.

## 1. Create Database
Create a new database named `minrely_db` (or whatever you configured in `.env`).

## 2. SQL Schema
Run the following SQL queries in phpMyAdmin or your MySQL client:

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
-- Note: In production, generate a real bcrypt hash. This hash is for 'admin123'
INSERT INTO users (email, password, role) VALUES ('admin@minrely.com', '$2b$10$YourHashedPasswordHere...', 'admin');
```

## 3. Environment Variables (.env)
Create a `.env` file in the `backend` folder:

```
DB_HOST=localhost
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=minrely_db
JWT_SECRET=secure_random_string
PORT=5000
```
