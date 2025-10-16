// api-gateway/routes/orgGateway.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { callDBService } = require("../apiRequest");
const roleAuth = require("../middleware/roleAuth");

// Initialize Supabase service role client (admin)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ---------------------- SETUP ORGANIZATION ---------------------- */
router.post("/setup", roleAuth(["super_admin"]), async (req, res) => {
  try {
    const { orgName, empCount, serviceName } = req.body;
    const {  id:userId, role } = req.user;

    // Forward org creation to Auth-Service (DB operation only)
    const dbResponse = await callDBService("/identity/api/org/setup", "POST", {
      userId,
      orgName,
      empCount,
      serviceName,
      role,
    });

    res.status(201).json({
      message: "Organization setup completed successfully",
      org: dbResponse.org,
      user: dbResponse.user,
    });
  } catch (err) {
    console.error("Gateway Org Setup Error:", err.message);

    // 🧠 Check if downstream provided custom error JSON
    if (err.response && err.response.status) {
      const status = err.response.status || 500;
      const data = await err.response.json().catch(() => ({}));
      return res
        .status(status)
        .json({ message: data.message || data.error || "Organization setup failed" });
    }

    // ✅ Default fallback
    res.status(500).json({
      message: err.message || "Organization setup failed",
    });
  }
});

/* ---------------------- ASSIGN USER UNDER ORG ---------------------- */
router.post("/assign-user", roleAuth(["super_admin"]), async (req, res) => {
  try {
    const { fullName, email, password, countryCode, phoneNumber, orgId, role } = req.body;

    // 1️⃣ Create user in Supabase (admin-level)
    const { data: supabaseData, error: supabaseError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { role },
      });

    if (supabaseError)
      return res.status(400).json({ message: supabaseError.message });

    const userId = supabaseData.user?.id;
    if (!userId)
      return res.status(500).json({ message: "User ID missing from Supabase" });

    // 2️⃣ Save in Auth-Service (MongoDB)
    const dbResponse = await callDBService("/identity/api/org/assign-user", "POST", {
      userId,
      fullName,
      email,
      password,
      countryCode,
      phoneNumber,
      orgId,
      role,
    },
     
    );

    res.status(201).json({
      message: "User assigned to organization successfully",
      dbResponse,
    });
  } catch (error) {
    console.error("Assign User Error (Gateway):", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
});
/* ---------------------- EDIT ORGANIZATION ---------------------- */
router.put("/:orgId", roleAuth(["super_admin"]), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { orgName, roles } = req.body;

    // Forward PUT request to backend
    const dbResponse = await callDBService(`/identity/api/org/${orgId}`, "PUT", {
      orgName,
      roles,
    });

    res.status(200).json({
      message: "Organization updated successfully",
      dbResponse,
    });
  } catch (err) {
    console.error("Gateway Edit Org Error:", err.message);
    res.status(500).json({
      message: "Failed to update organization",
      details: err.message,
    });
  }
});

/* ---------------------- GET ORGANIZATION DETAILS ---------------------- */
router.get("/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;
    const dbResponse = await callDBService(`/identity/api/org/${orgId}` , "GET");
    res.status(200).json(dbResponse);
  } catch (err) {
    console.error("Gateway Get Org Error:", err.message);
    res.status(500).json({ message: "Failed to fetch organization", details: err.message });
  }
});

module.exports = router;
