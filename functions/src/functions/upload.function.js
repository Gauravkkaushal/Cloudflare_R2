const { onRequest } = require("firebase-functions/https");

const { ALLOWED_ORIGINS } = require("../constants/upload.const");
const loggingService = require("../services/logging.service");
const { issueUploadUrl } = require("../services/upload.service");
const { parseAuthProfile } = require("../utils/auth.util");
const { AppError, sendErrorResponse } = require("../utils/error.util");
const { validateUploadRequest } = require("../utils/validation.util");

function setCorsHeaders(req, res) {
  const origin = req.get("origin");

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

const createPresignedUploadUrl = onRequest(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    sendErrorResponse(
      res,
      new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED"),
      "Method not allowed",
    );
    return;
  }

  let user;

  try {
    user = await parseAuthProfile(req);
  } catch (error) {
    loggingService.warn("Token verification failed", { message: error.message });
    sendErrorResponse(res, error, "Invalid or expired token");
    return;
  }

  try {
    const request = validateUploadRequest(req.body);
    const response = await issueUploadUrl({ user, request });

    res.status(200).json(response);
  } catch (error) {
    loggingService.error("Failed to generate upload URL", {
      message: error.message,
      uid: user.uid,
    });
    sendErrorResponse(res, error, "Failed to generate upload URL");
  }
});

module.exports = {
  createPresignedUploadUrl,
  setCorsHeaders,
};
