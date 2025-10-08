// server.js
const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");
const bodyParser = require("body-parser");
const supabaseAuth = require("./middleware/supabaseAuth");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Supabase authentication middleware (runs for all requests)
app.use(supabaseAuth);

// ✅ Single proxy for all /identity requests
app.use(
  "/identity",
  proxy("http://localhost:5000", {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Add Supabase user info headers
      if (srcReq.auth) {
        proxyReqOpts.headers["x-user-id"] = srcReq.auth.id;
        proxyReqOpts.headers["x-user-role"] = srcReq.auth.role || "";
        proxyReqOpts.headers["x-user-token"] = srcReq.auth.token;
      }
      return proxyReqOpts;
    },

    // Dynamically build backend path
    // Incoming:  /identity/auth/login
    // Goes to:   http://localhost:5000/identity/api/auth/
    proxyReqPathResolver: (req) => {
      const path = req.originalUrl; // e.g., /identity/auth/login
      return `/identity/api${path.replace(/^\/identity/, "")}`;
    },
  })
);

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ msg: "API Gateway active and token verified ✅" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
