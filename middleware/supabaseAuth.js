// middleware/supabaseAuth.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function supabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verify token and get user info
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach user info for downstream use
    req.user = {
      id: user.id,
      email: user.email,
      fullname: user.user_metadata?.name || user.user_metadata?.full_name,
      role: user.user_metadata?.role?.toLowerCase().trim() || "user",
      token,
    };

    next();
  } catch (err) {
    console.error("Supabase Auth Error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
}

module.exports = supabaseAuth;
