const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_USERNAME = 'Vijay';
const ADMIN_PASSWORD = 'victory#123';

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'visitors.db');

const { spawn } = require("child_process");

const cors = require("cors");

app.use(cors());

app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

console.log('SQLite database connected successfully.');

db.prepare(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    username TEXT,
    visitorName TEXT,
    email TEXT,
    authMethod TEXT,
    url TEXT,
    userAgent TEXT,
    platform TEXT,
    language TEXT,
    screen TEXT,
    timezone TEXT,
    referrer TEXT,
    timestamp TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS logged_in_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    name TEXT,
    email TEXT,
    authMethod TEXT,
    ip TEXT,
    userAgent TEXT,
    platform TEXT,
    language TEXT,
    screen TEXT,
    timezone TEXT,
    timestamp TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS portal_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    name TEXT,
    email TEXT,
    authMethod TEXT,
    action TEXT,
    page TEXT,
    details TEXT,
    ip TEXT,
    userAgent TEXT,
    platform TEXT,
    language TEXT,
    screen TEXT,
    timezone TEXT,
    timestamp TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS media_payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitorName TEXT,
    username TEXT,
    email TEXT,
    phone TEXT,
    amount REAL,
    currency TEXT,
    paymentMethod TEXT,
    paymentReference TEXT,
    transactionId TEXT,
    visitorType TEXT,
    status TEXT,
    sourcePage TEXT,
    ip TEXT,
    userAgent TEXT,
    platform TEXT,
    language TEXT,
    timezone TEXT,
    paidAt TEXT,
    validUntil TEXT,
    accessGranted BOOLEAN DEFAULT 0,
    whatsappSent BOOLEAN DEFAULT 0,
    details TEXT,
    createdAt TEXT
  )
`).run();

// ============================================================
// GLOBAL PORTAL SETTINGS
// ============================================================

db.prepare(`
  CREATE TABLE IF NOT EXISTS portal_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`).run();

db.prepare(`
  INSERT OR IGNORE INTO portal_settings
  (key, value)
  VALUES
  ('media_paywall_enabled', 'true')
`).run();

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            'change-this-session-secret',

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge:
                24 * 60 * 60 * 1000
        }
    })
);

db.prepare(`
  INSERT OR IGNORE INTO portal_settings
  (key, value)
  VALUES (?, ?)
`).run(
  'health_reminder_enabled',
  'true'
);

db.prepare(`
  INSERT OR IGNORE INTO portal_settings
  (key, value)
  VALUES (?, ?)
