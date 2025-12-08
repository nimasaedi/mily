const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// --- GLOBAL ERROR HANDLERS (Prevent App Crash) ---
// These ensure the app stays alive even if a module fails, preventing the "500 Internal Server Error" page from Apache.
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

// --- MANUAL CORS CONFIGURATION (The Bulletproof Method) ---
// Instead of using the 'cors' library which can conflict with cPanel/Apache,
// we manually inject the necessary headers for every single request.
app.use((req, res, next) => {
    // 1. Get the origin of the request (e.g., https://minrely.com)
    const origin = req.headers.origin;
    
    // 2. Allow that origin specifically (Reflected Origin Strategy)
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Fallback for tools like Postman or direct browser hits
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // 3. Allow Credentials (cookies, authorization headers)
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 4. Allow Standard Methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    // 5. Allow Necessary Headers
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    // 6. Handle Preflight (OPTIONS) requests immediately
    // This prevents the request from hitting the DB or other logic, fixing the 500 error.
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.json());

// --- Database Configuration ---
const dbConfig = {
    host: 'localhost', // Force localhost to avoid loopback firewall issues
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Validate Env
if (!dbConfig.user || !dbConfig.database) {
    console.error("❌ CRITICAL: Database credentials missing in .env file.");
}

const db = mysql.createPool(dbConfig);

// Keep DB Connection Alive
const keepAlive = () => {
    if (!dbConfig.user) return;
    db.getConnection((err, connection) => {
        if (err) {
            console.error('⚠️ DB Connection Check Failed:', err.message);
        } else {
            connection.ping();
            connection.release();
        }
    });
};
setInterval(keepAlive, 300000); // Every 5 minutes

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
  
  if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, password, referral_code, role, balance) VALUES (?, ?, ?, ?, ?)';
    
    db.query(sql, [email, hashedPassword, referralCode, 'user', 0], (err, result) => {
        if (err) {
            console.error("SQL Error during register:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: "This email is already registered." });
            }
            return res.status(500).json({ error: "Database Error: " + err.message });
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
        return res.status(500).json({ error: "Database Error: " + err.message });
    }
    if (results.length === 0) return res.status(400).json({ message: 'User not found' });
    
    const user = results[0];
    try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
          res.json({ token, user: { id: user.id, email: user.email, role: user.role, balance: user.balance } });
        } else {
          res.status(403).json({ message: 'Invalid credentials' });
        }
    } catch (bcryptErr) {
        console.error("Bcrypt Error:", bcryptErr);
        res.status(500).json({ error: "Auth Error" });
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
  if (!dbConfig.user) {
       return res.status(200).json({
           status: 'warning',
           message: 'Backend running, but DB credentials missing in .env',
           database: 'not_configured'
       });
  }

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
