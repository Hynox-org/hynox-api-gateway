const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");
const bodyParser = require("body-parser");
const supabaseAuth = require("./middleware/supabaseAuth");
require("dotenv").config();

const app = express();

// ---------- Middlewares ----------
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ---------- Supabase Auth Middleware ----------
app.use(supabaseAuth);

// ---------- Proxy Routes Without /api in Frontend ----------
app.use(
  "/auth",
  proxy("http://localhost:5000", {
    proxyReqPathResolver: (req) => {
      // Add /api prefix before forwarding to backend
      return `/api${req.originalUrl}`;
    },
  })
);

app.use(
  "/org",
  proxy("http://localhost:5000", {
    proxyReqPathResolver: (req) => {
      return `/api${req.originalUrl}`;
    },
  })
);

// ---------- Test Route ----------
app.get("/", (req, res) => {
  res.json({ msg: "API Gateway active and token verified ✅" });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