`).run(
  'health_reminder_schedule',
  JSON.stringify([
    {
      id: "walk",
      label: "Walk",
      time: "09:15",
      message:
        "Walk for 10 minutes now to refresh your energy and improve focus."
    },
    {
      id: "sitting",
      label: "Prolonged Sitting",
      time: "11:00",
      message:
        "You have been sitting for long. Stand up, stretch your legs, and walk for 2 minutes."
    },
    {
      id: "exercise",
      label: "Exercise",
      time: "12:30",
      message:
        "Do a light exercise or stretch break to keep your body active."
    },
    {
      id: "lunch",
      label: "Lunch Break",
      time: "13:00",
      message:
        "It is lunch break time. Eat mindfully and take a short rest."
    },
    {
      id: "tea",
      label: "Tea Break",
      time: "15:00",
      message:
        "Tea break time: stand up, hydrate, and take a short reset."
    },
    {
      id: "compliment",
      label: "Compliment",
      time: "17:30",
      message:
        "Excellent work today. Keep up the good effort—you are doing great!"
    },
    {
      id: "office",
      label: "Office Leaving Time",
      time: "18:00",
      message:
        "Office leaving time. Wrap up your work and finish your day calmly."
    },
    {
      id: "run",
      label: "Run",
      time: "18:30",
      message:
        "Evening run or brisk walk will help keep you energetic and healthy."
    }
  ])
);

app.set('trust proxy', true);
app.use('/bank-qr', express.static(__dirname));
app.use(express.static(path.join(__dirname, 'app')));

const MEDIA_DIR = path.join(__dirname, "media");

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, MEDIA_DIR),
    filename: (req, file, cb) => {
      const safeName = String(file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    }
  })
});

// app.use('/media', express.static(MEDIA_DIR));

// ============================================================
// PROTECTED MEDIA
// ============================================================

app.use(
  '/media',
  (req, res) => {

    const access =
      authorizeMediaAccess(req);


    if (!access.allowed) {

      return res.status(403).json({

        success: false,

        error:
          access.reason ||
          'Media access denied'
      });
    }


    try {

      const relativePath =
        decodeURIComponent(
          req.path.replace(
            /^\/+/,
            ''
          )
        );


      const filePath =
        path.normalize(
          path.join(
            MEDIA_DIR,
            relativePath
          )
        );


      // Prevent ../ path traversal
      if (
        !filePath.startsWith(
          MEDIA_DIR + path.sep
        )
      ) {

        return res.status(403).send(
          'Access denied'
        );
      }


      if (
        !fs.existsSync(filePath)
      ) {

        return res.status(404).send(
          'File not found'
        );
      }


      if (
        !fs.statSync(filePath).isFile()
      ) {

        return res.status(404).send(
          'File not found'
        );
      }


      return res.sendFile(
        filePath
      );


    } catch (err) {

      console.error(
        'Protected media error:',
        err
      );


      return res.status(500).send(
        'Unable to serve media'
      );
    }
  }
);

// function isValidAdminRequest(req) {
//   const username = String(req.headers['x-admin-user'] || '');
//   const token = String(req.headers['x-admin-token'] || '');
//   const expectedToken = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');
//   return username === ADMIN_USERNAME && token === expectedToken;
// }

// ============================================================
// GLOBAL MEDIA PAYWALL HELPERS
// ============================================================

function getMediaPaywallEnabledServer() {

  const row = db.prepare(`
    SELECT value
    FROM portal_settings
    WHERE key = 'media_paywall_enabled'
  `).get();

  return row
    ? row.value === 'true'
    : true;
}


function setMediaPaywallEnabledServer(enabled) {

  db.prepare(`
    INSERT INTO portal_settings
    (key, value)
    VALUES
    ('media_paywall_enabled', ?)

    ON CONFLICT(key)
    DO UPDATE SET
      value = excluded.value
  `).run(
    enabled ? 'true' : 'false'
  );

  return enabled;
}


function hasApprovedMediaAccess(username) {

  if (!username) {
    return false;
  }

  const payment = db.prepare(`
    SELECT id
    FROM media_payment_transactions

    WHERE username = ?
      AND status = 'approved'
      AND accessGranted = 1
      AND validUntil IS NOT NULL
      AND validUntil > ?

    ORDER BY validUntil DESC

    LIMIT 1
  `).get(
    username,
    new Date().toISOString()
  );

  return !!payment;
}

function authorizeMediaAccess(req) {

    // --------------------------------------------------------
    // 1. ADMIN
    // --------------------------------------------------------

    if (
        req.session &&
        req.session.user &&
        req.session.user.role === 'admin'
    ) {

        return {
            allowed: true,
            role: 'admin'
        };
    }


    // --------------------------------------------------------
    // 2. QR OFF
    // --------------------------------------------------------

    if (
        !getMediaPaywallEnabledServer()
    ) {

        return {
            allowed: true,
            role: 'visitor'
        };
    }


    // --------------------------------------------------------
    // 3. QR ON
    // --------------------------------------------------------

    const user =
        getAuthenticatedUser(req);


    if (!user) {

        return {
            allowed: false,
            status: 403,
            reason:
                'Login required'
        };
    }


    // --------------------------------------------------------
    // 4. APPROVED PAYMENT
    // --------------------------------------------------------

    if (
        hasApprovedMediaAccess(
            user.username
        )
    ) {

        return {
            allowed: true,
            role: 'visitor'
        };
    }


    // --------------------------------------------------------
    // 5. NO APPROVED PAYMENT
    // --------------------------------------------------------

    return {
        allowed: false,
        status: 403,
        reason:
            'Media payment approval required'
    };
}
// ============================================================
// SERVER-SIDE LOGIN
// ============================================================

app.post('/api/login', (req, res) => {

    try {

        const username =
            String(
                req.body?.username || ''
            ).trim();

        const password =
            String(
                req.body?.password || ''
            );


        if (!username || !password) {

            return res.status(400).json({
                success: false,
                error:
                    'Username and password are required'
            });
        }


        // ----------------------------------------------------
        // ADMIN LOGIN
        // ----------------------------------------------------

        if (
            username === ADMIN_USERNAME &&
            password === ADMIN_PASSWORD
        ) {

            req.session.user = {
                username: ADMIN_USERNAME,
                name: 'Admin User',
                email: 'admin@example.com',
                role: 'admin'
            };


            return res.json({

                success: true,

                user: {
                    username: ADMIN_USERNAME,
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: 'admin'
                }
            });
        }


        // ----------------------------------------------------
        // NORMAL USER / VISITOR
        //
        // Your existing portal allows other names to login.
        // Keep that behavior for now.
        // ----------------------------------------------------

        req.session.user = {

            username: username,

            name: username,

            email:
                `${username}@visitor.local`,

            role: 'visitor'
        };


        return res.json({

            success: true,

            user: {
                username: username,
                name: username,
                email:
                    `${username}@visitor.local`,
                role: 'visitor'
            }
        });


    } catch (err) {

        console.error(
            'Login error:',
            err
        );

        return res.status(500).json({

            success: false,

            error:
                'Unable to process login'
        });
    }
});

// ============================================================
// LOGOUT
// ============================================================

app.post('/api/logout', (req, res) => {

    req.session.destroy(err => {

        if (err) {

            console.error(
                'Logout error:',
                err
            );

            return res.status(500).json({
                success: false,
                error:
                    'Unable to logout'
            });
        }


        res.clearCookie(
            'connect.sid'
        );


        res.json({
            success: true
        });
    });
});

// ============================================================
// GET AUTHENTICATED SESSION USER
// ============================================================

function getAuthenticatedUser(req) {

    if (
        !req.session ||
        !req.session.user
    ) {
        return null;
    }

    return req.session.user;
}

// ============================================================
// GLOBAL MEDIA PAYWALL - GET
// ============================================================

app.get(
  '/api/media-paywall',
  (req, res) => {

    try {

      res.json({
        success: true,
        enabled:
          getMediaPaywallEnabledServer()
      });

    } catch (err) {

      console.error(
        'Media paywall GET error:',
        err
      );

      res.status(500).json({
        success: false,
        error:
          'Unable to read media payment setting'
      });
    }
  }
);


// ============================================================
// HEALTH REMINDER SETTINGS - GET
// ============================================================

app.get(
  '/api/health-reminders',
  (req, res) => {

    try {

      const enabledRow =
        db.prepare(`
          SELECT value
          FROM portal_settings
          WHERE key = ?
        `).get(
          'health_reminder_enabled'
        );


      const scheduleRow =
        db.prepare(`
          SELECT value
          FROM portal_settings
          WHERE key = ?
        `).get(
          'health_reminder_schedule'
        );


      let schedule = [];

      if (
        scheduleRow &&
        scheduleRow.value
      ) {

        try {

          schedule =
            JSON.parse(
              scheduleRow.value
            );

        } catch (error) {

          console.error(
            'Invalid health reminder schedule:',
            error
          );

        }
      }


      return res.json({

        success: true,

        enabled:
          enabledRow
            ? enabledRow.value === 'true'
            : true,

        schedule

      });


    } catch (error) {

      console.error(
        'Health reminder GET error:',
        error
      );


      return res.status(500).json({

        success: false,

        error:
          'Unable to load health reminder settings'

      });

    }

  }
);

// ============================================================
// HEALTH REMINDER SETTINGS - ADMIN UPDATE
// ============================================================

app.post(
  '/api/health-reminders',
  (req, res) => {

    try {

      if (
        !req.session ||
        !req.session.user ||
        req.session.user.role !== 'admin'
      ) {

        return res.status(403).json({

          success: false,

          error:
            'Admin access required'

        });

      }


      const enabled =
        req.body &&
        req.body.enabled === true;


      const schedule =
        req.body &&
        req.body.schedule;


      if (!Array.isArray(schedule)) {

        return res.status(400).json({

          success: false,

          error:
            'Invalid health reminder schedule'

        });

      }


      db.prepare(`
        UPDATE portal_settings
        SET value = ?
        WHERE key = ?
      `).run(
        enabled
          ? 'true'
          : 'false',

        'health_reminder_enabled'
      );


      db.prepare(`
        UPDATE portal_settings
        SET value = ?
        WHERE key = ?
      `).run(
        JSON.stringify(schedule),

        'health_reminder_schedule'
      );


      return res.json({

        success: true,

        enabled,

        schedule

      });


    } catch (error) {

      console.error(
        'Health reminder update error:',
        error
      );


      return res.status(500).json({

        success: false,

        error:
          'Unable to save health reminder settings'

      });

    }

  }
);

// ============================================================
// CHECK CURRENT USER MEDIA ACCESS
// ============================================================

app.get(
  '/api/media-access',
  (req, res) => {

    try {

      const access =
        authorizeMediaAccess(req);

      if (!access.allowed) {

        return res.status(403).json({

          success: false,

          allowed: false,

          error:
            access.reason ||
            'Media access denied'
        });
      }

      return res.json({

        success: true,

        allowed: true,

        role:
          access.role ||
          'visitor'
      });

    } catch (err) {

      console.error(
        'Media access check error:',
        err
      );

      return res.status(500).json({

        success: false,

        allowed: false,

        error:
          'Unable to verify media access'
      });
    }
  }
);

// ============================================================
// GLOBAL MEDIA PAYWALL - ADMIN UPDATE
// ============================================================

app.post(
  '/api/media-paywall',
  (req, res) => {

    try {
      
      if (
          !req.session ||
          !req.session.user ||
          req.session.user.role !== 'admin'
      ) {
          return res.status(403).json({
              success: false,
              error: 'Admin access required'
          });
      }

      const enabled =
        req.body &&
        req.body.enabled === true;


      setMediaPaywallEnabledServer(
        enabled
      );


      res.json({
        success: true,
        enabled: enabled
      });

    } catch (err) {

      console.error(
        'Media paywall update error:',
        err
      );

      res.status(500).json({
        success: false,
        error:
          'Unable to update media payment setting'
      });
    }
  }
);

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

    // IMPORTANT:
    // Media index must remain visible even when
    // QR/payment protection is enabled.
    //
    // The actual /media/<file> endpoint is protected.

    if (!fs.existsSync(MEDIA_DIR)) {
      return res.json([]);
    }


    const files =
      getAllMediaFiles(MEDIA_DIR);


    // Disable caching so newly uploaded files
    // appear immediately.

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    res.setHeader(
      'Pragma',
      'no-cache'
    );

    res.setHeader(
      'Expires',
      '0'
    );


    return res.json(files);


  } catch (err) {

    console.error(
      'Media index error:',
      err
    );


    return res.status(500).json({
      success: false,
      error:
        'Unable to build media index'
    });

  }

});

app.post('/api/upload-media', upload.array('files', 50), (req, res) => {
  try {
    if (
      !req.session ||
      !req.session.user ||
      req.session.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const uploaded = req.files.map(file => {
      const relativePath = path.relative(MEDIA_DIR, file.path).replace(/\\/g, '/');
      return relativePath;
    });

    return res.json({ success: true, uploaded, count: uploaded.length });
  } catch (err) {
    console.error('Upload failure:', err);
    return res.status(500).json({ success: false, error: 'Unable to publish media file' });
  }
});

// app.post('/api/visitor', (req, res) => {
//   const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
//   const {
//     username = '',
//     email = '',
//     authMethod = 'anonymous',
//     url = '/',
//     userAgent = '',
//     platform = '',
//     language = ''
//   } = req.body || {};
//   const referrer = req.headers.referer || '';
//   const timestamp = new Date().toISOString();

app.post('/api/visitor', (req, res) => {

  try {

    const ip =
      (req.headers['x-forwarded-for'] || req.ip || '')
      .split(',')[0]
      .trim();

    const {
      username = '',
      visitorName = '',
      email = '',
      authMethod = 'anonymous',
      url = '/',
      userAgent = '',
      platform = '',
      language = '',
      screen = '',
      timezone = ''
    } = req.body || {};

    const referrer =
      req.headers.referer || '';

    const timestamp =
      new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO visitors
      (
        ip,
        username,
        visitorName,
        email,
        authMethod,
        url,
        userAgent,
        platform,
        language,
        screen,
        timezone,
        referrer,
        timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      ip,
      username,
      visitorName || username || 'Visitor',
      email,
      authMethod,
      url,
      userAgent,
      platform,
      language,
      screen,
      timezone,
      referrer,
      timestamp
    );

    res.json({
      success: true,
      id: result.lastInsertRowid
    });

  } catch (err) {

    console.error('DB insert error:', err);

    res.status(500).json({
      success: false,
      error: 'Failed to record visitor'
    });

  }

});

app.get('/api/visitor-stats', (req, res) => {

  try {

    const totalRow =
      db.prepare(
        'SELECT COUNT(*) AS totalHits FROM visitors'
      ).get();

    const uniqueRow =
      db.prepare(`
        SELECT COUNT(
          DISTINCT
              ip ||
              userAgent ||
              platform ||
              screen ||
              timezone
        ) AS uniqueIps
        FROM visitors
      `).get();

    const rows =
      db.prepare(`
        SELECT
          ip,
          username,
          visitorName,
          email,
          authMethod,
          url,
          userAgent,
          platform,
          language,
          referrer,
          timestamp
        FROM visitors
        ORDER BY timestamp DESC
        LIMIT 10
      `).all();

    res.json({
      success: true,
      totalHits: totalRow.totalHits,
      uniqueIps: uniqueRow.uniqueIps,
      latest: rows
    });

  } catch (err) {

    console.error('DB stats error:', err);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });

  }

});

app.get('/api/visitors', (req, res) => {

  try {

    const limit =
      parseInt(req.query.limit, 10) || 50;

    const rows =
      db.prepare(`
        SELECT
          ip,
          username,
          visitorName,
          email,
          authMethod,
          url,
          userAgent,
          platform,
          language,
          referrer,
          timestamp
        FROM visitors
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(limit);

    res.json({
      success: true,
      visitors: rows
    });

  } catch (err) {

    console.error('DB visitors error:', err);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitors'
    });

  }

});

