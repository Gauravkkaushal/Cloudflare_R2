const { randomUUID } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { GetObjectCommand, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:4200",
]);

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const SIGNED_URL_EXPIRES_IN_SECONDS = 3000;

function setCorsHeaders(req, res) {
  const origin = req.get("origin");

  if (ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getR2Client() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY_ID,
  } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY_ID) {
    throw new Error("Missing one or more required R2 environment variables.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY_ID,
    },
  });
}

async function verifyFirebaseToken(req) {
  const authHeader = req.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No token provided");
  }

  const idToken = authHeader.slice("Bearer ".length);
  const decodedToken = await getAuth().verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name,
  };
}

exports.createPresignedUploadUrl = onRequest(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let user;

  try {
    user = await verifyFirebaseToken(req);
  } catch (error) {
    logger.warn("Token verification failed", { message: error.message });
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const { fileName, fileType, fileSize } = req.body || {};
    const numericFileSize = Number(fileSize);

    if (!fileName || !fileType || !Number.isFinite(numericFileSize)) {
      res.status(400).json({ error: "fileName, fileType, and fileSize are required" });
      return;
    }

    if (!ALLOWED_TYPES[fileType]) {
      res.status(400).json({ error: "File type not allowed" });
      return;
    }

    if (numericFileSize > MAX_FILE_SIZE) {
      res.status(400).json({ error: "File size exceeds 100MB limit" });
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const ext = ALLOWED_TYPES[fileType];
    const objectKey = `uploads/${user.uid}/${year}/${month}/${day}/${randomUUID()}.${ext}`;
    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("Missing required R2_BUCKET_NAME environment variable.");
    }

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(r2Client, uploadCommand, {
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    });

    const viewCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const viewUrl = await getSignedUrl(r2Client, viewCommand, {
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    });

    res.status(200).json({
      uploadUrl,
      viewUrl,
      objectKey,
    });
  } catch (error) {
    logger.error("Failed to generate upload URL", { message: error.message });
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});
