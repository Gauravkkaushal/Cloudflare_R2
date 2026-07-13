const { ALLOWED_TYPES, MAX_FILE_SIZE_BYTES } = require("../constants/upload.const");

/**
 * Returns an error message string if invalid, or null if valid.
 */
function validateUploadRequest({ fileName, fileType, fileSize }) {
  if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
    return "fileName is required";
  }
  if (!ALLOWED_TYPES[fileType]) {
    return `fileType must be one of: ${Object.keys(ALLOWED_TYPES).join(", ")}`;
  }
  if (!fileSize || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
    return `fileSize must be between 1 and ${MAX_FILE_SIZE_BYTES} bytes`;
  }
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && !ALLOWED_TYPES[fileType].includes(ext)) {
    return "File extension does not match fileType";
  }
  return null;
}

module.exports = { validateUploadRequest };
