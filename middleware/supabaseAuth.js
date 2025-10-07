// middleware/supabaseAuth.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function supabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // ✅ Grouped data under req.auth
    req.auth = {
      id: user.id,            // Supabase user id
      email: user.email,      // optional if needed
      role: user.user_role,   // your custom role (if stored in metadata)
      token: token,
    };

    next();
  } catch (err) {
    console.error("Supabase Auth Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = supabaseAuth;
