const { randomUUID } = require("node:crypto");

const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");

const { UPLOAD_URL_TTL_SECONDS, MAX_UPLOADS_PER_USER } = require("../constants/upload.const");
const { getR2Config } = require("../config/runtime.config");
const { buildObjectKey, createSignedUploadUrl } = require("../services/r2.service");
const { countUserUploads, createUploadRecord, markUploadComplete } = require("../services/upload-record.service");
const { validateUploadRequest } = require("../utils/validation.util");

const corsMiddleware = cors({ origin: true });

async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!idToken) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Missing Bearer token" } });
    return null;
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Invalid or expired token" } });
    return null;
  }
}

function withCors(handler) {
  return onRequest((req, res) => {
    corsMiddleware(req, res, () => handler(req, res));
  });
}

const getUploadUrl = withCors(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } });
  }

  const uid = await verifyAuth(req, res);
  if (!uid) return;

  const { fileName, fileType, fileSize } = req.body;

  const validationError = validateUploadRequest({ fileName, fileType, fileSize });
  if (validationError) {
    return res.status(400).json({ error: { code: "INVALID_REQUEST", message: validationError } });
  }

  const uploadCount = await countUserUploads(uid);
  if (uploadCount >= MAX_UPLOADS_PER_USER) {
    return res.status(429).json({
      error: { code: "LIMIT_REACHED", message: `Maximum of ${MAX_UPLOADS_PER_USER} uploads allowed` },
    });
  }

  const uploadId = randomUUID();
  const objectKey = buildObjectKey({ uid, fileType, uploadId });

  await createUploadRecord({ uploadId, uid, objectKey, fileName, fileType, fileSize });

  const uploadUrl = await createSignedUploadUrl({ objectKey, fileType });

  return res.status(200).json({ uploadId, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS });
});

const finalizeUpload = withCors(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } });
  }

  const uid = await verifyAuth(req, res);
  if (!uid) return;

  const { uploadId } = req.body;
  if (!uploadId || typeof uploadId !== "string") {
    return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "uploadId is required" } });
  }

  let record;
  try {
    record = await markUploadComplete({ uid, uploadId });
  } catch (err) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: err.message } });
  }

  const { accountId, bucketName } = getR2Config();
  const viewUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${record.objectKey}`;

  return res.status(200).json({ objectKey: record.objectKey, viewUrl });
});

module.exports = { getUploadUrl, finalizeUpload };
