const { randomUUID } = require("node:crypto");
const {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const {
  ALLOWED_TYPES,
  SIGNED_URL_EXPIRES_IN_SECONDS,
  UPLOAD_PATH_PREFIX,
} = require("../constants/upload.const");
const { AppError } = require("../utils/error.util");

function getR2Client() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY_ID,
  } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY_ID) {
    throw new AppError(
      "R2 storage is not configured",
      500,
      "R2_CONFIG_MISSING",
    );
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

function getBucketName() {
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!bucketName) {
    throw new AppError("R2 bucket is not configured", 500, "R2_BUCKET_MISSING");
  }

  return bucketName;
}

function buildObjectKey({ uid, fileType, now = new Date() }) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const extension = ALLOWED_TYPES[fileType];

  return `${UPLOAD_PATH_PREFIX}/${uid}/${year}/${month}/${day}/${randomUUID()}.${extension}`;
}

async function createSignedUploadUrls({ objectKey, fileType }) {
  const bucketName = getBucketName();
  const r2Client = getR2Client();

  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: fileType,
  });

  const viewCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  const [uploadUrl, viewUrl] = await Promise.all([
    getSignedUrl(r2Client, uploadCommand, {
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    }),
    getSignedUrl(r2Client, viewCommand, {
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    }),
  ]);

  return {
    uploadUrl,
    viewUrl,
    objectKey,
  };
}

module.exports = {
  buildObjectKey,
  createSignedUploadUrls,
  getBucketName,
  getR2Client,
};
