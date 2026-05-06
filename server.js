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

    // 🔥 FIX: disable caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json(files);

  } catch (err) {
    res.status(500).json({ error: 'Unable to build media index' });
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

const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const os = require("os");
const https = require("https");

app.get("/api/metrics", async (req, res) => {

    try{

        const totalMem = os.totalmem();

        const freeMem = os.freemem();

        const usedMem =
            ((totalMem - freeMem) / totalMem) * 100;

        const cpuLoad =
            os.loadavg()[0] * 100;

        // ===============================
        // KUBERNETES API
        // ===============================

        const token =
            fs.readFileSync(
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
                "utf8"
            );

        const options = {

            hostname: "kubernetes.default.svc",

            path: "/api/v1/pods",

            method: "GET",

            headers: {
                Authorization: `Bearer ${token}`
            },

            rejectUnauthorized: false
        };

        const request = https.request(options, apiRes => {

            let data = "";

            apiRes.on("data", chunk => {
                data += chunk;
            });

            apiRes.on("end", () => {

                try{

                    const json = JSON.parse(data);

                    // ONLY RUNNING PODS
                    const runningPods =
                        json.items.filter(
                            pod =>
                                pod.status.phase === "Running"
                        ).length;

                    res.json({

                        cpu:
                            cpuLoad.toFixed(1) + "%",

                        memory:
                            usedMem.toFixed(1) + "%",

                        pods: runningPods,

                        health:
                            runningPods > 0
                            ? "Healthy"
                            : "Warning"

                    });

                }
                catch(err){

                    res.json({

                        cpu: "N/A",
                        memory: "N/A",
                        pods: "N/A",
                        health: "Unavailable"

                    });

                }

            });

        });

        request.on("error", err => {

            res.json({

                cpu: "N/A",
                memory: "N/A",
                pods: "N/A",
                health: "Unavailable"

            });

        });

        request.end();

    }
    catch(err){

        res.json({

            cpu: "N/A",
            memory: "N/A",
            pods: "N/A",
            health: "Unavailable"

        });

    }

});

// app.get("/api/metrics", async (req, res) => {

//     try{

//         const totalMem = os.totalmem();

//         const freeMem = os.freemem();

//         const usedMem =
//             ((totalMem - freeMem) / totalMem) * 100;

//         const cpuLoad =
//             os.loadavg()[0] * 100;

//         res.json({

//             cpu: cpuLoad.toFixed(1) + "%",

//             memory: usedMem.toFixed(1) + "%",

//             pods: "1",

//             health: "Healthy"

//         });

//     }
//     catch(err){

//         res.json({

//             cpu: "N/A",
//             memory: "N/A",
//             pods: "N/A",
//             health: "Unavailable"

//         });

//     }

// });

// const { exec } = require("child_process");

// app.get("/api/metrics", (req, res) => {

//     exec(
//         "kubectl top nodes --no-headers && kubectl get pods --all-namespaces --field-selector=status.phase=Running --no-headers | wc -l",
//         (error, stdout, stderr) => {

//             if(error){

//                 return res.json({
//                     cpu: "N/A",
//                     memory: "N/A",
//                     pods: 0,
//                     health: "Unavailable"
//                 });
//             }

//             const lines = stdout.trim().split("\n");

//             let cpu = "0%";
//             let memory = "0%";

//             if(lines.length > 0){

//                 const parts =
//                     lines[0].split(/\s+/);

//                 cpu = parts[2] || "0%";
//                 memory = parts[4] || "0%";
//             }

//             const pods =
//                 parseInt(lines[lines.length - 1]) || 0;

//             res.json({
//                 cpu,
//                 memory,
//                 pods,
//                 health: pods > 0 ? "Healthy" : "Warning"
//             });

//         }
//     );
// });

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
