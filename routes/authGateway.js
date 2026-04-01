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
      role = "guest",
      serviceName,
      planId,
    } = req.body;

    if (!email || !password || !serviceName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1️ Create user in Supabase
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

    // 2️ Store user in MongoDB through Auth-Service
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

    // 3️ Auto login to generate token
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

    // 1️ Authenticate with Supabase
    const { data: supabaseData, error: supabaseError } =
      await supabase.auth.signInWithPassword({ email });
      console.log(supabaseData);
    if (supabaseError)
      return res.status(401).json({ message: supabaseError.message });

    const accessToken = supabaseData.session?.access_token;
    const userId = supabaseData.user?.id;
    // 2️ Forward to DB Service for org/service linkage
    const dbResponse = await callDBService("/identity/api/auth/login","POST" ,{
      email,
      password,
      serviceName,
      planId,
      userId,
    });
    
    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: dbResponse.user,
      action: dbResponse.action,
      orgId: dbResponse.orgId,
      service: dbResponse.service,
    });
  } catch (error) {
    console.error("Login Error (Gateway):", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
});

/* ---------------------- VALIDATE TOKEN ---------------------- */
router.post("/validate-token", supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const fullName = req.user.fullname||req.user.email;
    const currentRole = req.user.role;
    console.log(fullName);
    console.log("🔍 Current metadata role:", currentRole);

    /* 1️ checks user role in supabase */
    if (!currentRole || ["user", "authenticated"].includes(currentRole)) {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...req.user.user_metadata, role: "guest" },
      });

      if (metadataError) {
        console.error("⚠️ Error updating user metadata:", metadataError);
      } else {
        console.log(`✅ Updated user metadata for ${email} → role: super_admin`);
      }
    } else {
      console.log(`✅ User already has role: ${currentRole}`);
    }

    /* 2 Sync user to DB microservice */
    const signupRes = await callDBService("/identity/api/auth/signup", "POST", {
      userId,
      fullName,
      email,
      role: "super_admin",
    });

    /* 2 Handle redirection or success */
    if (signupRes?.message === "Signup successful") {
      return res.redirect(signupRes?.action);
    }
    if (signupRes?.message === "User already exists") {
      return res.status(200).json({
        message: "Token is valid",
        action: signupRes.action,
        orgId: signupRes.orgId,
        user: {
          id: signupRes.userId,
          role: signupRes.role,
        },
      });
    }
    res.status(200).json({
      message: "Token is valid",
      orgId: signupRes.orgId,
      user: {
        id: userId,
        role: currentRole,
      },
    });
  } catch (error) {
    const data = error?.data || error?.response?.data;

    if (data?.message === "User already exists") {
      console.log("✅ Existing OAuth user login:", data.email || req.user.email);
      return res.status(200).json({
        message: "Token is valid",
        action: data.action,
        orgId: data.orgId,
        user: {
          id: data.userId || req.user.id,
          role: data.role || "super_admin",
        },
      });
    }

    console.error("Validate Token Error (Gateway):", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
});

// ----------------- Update Profile -----------------
router.put("/update/:userId" , async (req, res) => {

  try {
    const { userId } = req.params;

    const dbResponse = await callDBService(
      `/identity/api/auth/update/${userId}`,
      "PUT",
      req.body
    );

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

// ----------------- Get Users -----------------
router.get("/users", supabaseAuth, async (req, res) => {
  try {
    const dbResponse = await callDBService(`/identity/api/auth/users`, "GET");
    const userData = dbResponse.data || dbResponse; 
    console.log(userData);
    res.status(200).json(userData);
  } catch (err) {
    console.error("Gateway Get User Error:", err.message);
    res.status(500).json({
      message: "Failed to get user",
      details: err.message,
    });
  }
});

// ----------------- Get User by ID -----------------
router.get("/user/:id", supabaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const dbResponse = await callDBService(`/identity/api/auth/user/${id}`, "GET");
    const userData = dbResponse.data || dbResponse; 
    console.log(userData);
    res.status(200).json(userData);
  } catch (err) {
    console.error("Gateway Get User by ID Error:", err.message);
    res.status(500).json({
      message: "Failed to get user",
      details: err.message,
    });
  }
});

// ----------------- Set Password -----------------
router.put("/setpassword",supabaseAuth, async (req, res) => {
  try{
    const dbResponse = await callDBService(`/identity/api/auth/setpassword`, "PUT", req.body);
    res.status(200).json({
      message: "Password set successfully",
    });
  }catch (err) {
    console.error("Gateway Set Password Error:", err.message);
    res.status(500).json({
      message: "Failed to set password",
      details: err.message,
    });
  }
});

module.exports = router;
