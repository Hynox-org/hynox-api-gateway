// middleware/supabaseAuth.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function supabaseAuth(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      // Verify the token
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      console.log(user);
      if (error || !user) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const role = user.user_metadata?.role?.toLowerCase().trim();
      const userId = user.id;

      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return res.status(403).json({
          error: `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
        });
      }

      // Attach auth info for downstream routes
      req.auth = {
        id: userId,
        role,
        token,
      };
      next();
    } catch (err) {
      console.error("Supabase Auth Error:", err);
      res.status(500).json({ error: "Internal server error during authentication" });
    }
  };
}

module.exports = supabaseAuth;
