const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");
const bodyParser = require("body-parser");
const supabaseAuth = require("./middleware/supabaseAuth");
const authGateway = require("./routes/authGateway");
const orgGateway = require("./routes/orgGateway");
require("dotenv").config();
const helmet = require("helmet");
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [process.env.CRM_FRONTEND],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Public routes (skip auth)
const publicRoutes = [
  "/identity/api/auth/signup",
  "/identity/api/auth/login",
];

app.use((req, res, next) => {
  if (publicRoutes.includes(req.path)) return next();
  return supabaseAuth(req, res, next);
});

app.use("/identity/api/auth", authGateway);
app.use("/identity/api/org", orgGateway);

// ---------- CRM Proxy ----------
app.use(
  "/crm",
  (req, res, next) => {
    // Ensure auth before proxying
    return supabaseAuth(req, res, () => {
      // attach user info for downstream service
      if (req.user) {
  req.headers["x-user-id"] = req.user.id;
  req.headers["x-user-role"] = req.user.role; // <-- use req.user.role
  req.headers["x-user-token"] = req.user.token;
}

      next();
    });
  },
  proxy(process.env.CRM_SERVICE, {
    proxyReqPathResolver: (req) => {
      // Keep full original path
      return req.originalUrl;
    },
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Headers are already attached above
      return proxyReqOpts;
    },
  })
);

// Root route
app.get("/", (req, res) => res.json({ msg: "🚀 API Gateway running" }));

app.listen(process.env.PORT, () =>
  console.log("✅ API Gateway started")
);
