const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Database Connection ---
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'minrely_db'
});

// Test Connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL Database');
    connection.release();
  }
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Routes ---

// Register
app.post('/api/register', async (req, res) => {
  const { email, password, referralCode } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const sql = 'INSERT INTO users (email, password, referral_code, role, balance) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [email, hashedPassword, referralCode, 'user', 0], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'User registered successfully' });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ message: 'User not found' });
    
    const user = results[0];
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secretkey');
      res.json({ token, user: { id: user.id, email: user.email, role: user.role, balance: user.balance } });
    } else {
      res.status(403).json({ message: 'Invalid credentials' });
    }
  });
});

// Get User Data
app.get('/api/user', authenticateToken, (req, res) => {
  db.query('SELECT id, email, role, balance, referral_code FROM users WHERE id = ?', [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Transaction Request (Deposit/Withdraw)
app.post('/api/transaction', authenticateToken, (req, res) => {
  const { type, amount, address } = req.body;
  const sql = 'INSERT INTO transactions (user_id, type, amount, status, address, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
  db.query(sql, [req.user.id, type, amount, 'pending', address], (err, result) => {
     if (err) return res.status(500).json({ error: err.message });
     res.status(201).json({ message: 'Transaction requested' });
  });
});

// --- Admin Routes ---

// Get All Users
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.query('SELECT id, email, balance, role, is_active FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get Pending Transactions
app.get('/api/admin/transactions', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.query('SELECT t.*, u.email FROM transactions t JOIN users u ON t.user_id = u.id WHERE status = "pending"', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Update Transaction (Approve/Reject)
app.post('/api/admin/transaction/update', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { transactionId, status, userId, amount, type } = req.body; // status: 'approved' or 'rejected'
    
    // Start transaction
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });

        db.query('UPDATE transactions SET status = ? WHERE id = ?', [status, transactionId], (err, result) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
            }

            if (status === 'approved') {
                let balanceChange = type === 'deposit' ? amount : -amount;
                db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [balanceChange, userId], (err, result) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }
                    db.commit(err => {
                        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                        res.json({ message: 'Transaction approved and balance updated' });
                    });
                });
            } else {
                db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    res.json({ message: 'Transaction rejected' });
                });
            }
        });
    });
});

// Get/Set Settings
app.get('/api/settings', (req, res) => {
    db.query('SELECT * FROM settings LIMIT 1', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || {});
    });
});

app.post('/api/admin/settings', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { admin_wallet } = req.body;
    // Assuming single row for settings
    const sql = 'UPDATE settings SET admin_wallet = ? WHERE id = 1'; 
    db.query(sql, [admin_wallet], (err, result) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json({ message: 'Settings updated' });
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});