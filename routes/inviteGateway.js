// routes/inviteGateway.js
const express = require("express");
const userVerification = require("../middleware/userVerification");
const router = express.Router();

router.post("/", userVerification, async (req, res) => {
  try {
    const { email} = req.body;
    const { userState, redirectLink } = req;

    // Perform your internal logic here (like sending email)
    console.log("Invite received for:", email);

    // Example dummy response
    return res.status(200).json({
      message: "Invite successfully processed at gateway",
      email,
      userState,
      redirectLink
    });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