app.post('/api/login-user', (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const payload = req.body || {};
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO logged_in_users (
        username, name, email, authMethod, ip, userAgent, platform, language, screen, timezone, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.username || '',
      payload.name || payload.username || 'User',
      payload.email || '',
      payload.authMethod || 'local',
      ip,
      payload.userAgent || '',
      payload.platform || '',
      payload.language || '',
      payload.screen || '',
      payload.timezone || '',
      timestamp
    );

    db.prepare(`
      INSERT INTO portal_activity (
        username, name, email, authMethod, action, page, details, ip, userAgent, platform, language, screen, timezone, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.username || '',
      payload.name || payload.username || 'User',
      payload.email || '',
      payload.authMethod || 'local',
      'login',
      'portal',
      'User logged in to the portal',
      ip,
      payload.userAgent || '',
      payload.platform || '',
      payload.language || '',
      payload.screen || '',
      payload.timezone || '',
      timestamp
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Login record error:', err);
    res.status(500).json({ success: false, error: 'Failed to record login activity' });
  }
});

function getActivityQueryFilters(req) {
  const from = req.query.from || '';
  const to = req.query.to || '';
  const where = [];
  const params = [];

  if (from) {
    where.push('timestamp >= ?');
    params.push(from + 'T00:00:00.000Z');
  }

  if (to) {
    where.push('timestamp <= ?');
    params.push(to + 'T23:59:59.999Z');
  }

  const sql = `
    SELECT username, name, email, authMethod, action, page, details, ip, userAgent, platform, language, screen, timezone, timestamp
    FROM portal_activity
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY timestamp DESC
  `;

  return { sql, params };
}

app.post('/api/log-activity', (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const payload = req.body || {};
    function getISTTimestamp() {
        const now = new Date();

        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(now);

        const get = type => parts.find(p => p.type === type)?.value;
        
        return `${get('year')}-${get('month')}-${get('day')} T ${get('hour')}:${get('minute')}:${get('second')}+05:30`;
    }

    db.prepare(`
      INSERT INTO portal_activity (
        username, name, email, authMethod, action, page, details, ip, userAgent, platform, language, screen, timezone, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.username || '',
      payload.name || payload.username || 'User',
      payload.email || '',
      payload.authMethod || 'local',
      payload.action || 'page_view',
      payload.page || 'portal',
      payload.details || '',
      ip,
      payload.userAgent || '',
      payload.platform || '',
      payload.language || '',
      payload.screen || '',
      payload.timezone || '',
      timestamp
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ success: false, error: 'Failed to save activity log' });
  }
});

