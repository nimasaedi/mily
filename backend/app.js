const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// --- ROBUST CORS MIDDLEWARE ---
// This middleware runs before anything else to ensure headers are ALWAYS present.
app.use((req, res, next) => {
    // Allow any origin (Wildcard) to fix proxy/VPN issues and prevent 500 errors
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    
    // Handle Preflight (OPTIONS) immediately without crashing
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});

app.use(express.json());

// --- Database Connection ---
// CRITICAL FIX: We force 'localhost' here. Using Public IP (62.60...) on cPanel often fails 
// due to firewall/NAT loopback rules when Node and MySQL are on the same server.
const db = mysql.createPool({
  host: 'localhost', 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper to keep connection alive
const keepAlive = () => {
    db.getConnection((err, connection) => {
        if (err) {
            console.error('⚠️ DB Connection Check Failed:', err.message);
        } else {
            // console.log('✅ DB Ping Successful');
            connection.ping();
            connection.release();
        }
    });
};
// Check DB every 5 minutes
setInterval(keepAlive, 300000);

// --- Constants ---
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

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
            console.error("SQL Error during register:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: "This email is already registered." });
            }
            return res.status(500).json({ error: "Database Error" });
        }
        res.status(201).json({ message: 'User registered successfully', user: { email, role: 'user' } });
    });
  } catch (e) {
      console.error("Register Exception:", e);
      res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
        console.error("SQL Error during login:", err);
        return res.status(500).json({ error: "Database Error" });
    }
    if (results.length === 0) return res.status(400).json({ message: 'User not found' });
    
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
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

// Transaction Request
app.post('/api/transaction', authenticateToken, (req, res) => {
  const { type, amount, address } = req.body;
  const sql = 'INSERT INTO transactions (user_id, type, amount, status, address, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
  db.query(sql, [req.user.id, type, amount, 'pending', address], (err, result) => {
     if (err) return res.status(500).json({ error: err.message });
     res.status(201).json({ message: 'Transaction requested' });
  });
});

// --- Admin Routes ---
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.query('SELECT id, email, balance, role, is_active FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/transactions', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.query('SELECT t.*, u.email FROM transactions t JOIN users u ON t.user_id = u.id WHERE status = "pending"', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/transaction/update', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { transactionId, status, userId, amount, type } = req.body;
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });

        db.query('UPDATE transactions SET status = ? WHERE id = ?', [status, transactionId], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            if (status === 'approved') {
                let balanceChange = type === 'deposit' ? amount : -amount;
                db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [balanceChange, userId], (err, result) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
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

// --- Health Check ---
app.get('/', (req, res) => {
  db.getConnection((err, connection) => {
      const dbStatus = err ? 'error' : 'connected';
      const dbMessage = err ? err.message : 'OK';
      if(connection) connection.release();

      res.status(200).json({ 
        message: 'MinRely Backend API is running successfully!',
        status: 'active',
        database: dbStatus,
        db_message: dbMessage
      });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});