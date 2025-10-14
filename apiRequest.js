const axios = require("axios");

const DB_SERVICE_URL = process.env.AUTH_SERVICE;
async function callDBService(endpoint, method, data) {
  try {
    const url = `${DB_SERVICE_URL}${endpoint}`;
console.log("➡️ Forwarding to:", url); // add this
    console.log("📦 Payload:", data);
    const options = {
      method: method.toLowerCase(),
      url,
      timeout: 10000, // prevent infinite hang (10s)
    };

    // Attach body only for non-GET requests
    if (method.toLowerCase() !== "get") {
      options.data = data;
    }

    const res = await axios(options);
    return res.data;
  } catch (err) {
    console.error("DB Service Error:", err.response?.data || err.message);
    throw err.response?.data || { message: "DB service error" };
  }
}

module.exports = { callDBService };