app.get('/api/activity-report', (req, res) => {
  try {
    const { sql, params } = getActivityQueryFilters(req);
    const rows = db.prepare(sql).all(...params);

    res.json({
      success: true,
      rows: rows.map(row => ({
        ...row,
        timestamp: row.timestamp || ''
      }))
    });
  } catch (err) {
    console.error('Activity report error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch activity report' });
  }
});

app.get('/api/activity-report.xlsx', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { sql, params } = getActivityQueryFilters(req);
    const rows = db.prepare(sql).all(...params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Media Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Portal Activity');
    sheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 22 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'Auth Method', key: 'authMethod', width: 16 },
      { header: 'Action', key: 'action', width: 18 },
      { header: 'Page', key: 'page', width: 22 },
      { header: 'Details', key: 'details', width: 40 },
      { header: 'IP', key: 'ip', width: 18 },
      { header: 'Platform', key: 'platform', width: 16 },
      { header: 'Language', key: 'language', width: 18 },
      { header: 'Timezone', key: 'timezone', width: 24 }
    ];

    rows.forEach(row => {
      sheet.addRow({
        timestamp: row.timestamp || '',
        username: row.username || '',
        name: row.name || '',
        email: row.email || '',
        authMethod: row.authMethod || '',
        action: row.action || '',
        page: row.page || '',
        details: row.details || '',
        ip: row.ip || '',
        platform: row.platform || '',
        language: row.language || '',
        timezone: row.timezone || ''
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="portal-activity-report.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Excel report error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate Excel report' });
  }
});

function sendWhatsAppAdminNotification(transaction) {
  const adminPhone = process.env.WHATSAPP_ADMIN_PHONE || '919035287965';
  const adminMessage = process.env.WHATSAPP_MESSAGE || 'Media payment received';
  const token = process.env.WHATSAPP_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

  if (!adminPhone && !token && !phoneNumberId) {
    console.log('[WhatsApp] Admin notification queued but not configured:', transaction);
    return { success: true, skipped: true };
  }

  const text = `${adminMessage}\nVisitor: ${transaction.visitorName || 'External Visitor'}\nEmail: ${transaction.email || '-'}\nPhone: ${transaction.phone || '-'}\nAmount: ₹${Number(transaction.amount || 0).toFixed(2)}\nReference: ${transaction.paymentReference || transaction.transactionId || '-'}\nValid Until: ${transaction.validUntil || '-'}\nStatus: ${transaction.status || 'paid'}`;

  const endpoint = process.env.WHATSAPP_WEBHOOK_URL || `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : undefined
  };

  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: adminPhone,
      type: 'text',
      text: { body: text }
    })
  }).then(async response => {
    const body = await response.text();
    if (!response.ok) {
      console.error('[WhatsApp] Notification failed:', response.status, body);
      return { success: false, error: body };
    }
    return { success: true, body };
  }).catch(err => {
    console.error('[WhatsApp] Notification error:', err);
    return { success: false, error: err.message };
  });
}

app.post('/api/media-payment', (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || '')
      .split(',')[0]
      .trim();

    const payload = req.body || {};

    const paidAt = new Date().toISOString();

    // Payment is NOT approved yet
    const validUntil = null;

    const transactionId =
      payload.transactionId || `MEDIA-${Date.now()}`;

    // Fixed media access price
    const amount = 10;

    const visitorName =
      payload.visitorName ||
      payload.name ||
      'External Visitor';

    const username = payload.username || '';
    const email = payload.email || '';
    const phone = payload.phone || '';

    const insert = db.prepare(`
      INSERT INTO media_payment_transactions (
        visitorName,
        username,
        email,
        phone,
        amount,
        currency,
        paymentMethod,
        paymentReference,
        transactionId,
        visitorType,
        status,
        sourcePage,
        ip,
        userAgent,
        platform,
        language,
        timezone,
        paidAt,
        validUntil,
        accessGranted,
        whatsappSent,
        details,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      visitorName,
      username,
      email,
      phone,
      amount,
      payload.currency || 'INR',
      payload.paymentMethod || 'QR',
      payload.paymentReference || transactionId,
      transactionId,
      payload.visitorType || 'external',

      // IMPORTANT
      'pending',

      payload.sourcePage || 'portal',
      ip,
      payload.userAgent || '',
      payload.platform || '',
      payload.language || '',
      payload.timezone || '',
      paidAt,

      // No access until admin approves
      validUntil,

      // Access NOT granted
      0,

      // WhatsApp notification not yet sent
      0,

      payload.details ||
        'Media access payment awaiting admin verification',

      paidAt
    );

    const record = {
        id: result.lastInsertRowid,
        visitorName,
        username,
        email,
        phone,
        amount,
        currency: 'INR',
        paymentReference: payload.paymentReference || transactionId,
        transactionId,
        status: 'pending',
        paidAt,
        validUntil: null,
        accessGranted: 0,
        visitorType: payload.visitorType || 'external'
    };

    sendWhatsAppAdminNotification(record)
      .then((waResult) => {
        if (waResult && waResult.success) {
          db.prepare(`UPDATE media_payment_transactions SET whatsappSent = 1 WHERE transactionId = ?`).run(transactionId);
        }
      })
      .catch(err => console.error('WhatsApp update error:', err));

    res.json({
      success: true,
      transactionId,
      paidAt,
      validUntil: null,
      amount,
      status: 'pending'
    });
  } catch (err) {
    console.error('Media payment insert error:', err);
    res.status(500).json({ success: false, error: 'Failed to record media payment' });
  }
});

