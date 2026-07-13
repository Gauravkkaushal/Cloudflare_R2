const { randomUUID } = require("node:crypto");

const { onCall } = require("firebase-functions/v2/https");

const { UPLOAD_URL_TTL_SECONDS, MAX_UPLOADS_PER_USER } = require("../constants/upload.const");
const { buildObjectKey, createSignedUploadUrl } = require("../services/r2.service");
const { countUserUploads, createUploadRecord } = require("../services/upload-record.service");
const { validateUploadRequest } = require("../utils/validation.util");

const getUploadUrl = onCall(async (request) => {
  if (!request.auth) {
    return { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } };
  }

  const { uid } = request.auth;
  const { fileName, fileType, fileSize } = request.data;

  const validationError = validateUploadRequest({ fileName, fileType, fileSize });
  if (validationError) {
    return { success: false, error: { code: "INVALID_REQUEST", message: validationError } };
  }

  const uploadCount = await countUserUploads(uid);
  if (uploadCount >= MAX_UPLOADS_PER_USER) {
    return {
      success: false,
      error: { code: "LIMIT_REACHED", message: `Maximum of ${MAX_UPLOADS_PER_USER} uploads allowed` },
    };
  }

  const uploadId = randomUUID();
  const objectKey = buildObjectKey({ uid, fileType, uploadId });

  await createUploadRecord({ uploadId, uid, objectKey, fileName, fileType, fileSize });

  const uploadUrl = await createSignedUploadUrl({ objectKey, fileType });

  return {
    success: true,
    data: { uploadId, objectKey, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS },
  };
});

module.exports = { getUploadUrl };
