// api-gateway/apiRequest.js
const axios = require("axios");

const DB_SERVICE_URL = process.env.AUTH_SERVICE || "http://localhost:5000";

/**
 * Generic function to call downstream microservices (Auth / CRM / etc.)
 * @param {string} endpoint - API path (like "/identity/api/auth/signup")
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {object} [data={}] - Request body (if applicable)
 * @param {object} [headers={}] - Optional custom headers (like Authorization)
 */
async function callDBService(endpoint, method = "GET", data = {}, headers = {}) {
  try {
    // Construct full URL
    const url = `${DB_SERVICE_URL}${endpoint}`;

    const config = {
      method: method.toLowerCase(),
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers, // Allow dynamic headers like Authorization
      },
      timeout: 10000, // ⏱ Prevent hanging requests
    };

    // Attach body for non-GET requests
    if (method.toLowerCase() !== "get") {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (err) {
    console.error("❌ DB Service Error:", err.response?.data || err.message);

    // Normalize error for consistent handling in Gateway routes
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "DB Service Error";

    const error = new Error(message);
    error.status = err.response?.status || 500;
    error.data = err.response?.data || {};
    throw error;
  }
}

module.exports = { callDBService };
