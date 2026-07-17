const { randomUUID } = require("node:crypto");

const { HttpsError, onCall } = require("firebase-functions/v2/https");

const { UPLOAD_URL_TTL_SECONDS, MAX_UPLOADS_PER_USER } = require("../constants/upload.const");
const { getR2Config } = require("../config/runtime.config");
const { buildObjectKey, createSignedUploadUrl } = require("../services/r2.service");
const {
  countUserUploads,
  createUploadRecord,
  listUploadedRecords,
  markUploadComplete,
} = require("../services/upload-record.service");
const { validateUploadRequest } = require("../utils/validation.util");

const THUMBNAIL_OPTIONS = "width=320,quality=75,format=auto,fit=cover";

function getPublicImageUrl({ objectKey }) {
  const { accountId, bucketName, publicDomain } = getR2Config();

  if (publicDomain) {
    const normalizedDomain = publicDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${normalizedDomain}/${objectKey}`;
  }

  return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`;
}

function getThumbnailUrl(imageUrl) {
  const url = new URL(imageUrl);
  return `${url.origin}/cdn-cgi/image/${THUMBNAIL_OPTIONS}${url.pathname}`;
}

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

  const viewUrl = getPublicImageUrl({ objectKey: record.objectKey });
  const thumbnailUrl = getThumbnailUrl(viewUrl);

  return { objectKey: record.objectKey, viewUrl, thumbnailUrl };
});

const listUploadedWallpapers = onCall(async (request) => {
  const uid = getCallableUid(request);
  const records = await listUploadedRecords({ uid });

  return {
    wallpapers: records.map((record) => {
      const viewUrl = getPublicImageUrl({ objectKey: record.objectKey });
      return {
        uploadId: record.uploadId,
        objectKey: record.objectKey,
        imageUrl: viewUrl,
        thumbnailUrl: getThumbnailUrl(viewUrl),
        originalFileName: record.originalFileName,
      };
    }),
  };
});

module.exports = { getUploadUrl, finalizeUpload, listUploadedWallpapers };
