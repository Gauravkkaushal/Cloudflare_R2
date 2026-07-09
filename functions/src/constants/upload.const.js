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

const ALLOWED_UPLOAD_TYPE_EXTENSIONS = Object.freeze({
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov", "qt"],
});

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_UPLOAD_URL_TTL_SECONDS = 900;
const DEFAULT_VIEW_URL_TTL_SECONDS = 3600;
const DEFAULT_UPLOAD_PREFIX = "uploads";
const DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_UPLOAD_RATE_LIMIT_MAX_REQUESTS = 10;
const DEFAULT_FINALIZE_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_FINALIZE_RATE_LIMIT_MAX_REQUESTS = 20;
const DEFAULT_MAX_FILE_NAME_LENGTH = 120;
const DEFAULT_MAX_UPLOADS_PER_USER = 5;
const UPLOAD_RECORD_STATUS = Object.freeze({
  PENDING: "pending",
  UPLOADED: "uploaded",
  FAILED: "failed",
});

module.exports = {
  ALLOWED_UPLOAD_TYPE_EXTENSIONS,
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_ALLOWED_UPLOAD_TYPES,
  DEFAULT_FINALIZE_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_FINALIZE_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_MAX_FILE_NAME_LENGTH,
  DEFAULT_MAX_UPLOADS_PER_USER,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_UPLOAD_PREFIX,
  DEFAULT_UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
  DEFAULT_VIEW_URL_TTL_SECONDS,
  UPLOAD_RECORD_STATUS,
};
