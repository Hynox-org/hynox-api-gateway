// api-gateway/routes/authGateway.js
const express = require("express");
const router = express.Router();
const supabaseAuth = require("../middleware/supabaseAuth");
const { callDBService } = require("../apiRequest");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/* ---------------------- SIGNUP ---------------------- */
router.post("/signup", async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      countryCode,
      phoneNumber,
      role = "super_admin",
      serviceName,
      planId,
    } = req.body;

    if (!email || !password || !serviceName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1️⃣ Create user in Supabase
    const { data: supabaseData, error: supabaseError } =
      await supabase.auth.signUp({
        email,
        password,
        options: { data: { fullName, role } },
      });

    if (supabaseError) {
      return res.status(400).json({ message: supabaseError.message });
    }

    const userId = supabaseData.user?.id;
    if (!userId)
      return res.status(500).json({ message: "User ID not returned from Supabase" });

    // 2️⃣ Store user in MongoDB through Auth-Service
    const dbResponse = await callDBService("/identity/api/auth/signup", "POST" ,{
      userId,
      fullName,
      email,
      password,
      countryCode,
      phoneNumber,
      serviceName,
      planId,
      role,
    });

    // 3️⃣ Auto login to generate token
    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (loginError) return res.status(400).json({ error: loginError.message });

    const accessToken = loginData?.session?.access_token;

    res.status(201).json({
      message: "Signup successful",
      supabaseUser: supabaseData.user,
      accessToken,
      dbUser: dbResponse.user || null,
      nextStep: "Setup Organization",
    });
  } catch (error) {
    console.error("Signup Error (Gateway):", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
});

/* ---------------------- LOGIN ---------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password, serviceName, planId } = req.body;
    
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    // 1️⃣ Authenticate with Supabase
    const { data: supabaseData, error: supabaseError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (supabaseError)
      return res.status(401).json({ message: supabaseError.message });

    const token = supabaseData.session?.access_token;
    const userId = supabaseData.user?.id;
    // 2️⃣ Forward to DB Service for org/service linkage
    const dbResponse = await callDBService("/identity/api/auth/login","POST" ,{
      email,
      password,
      serviceName,
      planId,
      userId,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      dbUser: dbResponse.user,
      action: dbResponse.action,
      orgDetails: dbResponse.org,
    });
  } catch (error) {
    console.error("Login Error (Gateway):", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
});

/* ---------------------- VALIDATE TOKEN ---------------------- */
router.post("/validate-token", supabaseAuth(), async (req, res) => {
  try {
    // If the middleware successfully validated the token,
    // req.auth will contain the user information.
    // We can simply return a success response.
    res.status(200).json({
      message: "Token is valid",
      user: {
        id: req.auth.id,
        role: req.auth.role,
      },
    });
  } catch (error) {
    console.error("Validate Token Error (Gateway):", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
});

// ----------------- Update Profile -----------------
router.put("/update/:userId", supabaseAuth() , async (req, res) => {

  try {
    const { userId } = req.params;
    console.log("Request body:", req.body);

    const dbResponse = await callDBService(
      `/identity/api/auth/update/${userId}`,
      "PUT",
      req.body
    );
    console.log("✅ Got DB response:", dbResponse);

    res.status(200).json({
      message: "Profile updated successfully",
      dbResponse,
    });
  } catch (err) {
    console.error("Gateway Edit profile Error:", err.message);
    res.status(500).json({
      message: "Failed to update the profile",
      details: err.message,
    });
  }
});


/* ---------------------- OAUTH LOGIN ---------------------- */
router.get("/oauth/login/:provider", async (req, res) => {
  try {
    const { provider } = req.params;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: process.env.SUPABASE_OAUTH_REDIRECT_URL || "http://localhost:3000/auth/callback", // Replace with your actual redirect URL
      },
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.status(200).json({
      message: "OAuth login initiated",
      url: data.url,
    });
  } catch (error) {
    console.error("OAuth Login Error (Gateway):", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
});

module.exports = router;