app.get('/api/media-payment-transactions', (req, res) => {

  try {

    if (
      !req.session ||
      !req.session.user ||
      req.session.user.role !== 'admin'
    ) {

      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const rows = db.prepare(`
      SELECT id, visitorName, username, email, phone, amount,
             currency, paymentMethod, paymentReference,
             transactionId, visitorType, status, sourcePage,
             ip, userAgent, platform, language,
             timezone, paidAt, validUntil,
             accessGranted, whatsappSent,
             details, createdAt
      FROM media_payment_transactions
      ORDER BY createdAt DESC
      LIMIT 100
    `).all();

    res.json({
      success: true,
      rows
    });

  } catch (err) {

    console.error(
      'Media payment fetch error:',
      err
    );

    res.status(500).json({
      success: false,
      error:
        'Failed to fetch payment records'
    });
  }
});

app.post('/api/media-payment/:id/approve', (req, res) => {
    try {

        const paymentId = Number(req.params.id);

        if (!Number.isInteger(paymentId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment ID'
            });
        }

        // TODO: Keep/add your existing admin authentication check here.
        if (
          !req.session ||
          !req.session.user ||
          req.session.user.role !== 'admin'
        ) {

          return res.status(403).json({
            success: false,
            error:
              'Admin access required'
          });
        }

        const payment = db.prepare(`
            SELECT *
            FROM media_payment_transactions
            WHERE id = ?
        `).get(paymentId);

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment transaction not found'
            });
        }

        // Already approved
        if (
            payment.status === 'approved' &&
            payment.accessGranted === 1
        ) {
            return res.json({
                success: true,
                message: 'Payment already approved',
                validUntil: payment.validUntil,
                transactionId: payment.transactionId,
                accessGranted: 1
            });
        }

        // Grant access for 2 days from ADMIN APPROVAL time
        const validUntil = new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000
        ).toISOString();

        db.prepare(`
            UPDATE media_payment_transactions
            SET
                status = 'approved',
                accessGranted = 1,
                validUntil = ?
            WHERE id = ?
        `).run(
            validUntil,
            paymentId
        );

        console.log(
            `[MEDIA PAYMENT] Approved transaction ${payment.transactionId}`
        );

        res.json({
            success: true,
            message: 'Payment approved',
            transactionId: payment.transactionId,
            validUntil: validUntil,
            accessGranted: 1
        });

    } catch (err) {

        console.error(
            'Payment approval error:',
            err
        );

        res.status(500).json({
            success: false,
            error: err.message || 'Failed to approve payment'
        });
    }
});


