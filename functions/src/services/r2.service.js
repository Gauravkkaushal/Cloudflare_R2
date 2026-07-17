const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const { getR2Config } = require("../config/runtime.config");
const { ALLOWED_TYPES, UPLOAD_PREFIX, UPLOAD_URL_TTL_SECONDS } = require("../constants/upload.const");

function buildObjectKey({ uid, fileType, uploadId }) {
  const ext = ALLOWED_TYPES[fileType][0];
  return `${uid}/${uploadId}.${ext}`;
}

async function createSignedUploadUrl({ objectKey, fileType }) {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = getR2Config();

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucketName, Key: objectKey, ContentType: fileType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
}

module.exports = { buildObjectKey, createSignedUploadUrl };
