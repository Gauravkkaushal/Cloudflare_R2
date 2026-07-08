const { randomUUID } = require("node:crypto");

const {
  FINALIZE_RATE_LIMIT_MAX_REQUESTS,
  FINALIZE_RATE_LIMIT_WINDOW_SECONDS,
  UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
} = require("../config/runtime.config");
const { UPLOAD_RECORD_STATUS } = require("../constants/upload.const");
const { AppError } = require("../utils/error.util");
const loggingService = require("./logging.service");
const { assertWithinRateLimit } = require("./rate-limit.service");
const {
  buildObjectKeyForUpload,
  createSignedUploadUrls,
  createSignedViewUrl,
  getObjectMetadata,
} = require("./r2.service");
const {
  createUploadRecord,
  getUploadRecord,
  markUploadFailed,
  markUploadUploaded,
} = require("./upload-record.service");

async function issueUploadUrl({ user, request }) {
  await assertWithinRateLimit({
    scope: "create_upload_url",
    subject: user.uid,
    maxRequests: UPLOAD_RATE_LIMIT_MAX_REQUESTS,
    windowSeconds: UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
  });

  const uploadId = randomUUID();
  const objectKey = buildObjectKeyForUpload({
    uid: user.uid,
    fileType: request.fileType,
    uploadId,
  });

  await createUploadRecord({
    uploadId,
    uid: user.uid,
    objectKey,
    fileName: request.fileName,
    fileSize: request.fileSize,
    fileType: request.fileType,
    status: UPLOAD_RECORD_STATUS.PENDING,
  });

  const signedUrls = await createSignedUploadUrls({
    objectKey,
    fileType: request.fileType,
  });

  loggingService.info("upload.url_issued", {
    uid: user.uid,
    uploadId,
    objectKey,
    contentType: request.fileType,
    sizeBytes: request.fileSize,
  });

  return {
    ...signedUrls,
    uploadId,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  };
}

async function finalizeUpload({ user, request }) {
  await assertWithinRateLimit({
    scope: "finalize_upload",
    subject: user.uid,
    maxRequests: FINALIZE_RATE_LIMIT_MAX_REQUESTS,
    windowSeconds: FINALIZE_RATE_LIMIT_WINDOW_SECONDS,
  });

  const uploadRecord = await getUploadRecord({
    uid: user.uid,
    uploadId: request.uploadId,
  });

  if (!uploadRecord) {
    throw new AppError("Upload record was not found", 404, "UPLOAD_NOT_FOUND", null, {
      appErrorKey: "NOT_FOUND",
    });
  }

  if (uploadRecord.status === UPLOAD_RECORD_STATUS.UPLOADED) {
    return {
      uploadId: request.uploadId,
      objectKey: uploadRecord.objectKey,
      status: uploadRecord.status,
      viewUrl: await createSignedViewUrl({ objectKey: uploadRecord.objectKey }),
    };
  }

  const objectMetadata = await getObjectMetadata({
    objectKey: uploadRecord.objectKey,
  });

  if (objectMetadata.contentLength !== uploadRecord.expectedFileSizeBytes) {
    await markUploadFailed({
      uid: user.uid,
      uploadId: request.uploadId,
      reason: "size_mismatch",
      verification: objectMetadata,
    });

    throw new AppError(
      "Uploaded file size does not match the approved upload request",
      409,
      "UPLOAD_SIZE_MISMATCH",
      {
        expected: uploadRecord.expectedFileSizeBytes,
        actual: objectMetadata.contentLength,
      },
      {
        appErrorKey: "CONFLICT",
      },
    );
  }

  if (objectMetadata.contentType !== uploadRecord.expectedContentType) {
    await markUploadFailed({
      uid: user.uid,
      uploadId: request.uploadId,
      reason: "content_type_mismatch",
      verification: objectMetadata,
    });

    throw new AppError(
      "Uploaded file type does not match the approved upload request",
      409,
      "UPLOAD_TYPE_MISMATCH",
      {
        expected: uploadRecord.expectedContentType,
        actual: objectMetadata.contentType,
      },
      {
        appErrorKey: "CONFLICT",
      },
    );
  }

  await markUploadUploaded({
    uid: user.uid,
    uploadId: request.uploadId,
    verification: objectMetadata,
  });

  loggingService.info("upload.finalized", {
    uid: user.uid,
    uploadId: request.uploadId,
    objectKey: uploadRecord.objectKey,
    sizeBytes: objectMetadata.contentLength,
    contentType: objectMetadata.contentType,
  });

  return {
    uploadId: request.uploadId,
    objectKey: uploadRecord.objectKey,
    status: UPLOAD_RECORD_STATUS.UPLOADED,
    viewUrl: await createSignedViewUrl({ objectKey: uploadRecord.objectKey }),
  };
}

module.exports = {
  finalizeUpload,
  issueUploadUrl,
};