// ============================================================
// ADMIN REJECT PAYMENT
// ============================================================

app.post(
  '/api/media-payment/:id/reject',
  (req, res) => {

    try {

      if (
        !req.session ||
        !req.session.user ||
        req.session.user.role !== 'admin'
      ) {

        return res.status(403).json({
          success: false,
          error:
            'Admin access required'
        });
      }


      const paymentId =
        Number(req.params.id);


      if (
        !Number.isInteger(paymentId)
      ) {

        return res.status(400).json({
          success: false,
          error:
            'Invalid payment ID'
        });
      }


      const payment =
        db.prepare(`
          SELECT *
          FROM media_payment_transactions
          WHERE id = ?
        `)
        .get(paymentId);


      if (!payment) {

        return res.status(404).json({
          success: false,
          error:
            'Payment transaction not found'
        });
      }


      db.prepare(`
        UPDATE media_payment_transactions

        SET
          status = 'rejected',
          accessGranted = 0,
          validUntil = NULL

        WHERE id = ?
      `)
      .run(paymentId);


      res.json({

        success: true,

        message:
          'Payment rejected',

        transactionId:
          payment.transactionId,

        accessGranted: 0
      });


    } catch (err) {

      console.error(
        'Payment rejection error:',
        err
      );

      res.status(500).json({

        success: false,

        error:
          'Failed to reject payment'
      });
    }
  }
);


