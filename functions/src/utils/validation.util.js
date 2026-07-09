const path = require("node:path");
const { z } = require("zod");

const {
  ALLOWED_UPLOAD_TYPE_EXTENSIONS,
  ALLOWED_UPLOAD_TYPES,
  MAX_FILE_NAME_LENGTH,
  MAX_UPLOAD_BYTES,
} = require("../config/runtime.config");
const { AppError } = require("./error.util");

const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_UPLOAD_TYPES);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeFileName(fileName) {
  return fileName.trim().replace(/\s+/g, " ").replace(/[\u0000-\u001f\u007f]/g, "");
}

function validateFileNameMatchesType(fileName, fileType) {
  const extension = path.extname(fileName).slice(1).toLowerCase();

  if (!extension) {
    return true;
  }

  const allowedExtensions = ALLOWED_UPLOAD_TYPE_EXTENSIONS[fileType] ?? [];
  return allowedExtensions.includes(extension);
}

const uploadRequestSchema = z.object({
  fileName: z
    .string()
    .transform(normalizeFileName)
    .pipe(
      z
        .string()
        .min(1, "fileName is required")
        .max(
          MAX_FILE_NAME_LENGTH,
          `fileName must be ${MAX_FILE_NAME_LENGTH} characters or fewer`,
        )
        .regex(/^[^\\/]+$/, "fileName must not contain path separators"),
    ),
  fileType: z.string().refine((value) => ALLOWED_MIME_TYPES.includes(value), {
    message: "File type not allowed",
  }),
  fileSize: z.coerce
    .number()
    .int("fileSize must be an integer")
    .positive("fileSize must be greater than 0")
    .max(MAX_UPLOAD_BYTES, `File size exceeds ${MAX_UPLOAD_BYTES} bytes limit`),
}).superRefine((payload, ctx) => {
  if (!validateFileNameMatchesType(payload.fileName, payload.fileType)) {
    ctx.addIssue({
      code: "custom",
      path: ["fileName"],
      message: "fileName extension does not match fileType",
    });
  }
});

const finalizeUploadRequestSchema = z.object({
  uploadId: z
    .string()
    .trim()
    .regex(UUID_PATTERN, "uploadId must be a valid upload identifier"),
});

function formatValidationErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    message: issue.message,
  }));
}

function validateUploadRequest(payload) {
  const validationResult = uploadRequestSchema.safeParse(payload || {});

  if (!validationResult.success) {
    throw new AppError(
      "Invalid upload request",
      400,
      "UPLOAD_REQUEST_INVALID",
      formatValidationErrors(validationResult.error),
    );
  }

  return validationResult.data;
}

function validateFinalizeUploadRequest(payload) {
  const validationResult = finalizeUploadRequestSchema.safeParse(payload || {});

  if (!validationResult.success) {
    throw new AppError(
      "Invalid finalize upload request",
      400,
      "FINALIZE_REQUEST_INVALID",
      formatValidationErrors(validationResult.error),
      {
        appErrorKey: "INVALID_ARGUMENT",
      },
    );
  }

  return validationResult.data;
}

module.exports = {
  finalizeUploadRequestSchema,
  formatValidationErrors,
  normalizeFileName,
  uploadRequestSchema,
  validateFinalizeUploadRequest,
  validateUploadRequest,
};
