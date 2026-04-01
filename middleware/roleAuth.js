// middleware/roleAuth.js
function roleAuth(allowedRoles = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { role } = req.user;

      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return res.status(403).json({
          error: `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
        });
      }

      next();
    } catch (err) {
      console.error("Role Auth Error:", err);
      res.status(500).json({ error: "Internal server error during role check" });
    }
  };
}

module.exports = roleAuth;