const os = require("os");
// const { exec } = require("child_process");
const { exec, execSync } = require("child_process");

app.get("/stream/*", (req, res)=>{

    const access =
      authorizeMediaAccess(req);


    if (!access.allowed) {

      return res.status(403).json({

        success: false,

        error:
          access.reason ||
          'Media access denied'
      });
    }

    try{

        const file =
            decodeURIComponent(
                req.path.replace("/stream/","")
            );

        const filePath =
            path.normalize(
                path.join(MEDIA_DIR, file)
            );

        if (
            !filePath.startsWith(
                MEDIA_DIR + path.sep
            )
        ) {
            return res
                .status(403)
                .send("Access denied");
        }

        console.log("STREAM FILE:", filePath);

        if(!fs.existsSync(filePath)){

            return res
                .status(404)
                .send("File not found");
        }

        res.writeHead(200, {

            "Content-Type": "video/mp4",

            "Transfer-Encoding": "chunked"

        });

        const ffmpeg =
            spawn("ffmpeg", [

                "-loglevel",

                "quiet",

                "-i", filePath,

                "-f", "mp4",

                "-movflags",

                "frag_keyframe+empty_moov",

                "-vcodec", "libx264",

                "-acodec", "aac",

                "-preset", "veryfast",

                "-crf", "28",

                "-threads", "2",

                "pipe:1"

            ]);

        ffmpeg.stdout.pipe(res);

        req.on("close", ()=>{

            if (!ffmpeg.killed) {

                ffmpeg.kill("SIGKILL");

            }

        });

        ffmpeg.stderr.on("data", ()=>{});

        ffmpeg.on("error", err=>{

            console.log(err);

            res.end();

        });

        ffmpeg.on("close", ()=>{

            if (!res.writableEnded) {

                res.end();

            }

        });

    }
    catch(err){

        console.log(err);

        res.status(500).send("Streaming error");

    }

});

