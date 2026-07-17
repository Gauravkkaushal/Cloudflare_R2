const { randomUUID } = require("node:crypto");

const { HttpsError, onCall } = require("firebase-functions/v2/https");

const { UPLOAD_URL_TTL_SECONDS, MAX_UPLOADS_PER_USER } = require("../constants/upload.const");
const { getR2Config } = require("../config/runtime.config");
const { buildObjectKey, createSignedUploadUrl } = require("../services/r2.service");
const { countUserUploads, createUploadRecord, markUploadComplete } = require("../services/upload-record.service");
const { validateUploadRequest } = require("../utils/validation.util");

function getCallableUid(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Please log in before uploading.");
  }
  return uid;
}

const getUploadUrl = onCall(async (request) => {
  const uid = getCallableUid(request);
  const { fileName, fileType, fileSize } = request.data || {};

  const validationError = validateUploadRequest({ fileName, fileType, fileSize });
  if (validationError) {
    throw new HttpsError("invalid-argument", validationError);
  }

  const uploadCount = await countUserUploads(uid);
  if (uploadCount >= MAX_UPLOADS_PER_USER) {
    throw new HttpsError("resource-exhausted", `Maximum of ${MAX_UPLOADS_PER_USER} uploads allowed`);
  }

  const uploadId = randomUUID();
  const objectKey = buildObjectKey({ uid, fileType, uploadId });

  await createUploadRecord({ uploadId, uid, objectKey, fileName, fileType, fileSize });

  const uploadUrl = await createSignedUploadUrl({ objectKey, fileType });

  return { uploadId, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
});

const finalizeUpload = onCall(async (request) => {
  const uid = getCallableUid(request);
  const { uploadId } = request.data || {};

  if (!uploadId || typeof uploadId !== "string") {
    throw new HttpsError("invalid-argument", "uploadId is required");
  }

  let record;
  try {
    record = await markUploadComplete({ uid, uploadId });
  } catch (err) {
    throw new HttpsError("not-found", err.message);
  }

  const { accountId, bucketName } = getR2Config();
  const viewUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${record.objectKey}`;

  return { objectKey: record.objectKey, viewUrl };
});

module.exports = { getUploadUrl, finalizeUpload };
