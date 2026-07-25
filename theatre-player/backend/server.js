import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import passport from "./passport.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=================================");
console.log("Starting Express Server...");
console.log("PORT:", process.env.PORT);
console.log("CLIENT_URL:", process.env.CLIENT_URL);
console.log("DIST PATH:", path.join(__dirname, "../dist"));
console.log("=================================");

// Log every incoming request
app.use((req, res, next) => {
    console.log(`\n>>> ${req.method} ${req.url}`);
    next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "https://static.cloudflareinsights.com"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https:"
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:"
        ],

        mediaSrc: [
          "'self'",
          "blob:"
        ],

        fontSrc: [
          "'self'",
          "https:",
          "data:"
        ],

        connectSrc: [
          "'self'",
          "blob:",
          "https://static.cloudflareinsights.com"
        ],

        objectSrc: ["'none'"],

        baseUri: ["'self'"],

        frameAncestors: ["'self'"],

        upgradeInsecureRequests: [],
      },
    },
  })
);


// Helmet
//app.use(helmet());
console.log("✓ Helmet loaded");

// CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);
console.log("✓ CORS loaded");

// JSON
app.use(express.json());
console.log("✓ Express JSON loaded");

// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "debug-secret",
        resave: false,
        saveUninitialized: false,
    })
);
console.log("✓ Session loaded");

// Passport
app.use((req, res, next) => {
    console.log("Before passport.initialize()");
    next();
});

app.use(passport.initialize());

app.use((req, res, next) => {
    console.log("After passport.initialize()");
    next();
});

app.use(passport.session());

app.use((req, res, next) => {
    console.log("After passport.session()");
    next();
});

// Auth Routes
app.use("/auth", authRoutes);

app.use((req, res, next) => {
    console.log("After auth routes");
    next();
});

// Static files
const distPath = path.join(__dirname, "../dist");

console.log("Serving static files from:", distPath);

app.use(express.static(distPath));

// Root Route
app.get("/", (req, res) => {
    console.log("Inside GET /");

    const indexFile = path.join(distPath, "index.html");

    console.log("Sending:", indexFile);

    res.sendFile(indexFile, (err) => {
        if (err) {
            console.error("sendFile ERROR:", err);
            res.status(500).send(err.message);
        } else {
            console.log("index.html sent successfully");
        }
    });
});

// React Router fallback
app.get(/^\/(?!auth).*/, (req, res) => {
    console.log("React fallback:", req.url);

    const indexFile = path.join(distPath, "index.html");

    res.sendFile(indexFile, (err) => {
        if (err) {
            console.error("Fallback sendFile ERROR:", err);
            res.status(500).send(err.message);
        } else {
            console.log("Fallback index.html sent");
        }
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Express Error:");
    console.error(err);

    res.status(500).send(err.message);
});

// Start server
app.listen(process.env.PORT || 5000, () => {
    console.log("\n=================================");
    console.log(`Server running on port ${process.env.PORT || 5000}`);
    console.log("=================================\n");
});
