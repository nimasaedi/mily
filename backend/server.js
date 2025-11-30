const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
// Default to 5000 as requested
const PORT = process.env.PORT || 5000;

// --- CORS Configuration ---
app.set('trust proxy', 1); // Trust cPanel proxy
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: false 
}));

app.use(express.json());

// --- Database Connection ---
// Credentials must be provided via .env file
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database Connection Error. Please check your .env file:', err.message);
  } else {
    console.log('✅ Connected to MySQL Database Successfully');
    connection.release();
  }
});

// --- Constants ---
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_please_change_in_env';

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Routes ---

// Register
app.post('/api/register', async (req, res) => {
  const { email, password, referralCode } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, password, referral_code, role, balance) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [email, hashedPassword, referralCode, 'user', 0], (err, result) => {
        if (err) {
            console.error("Register SQL Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'User registered successfully', user: { email, role: 'user' } });
    });
  } catch (e) {
      console.error("Register Error:", e);
      res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ message: 'User not found' });
    
    const user = results[0];
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
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
    const sql = 'UPDATE settings SET admin_wallet = ? WHERE id = 1'; 
    db.query(sql, [admin_wallet], (err, result) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json({ message: 'Settings updated' });
    });
});

// --- Basic Health Check Route ---
app.get('/', (req, res) => {
  console.log("Health Check Requested");
  res.status(200).json({ 
    message: 'MinRely Backend API is running successfully!',
    environment: process.env.NODE_ENV || 'development',
    status: 'active'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});