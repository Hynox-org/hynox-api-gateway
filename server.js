const express = require("express");
const cors = require("cors");
// const proxy = require("express-http-proxy");
const bodyParser = require("body-parser");
const supabaseAuth = require("./middleware/supabaseAuth");
const authGateway = require("./routes/authGateway");
const orgGateway = require("./routes/orgGateway");
require("dotenv").config();

const app = express();

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
  "/identity/api/auth/validate-token",
  /^\/identity\/api\/auth\/oauth\/login\/.+$/, // Regex for OAuth login with provider
];

app.use((req, res, next) => {
  const isPublicRoute = publicRoutes.some(route => {
    if (typeof route === 'string') {
      return route === req.path;
    }
    return route.test(req.path);
  });

  if (isPublicRoute) return next();
  return supabaseAuth()(req, res, next);
});

app.use("/identity/api/auth", authGateway);
app.use("/identity/api/org", orgGateway);

// Root route
app.get("/", (req, res) => res.json({ msg: "🚀 API Gateway running" }));

app.listen(process.env.PORT, () =>
  console.log("✅ API Gateway started")
);
