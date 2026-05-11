const express = require('express');
const path = require('path');
const fs = require('fs');

const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 8080;

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'visitors.db');

const { spawn } = require("child_process");

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
    email TEXT,
    authMethod TEXT,
    url TEXT,
    userAgent TEXT,
    platform TEXT,
    language TEXT,
    referrer TEXT,
    timestamp TEXT
  )
`).run();

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
      email = '',
      authMethod = 'anonymous',
      url = '/',
      userAgent = '',
      platform = '',
      language = ''
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
        email,
        authMethod,
        url,
        userAgent,
        platform,
        language,
        referrer,
        timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      ip,
      username,
      email,
      authMethod,
      url,
      userAgent,
      platform,
      language,
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
      db.prepare(
        'SELECT COUNT(DISTINCT ip) AS uniqueIps FROM visitors'
      ).get();

    const rows =
      db.prepare(`
        SELECT
          ip,
          username,
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

const os = require("os");
const { exec } = require("child_process");

app.get("/stream/*", (req, res)=>{

    try{

        const file =
            decodeURIComponent(
                req.path.replace("/stream/","")
            );

        const filePath =
            path.normalize(
                path.join(MEDIA_DIR, file)
            );

        if (!filePath.startsWith(MEDIA_DIR)) {

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

    const totalMem = os.totalmem();

    const freeMem = os.freemem();

    const usedMem =
        ((totalMem - freeMem) / totalMem) * 100;

    const cpuLoad =
        (os.loadavg()[0] / os.cpus().length) * 100;

    const command = `
    TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

    PODS=$(curl -s -k \
    --header="Authorization: Bearer $TOKEN" \
    https://kubernetes.default.svc/api/v1/pods)

    DISK=$(df -h / | tail -1)

    echo "===PODS==="
    echo "$PODS"

    echo "===DISK==="
    echo "$DISK"
    `;

    exec(
        command,
        {
            timeout: 15000,
            maxBuffer: 1024 * 1024
        },

        (error, stdout, stderr) => {  

        if(error){

            console.log("K8S API ERROR:", error);

            console.log("STDERR:", stderr);

            console.log("STDOUT:", stdout);

            return res.json({

                cpu:
                    cpuLoad.toFixed(1) + "%",

                memory:
                    usedMem.toFixed(1) + "%",

                pods: "0",

                diskTotal: "N/A",

                diskUsed: "N/A",

                diskFree: "N/A",

                diskUsage: "N/A",

                health: "Standalone Mode"
            });
        }

        try{

            // ===============================
            // SPLIT OUTPUT
            // ===============================

            const podSection =
                (stdout.split("===DISK===")[0] || "")
                .replace("===PODS===","")
                .trim();

            const diskSection =
                (stdout.split("===DISK===")[1] || "")
                .trim();

            // ===============================
            // PODS
            // ===============================

            // const data = JSON.parse(podSection);
            let data = { items: [] };

            if (
                podSection &&
                podSection.startsWith("{") &&
                podSection.endsWith("}")
            ) {

                try {

                    data = JSON.parse(podSection);

                } catch(parseErr) {

                    console.log(
                        "INVALID POD JSON:",
                        parseErr.message
                    );

                }

            } else {

                console.log(
                    "EMPTY OR INCOMPLETE POD JSON"
                );

            }

            const runningPods =
                (data.items || []).filter(
                    pod =>
                        pod?.status?.phase === "Running"
                ).length;

            // ===============================
            // DISK
            // ===============================
            
            console.log("DISK SECTION:", diskSection);

            const diskParts =
                diskSection.trim().split(/\s+/);

            console.log("DISK PARTS:", diskParts);

            const diskTotal =
                diskParts[1] || "N/A";

            const diskUsed =
                diskParts[2] || "N/A";

            const diskFree =
                diskParts[3] || "N/A";

            const diskUsage =
                diskParts[4] || "N/A";

            // ===============================
            // RESPONSE
            // ===============================

            res.json({

                cpu:
                    cpuLoad.toFixed(1) + "%",

                memory:
                    usedMem.toFixed(1) + "%",

                pods: runningPods,

                diskTotal,

                diskUsed,

                diskFree,

                diskUsage,

                health:
                    runningPods > 0
                    ? "Healthy"
                    : "Warning"

            });

        }
        catch(err){

            console.log("JSON PARSE ERROR:", err);

            res.json({

                cpu: "N/A",

                memory: "N/A",

                pods: "N/A",

                diskTotal: "N/A",

                diskUsed: "N/A",

                diskFree: "N/A",

                diskUsage: "N/A",

                health: "Unavailable"

            });

        }

    });

});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
