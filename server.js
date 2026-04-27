require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const redis = require('redis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'visitors.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_this';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ==================== SQLite Setup ====================
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Unable to open SQLite database:', err);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    username TEXT,
    email TEXT,
    authMethod TEXT,
    url TEXT,
    userAgent TEXT,
    platform TEXT,
    language TEXT,
    referrer TEXT,
    timestamp TEXT
  )`);
});

// ==================== PostgreSQL Setup ====================
const pgPool = new Pool({
  user: process.env.POSTGRES_USER || 'mediauser',
  password: process.env.POSTGRES_PASSWORD || 'securepassword',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'media_portal_db',
});

pgPool.on('error', (err) => {
  console.error('PostgreSQL Pool Error:', err);
});

// Initialize PostgreSQL users table
async function initializePostgres() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `);
    console.log('✓ PostgreSQL users table initialized');
  } catch (err) {
    console.error('Error initializing PostgreSQL:', err);
  }
}

// ==================== Redis Setup ====================
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected');
});

// Connect Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('Redis connection warning (continuing without cache):', err.message);
  }
})();

// ==================== Middleware ====================
app.use(express.json());
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname)));

// JWT Verification Middleware
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== Routes ====================

// Get media index
const MEDIA_DIR = path.join(__dirname, "media");

app.use('/media', express.static(MEDIA_DIR));

function getAllMediaFiles(dir, basePath = '') {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      results = results.concat(getAllMediaFiles(path.join(dir, entry.name), path.join(basePath, entry.name)));
    } else if (entry.isFile()) {
      results.push(path.join(basePath, entry.name).replace(/\\/g, '/'));
    }
  }

  return results;
}

app.get('/media-index.json', (req, res) => {
  try {
    if (!fs.existsSync(MEDIA_DIR)) {
      return res.json([]);
    }

    const files = getAllMediaFiles(MEDIA_DIR);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json(files);

  } catch (err) {
    res.status(500).json({ error: 'Unable to build media index' });
  }
});

// ==================== Authentication Routes ====================

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existingUser = await pgPool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pgPool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Store session in Redis with 7 days expiry
    await redisClient.setEx(
      `user_session:${user.id}`,
      7 * 24 * 60 * 60,
      JSON.stringify({ username: user.username, email: user.email, loginTime: new Date().toISOString() })
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const result = await pgPool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    await pgPool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Store session in Redis with 7 days expiry
    await redisClient.setEx(
      `user_session:${user.id}`,
      7 * 24 * 60 * 60,
      JSON.stringify({ username: user.username, email: user.email, loginTime: new Date().toISOString() })
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
app.post('/api/logout', verifyToken, async (req, res) => {
  try {
    // Remove session from Redis
    await redisClient.del(`user_session:${req.userId}`);

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user (protected route)
app.get('/api/user', verifyToken, async (req, res) => {
  try {
    // Try to get from Redis first
    const cachedUser = await redisClient.get(`user_session:${req.userId}`);

    if (cachedUser) {
      return res.json({ user: JSON.parse(cachedUser) });
    }

    // Get from PostgreSQL
    const result = await pgPool.query(
      'SELECT id, username, email, created_at, last_login FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Visitor tracking endpoint
app.post('/api/visitor', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  const {
    username = '',
    email = '',
    authMethod = 'anonymous',
    url = '/',
    userAgent = '',
    platform = '',
    language = ''
  } = req.body || {};
  const referrer = req.headers.referer || '';
  const timestamp = new Date().toISOString();

  db.run(
    `INSERT INTO visitors (ip, username, email, authMethod, url, userAgent, platform, language, referrer, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ip, username, email, authMethod, url, userAgent, platform, language, referrer, timestamp],
    function(err) {
      if (err) {
        console.error('Visitor insert error:', err);
        return res.status(500).json({ error: 'Failed to log visitor' });
      }

      res.json({
        success: true,
        visitorId: this.lastID,
        timestamp
      });
    }
  );
});

// Visitor stats endpoint
app.get('/api/visitor-stats', (req, res) => {
  db.get('SELECT COUNT(*) AS totalHits FROM visitors', (err, totalRow) => {
    if (err) {
      console.error('DB stats error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }

    db.get('SELECT COUNT(DISTINCT ip) AS uniqueIps FROM visitors', (err2, uniqueRow) => {
      if (err2) {
        console.error('DB unique error:', err2);
        return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
      }

      db.all(
        `SELECT ip, username, email, authMethod, url, userAgent, platform, language, referrer, timestamp
         FROM visitors
         ORDER BY timestamp DESC
         LIMIT 10`,
        (err3, rows) => {
          if (err3) {
            console.error('DB latest error:', err3);
            return res.status(500).json({ success: false, error: 'Failed to fetch latest visitors' });
          }

          res.json({
            success: true,
            totalHits: totalRow.totalHits,
            uniqueIps: uniqueRow.uniqueIps,
            latest: rows
          });
        }
      );
    });
  });
});

// Get all visitors endpoint
app.get('/api/visitors', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  db.all(
    `SELECT ip, username, email, authMethod, url, userAgent, platform, language, referrer, timestamp
     FROM visitors
     ORDER BY timestamp DESC
     LIMIT ?`,
    [limit],
    (err, rows) => {
      if (err) {
        console.error('DB visitors error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch visitors' });
      }
      res.json({ success: true, visitors: rows });
    }
  );
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app/index.html'));
});

// ==================== Server Startup ====================
app.listen(PORT, async () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  
  // Initialize PostgreSQL
  await initializePostgres();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  db.close();
  pgPool.end();
  redisClient.disconnect();
  process.exit(0);
});
