// middleware/supabaseAuth.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Middleware: Verify Supabase token
async function supabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach the user to the request (for downstream usage)
    req.user = user;
    next(); // proceed to next middleware or route
  } catch (err) {
    console.error("Supabase Auth Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = supabaseAuth;
