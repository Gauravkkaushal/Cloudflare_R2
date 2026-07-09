const {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const {
  ALLOWED_UPLOAD_TYPES,
  UPLOAD_PREFIX,
  UPLOAD_URL_TTL_SECONDS,
  VIEW_URL_TTL_SECONDS,
} = require("../config/runtime.config");
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
  return buildObjectKeyForUpload({
    uid,
    fileType,
    uploadId: require("node:crypto").randomUUID(),
    now,
  });
}

function buildObjectKeyForUpload({ uid, fileType, uploadId, now = new Date() }) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const extension = ALLOWED_UPLOAD_TYPES[fileType];

  return `${UPLOAD_PREFIX}/${uid}/${year}/${month}/${day}/${uploadId}.${extension}`;
}

async function createSignedViewUrl({ objectKey, expiresInSeconds = VIEW_URL_TTL_SECONDS }) {
  const bucketName = getBucketName();
  const r2Client = getR2Client();

  const viewCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  return getSignedUrl(r2Client, viewCommand, {
    expiresIn: expiresInSeconds,
  });
}

async function createSignedUploadUrls({ objectKey, fileType }) {
  const bucketName = getBucketName();
  const r2Client = getR2Client();

  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: fileType,
  });

  const [uploadUrl, viewUrl] = await Promise.all([
    getSignedUrl(r2Client, uploadCommand, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    }),
    createSignedViewUrl({ objectKey }),
  ]);

  return {
    uploadUrl,
    viewUrl,
    objectKey,
  };
}

async function getObjectMetadata({ objectKey }) {
  const bucketName = getBucketName();
  const r2Client = getR2Client();

  try {
    const object = await r2Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );

    return {
      objectKey,
      contentLength: object.ContentLength ?? null,
      contentType: object.ContentType ?? null,
      etag: object.ETag ?? null,
      lastModified: object.LastModified ?? null,
    };
  } catch (error) {
    const statusCode = error?.$metadata?.httpStatusCode;

    if (statusCode === 404) {
      throw new AppError(
        "Uploaded object was not found",
        404,
        "UPLOAD_OBJECT_NOT_FOUND",
        null,
        {
          appErrorKey: "NOT_FOUND",
        },
      );
    }

    throw new AppError(
      "Failed to verify uploaded object",
      502,
      "UPLOAD_OBJECT_VERIFICATION_FAILED",
      null,
      {
        appErrorKey: "UPSTREAM_STORAGE_ERROR",
        retryable: true,
      },
    );
  }
}

module.exports = {
  buildObjectKey,
  buildObjectKeyForUpload,
  createSignedUploadUrls,
  createSignedViewUrl,
  getObjectMetadata,
  getBucketName,
  getR2Client,
};
