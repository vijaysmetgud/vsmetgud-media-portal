const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'visitors.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Unable to open database:', err);
    process.exit(1);
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

app.use(express.json());
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname)));

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
    res.json(files);
  } catch (err) {
    console.error('Failed to build media index:', err);
    res.status(500).json({ success: false, error: 'Unable to build media index' });
  }
});

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
        console.error('DB insert error:', err);
        return res.status(500).json({ success: false, error: 'Failed to record visitor' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
