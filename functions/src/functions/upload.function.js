const { onRequest } = require("firebase-functions/https");

const { ALLOWED_ORIGINS } = require("../config/runtime.config");
const loggingService = require("../services/logging.service");
const { finalizeUpload, issueUploadUrl } = require("../services/upload.service");
const { parseAuthProfile } = require("../utils/auth.util");
const { AppError, sendErrorResponse } = require("../utils/error.util");
const {
  validateFinalizeUploadRequest,
  validateUploadRequest,
} = require("../utils/validation.util");

function setCorsHeaders(req, res) {
  const origin = req.get("origin");

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");
}

function assertOriginAllowed(req) {
  const origin = req.get("origin");

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    throw new AppError("Origin is not allowed", 403, "CORS_ORIGIN_DENIED", null, {
      appErrorKey: "PERMISSION_DENIED",
    });
  }
}

function createUploadHandler(action) {
  return onRequest(async (req, res) => {
    const startedAt = Date.now();
    setCorsHeaders(req, res);

    try {
      assertOriginAllowed(req);
    } catch (error) {
      sendErrorResponse(res, error, "Request origin is not allowed");
      return;
    }

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
      loggingService.warn("auth.token_verification_failed", {
        durationMs: Date.now() - startedAt,
        error: loggingService.serializeError(error),
      });
      sendErrorResponse(res, error, "Invalid or expired token");
      return;
    }

    try {
      const response = await action({ req, user, startedAt });
      res.status(200).json(response);
    } catch (error) {
      const severity = error.statusCode && error.statusCode < 500 ? "warn" : "error";

      loggingService[severity]("upload.request_failed", {
        uid: user.uid,
        durationMs: Date.now() - startedAt,
        error: loggingService.serializeError(error),
      });
      sendErrorResponse(res, error, "Upload request failed");
    }
  });
}

const createPresignedUploadUrl = createUploadHandler(async ({ req, user, startedAt }) => {
  const request = validateUploadRequest(req.body);
  const response = await issueUploadUrl({ user, request });

  loggingService.info("upload.request_succeeded", {
    uid: user.uid,
    uploadId: response.uploadId,
    durationMs: Date.now() - startedAt,
    contentType: request.fileType,
    sizeBytes: request.fileSize,
  });

  return response;
});

const finalizeUploadRequest = createUploadHandler(async ({ req, user, startedAt }) => {
  const request = validateFinalizeUploadRequest(req.body);
  const response = await finalizeUpload({ user, request });

  loggingService.info("upload.finalize_succeeded", {
    uid: user.uid,
    uploadId: request.uploadId,
    durationMs: Date.now() - startedAt,
  });

  return response;
});

module.exports = {
  createPresignedUploadUrl,
  finalizeUploadRequest,
  setCorsHeaders,
};
