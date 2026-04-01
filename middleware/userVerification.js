// middleware/userVerification.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function userVerification(req, res, next) {
  try {
    const { email ,fullName,role,orgId} = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // ✅ Step 1: Fetch user list from Supabase
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("Supabase user fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    const user = data?.users?.find((u) => u.email === email);
    let userState = "";
    let redirectLink = "";

    // ✅ Step 2: Determine user state
    if (!user) {
      userState = "new_user";
      redirectLink = `${process.env.CRM_FRONTEND}/auth/createAccount?email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&role=${encodeURIComponent(role)}&orgId=${encodeURIComponent(orgId)}`;
    } else {
      // Optionally check if the user has active session
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user.email === email) {
        userState = "existing_user_logged_in";
        redirectLink = `${process.env.CRM_FRONTEND}/crm/invite/accept?email=${encodeURIComponent(email)}`;
      } else {
        userState = "existing_user_not_logged_in";
        redirectLink = `${process.env.CRM_FRONTEND}/auth/createAccount?email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&role=${encodeURIComponent(role)}&orgId=${encodeURIComponent(orgId)}`;
      }
    }

    // ✅ Attach results to request for next handler
    req.userState = userState;
    req.redirectLink = redirectLink;
    next();
  } catch (err) {
    console.error("User Verification Error:", err);
    res.status(500).json({ error: "Internal error in user verification" });
  }
}

module.exports = userVerification;
