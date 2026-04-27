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

/* 🔥 FIX: enforce JWT secret */
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}
const JWT_SECRET = process.env.JWT_SECRET;

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
  user: process.env.DB_USER || 'mediauser',
  password: process.env.DB_PASSWORD || 'securepassword',
  host: process.env.DB_HOST || 'postgres-service',   // 🔥 FIX
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'media_portal',
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
    console.error('PostgreSQL init failed, retrying...', err.message);
    setTimeout(initializePostgres, 5000); // 🔥 FIX
  }
}

// ==================== Redis Setup ====================
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis-service', // 🔥 FIX
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
app.use(express.static(path.join(__dirname, 'app'))); // 🔥 FIX

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

/* 🔥 FIX: health endpoint */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==================== Routes ====================

// Get media index
const MEDIA_DIR = path.join(__dirname, "media");

/* 🔥 FIX: protect media */
app.use('/media', verifyToken, express.static(MEDIA_DIR));

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

/* 🔥 FIX: protect index */
app.get('/media-index.json', verifyToken, (req, res) => {
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

    const existingUser = await pgPool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pgPool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    /* 🔥 FIX: safe Redis */
    if (redisClient.isOpen) {
      await redisClient.setEx(
        `user_session:${user.id}`,
        7 * 24 * 60 * 60,
        JSON.stringify({ username: user.username, email: user.email, loginTime: new Date().toISOString() })
      );
    }

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

    const result = await pgPool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await pgPool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    /* 🔥 FIX: safe Redis */
    if (redisClient.isOpen) {
      await redisClient.setEx(
        `user_session:${user.id}`,
        7 * 24 * 60 * 60,
        JSON.stringify({ username: user.username, email: user.email, loginTime: new Date().toISOString() })
      );
    }

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
    if (redisClient.isOpen) { // 🔥 FIX
      await redisClient.del(`user_session:${req.userId}`);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// (Rest of your visitor + stats + fallback routes remain EXACTLY same — unchanged)
initializePostgres();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});