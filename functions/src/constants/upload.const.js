const ALLOWED_TYPES = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png":  ["png"],
  "image/webp": ["webp"],
  "image/gif":  ["gif"],
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_UPLOADS_PER_USER = 5;
const UPLOAD_URL_TTL_SECONDS = 900; // 15 min
const UPLOAD_PREFIX = "uploads";

const UPLOAD_STATUS = Object.freeze({
  PENDING: "pending",
  UPLOADED: "uploaded",
});

module.exports = {
  ALLOWED_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_UPLOADS_PER_USER,
  UPLOAD_URL_TTL_SECONDS,
  UPLOAD_PREFIX,
  UPLOAD_STATUS,
};
