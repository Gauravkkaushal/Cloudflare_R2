const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4200",
];

const DEFAULT_ALLOWED_UPLOAD_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_UPLOAD_URL_TTL_SECONDS = 3000;
const DEFAULT_UPLOAD_PREFIX = "uploads";

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_ALLOWED_UPLOAD_TYPES,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_UPLOAD_PREFIX,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
};
