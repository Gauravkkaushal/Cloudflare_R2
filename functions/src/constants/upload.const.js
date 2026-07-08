const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:4200",
]);

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_TYPES);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_EXPIRES_IN_SECONDS = 3000;
const UPLOAD_PATH_PREFIX = "uploads";

module.exports = {
  ALLOWED_MIME_TYPES,
  ALLOWED_ORIGINS,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  SIGNED_URL_EXPIRES_IN_SECONDS,
  UPLOAD_PATH_PREFIX,
};
