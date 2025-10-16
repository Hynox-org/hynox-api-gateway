const axios = require("axios");

const DB_SERVICE_URL = process.env.AUTH_SERVICE;
async function callDBService(endpoint, method, data) {
  try {
    const url = `${DB_SERVICE_URL}${endpoint}`;

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

    // ✅ Normalize error and rethrow with proper structure
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "DB service error";

    // Make it a real Error object so gateway can read err.message
    const error = new Error(message);
    error.status = err.response?.status || 500;
    error.data = err.response?.data || {};
    throw error;
  }
}

module.exports = { callDBService };