app.get("/api/metrics", (req, res) => {

    try {

        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        const usedMem =
            ((totalMem - freeMem) / totalMem) * 100;

        const cpuLoad =
            (os.loadavg()[0] / Math.max(1, os.cpus().length)) * 100;

        let runningPods = 0;
        try {
            const kubectlAvailable = execSync("kubectl version --client --short", { encoding: "utf8", stdio: ['ignore', 'pipe', 'pipe'] });
            if (kubectlAvailable) {
                runningPods = parseInt(
                    execSync(
                        "kubectl get pods -A --field-selector=status.phase=Running --no-headers | wc -l",
                        { encoding: "utf8", stdio: ['ignore', 'pipe', 'pipe'] }
                    ).trim(),
                    10
                ) || 0;
            }
        } catch (kubectlError) {
            runningPods = 0;
        }

        let diskTotal = "N/A";
        let diskUsed = "N/A";
        let diskFree = "N/A";
        let diskUsage = "N/A";

        try {
            const diskLine =
                execSync(
                    "df -h / | tail -1",
                    { encoding: "utf8", stdio: ['ignore', 'pipe', 'pipe'] }
                ).trim();

            const diskParts = diskLine.split(/\s+/);
            diskTotal = diskParts[1] || "N/A";
            diskUsed = diskParts[2] || "N/A";
            diskFree = diskParts[3] || "N/A";
            diskUsage = diskParts[4] || "N/A";
        } catch (diskError) {
            // ignore on systems without df or restricted shells
        }

        res.json({

            cpu:
                cpuLoad.toFixed(1) + "%",

            memory:
                usedMem.toFixed(1) + "%",

            pods:
                runningPods,

            diskTotal,
            diskUsed,
            diskFree,
            diskUsage,

            health:
                runningPods > 0 || diskTotal !== "N/A"
                ? "Healthy"
                : "Warning"

        });

    } catch(err) {

        console.log("METRICS ERROR:", err);

        res.json({

            cpu: "N/A",
            memory: "N/A",
            pods: 0,
            diskTotal: "N/A",
            diskUsed: "N/A",
            diskFree: "N/A",
            diskUsage: "N/A",
            health: "Unavailable"

        });

    }

});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
