const { z } = require("zod");

const {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} = require("../constants/upload.const");
const { AppError } = require("./error.util");

const uploadRequestSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, "fileName is required")
    .max(200, "fileName must be 200 characters or fewer")
    .regex(/^[^\\/]+$/, "fileName must not contain path separators"),
  fileType: z.string().refine((value) => ALLOWED_MIME_TYPES.includes(value), {
    message: "File type not allowed",
  }),
  fileSize: z.coerce
    .number()
    .int("fileSize must be an integer")
    .positive("fileSize must be greater than 0")
    .max(MAX_FILE_SIZE, "File size exceeds 5MB limit"),
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

module.exports = {
  formatValidationErrors,
  uploadRequestSchema,
  validateUploadRequest,
};
