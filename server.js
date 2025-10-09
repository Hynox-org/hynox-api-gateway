// server.js
const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");
const bodyParser = require("body-parser");
const supabaseAuth = require("./middleware/supabaseAuth");
require("dotenv").config();

const app = express();

// ---------------- MIDDLEWARE SETUP ----------------
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["process.env.CRM_FRONTEND"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ---------------- PUBLIC ROUTES ----------------
// These routes do NOT require authentication
const publicRoutes = [
  "/identity/api/auth/signup",
  "/identity/api/auth/login",
];

// ---------------- AUTH CHECK ----------------
app.use((req, res, next) => {
  // Skip Supabase auth for public routes
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // For all other routes, verify user via Supabase
  return supabaseAuth(req, res, next);
});

// ---------------- PROXY SETUP ----------------
// Single proxy for all identity-based routes
app.use(
  "/identity",
  proxy("process.env.AUTH_SERVICE", {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Forward user details if authenticated
      if (srcReq.auth) {
        proxyReqOpts.headers["x-user-id"] = srcReq.auth.id;
        proxyReqOpts.headers["x-user-role"] = srcReq.auth.role || "";
        proxyReqOpts.headers["x-user-token"] = srcReq.auth.token;
      }
      return proxyReqOpts;
    },
    // Preserve backend path structure
    proxyReqPathResolver: (req) => `/identity${req.url}`,
  })
);

// ---------------- ROOT ROUTE ----------------
app.get("/", (req, res) => {
  res.json({ msg: " API Gateway active and routing requests correctly ✅" });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(` API Gateway running on port ${PORT}`);
});
