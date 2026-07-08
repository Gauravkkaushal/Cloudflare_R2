const {
  ALLOWED_UPLOAD_TYPE_EXTENSIONS,
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_ALLOWED_UPLOAD_TYPES,
  DEFAULT_FINALIZE_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_FINALIZE_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_MAX_FILE_NAME_LENGTH,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_UPLOAD_PREFIX,
  DEFAULT_UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
  DEFAULT_VIEW_URL_TTL_SECONDS,
} = require("../constants/upload.const");

function readStringEnv(name, fallback) {
  const value = process.env[name];

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue || fallback;
}

function readNumberEnv(name, fallback) {
  const value = readStringEnv(name, "");

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function readListEnv(name, fallback) {
  const value = readStringEnv(name, "");

  if (!value) {
    return fallback;
  }

  const parsedValues = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsedValues.length > 0 ? parsedValues : fallback;
}

const ALLOWED_UPLOAD_TYPES = Object.freeze({
  ...DEFAULT_ALLOWED_UPLOAD_TYPES,
});

const MAX_UPLOAD_BYTES = readNumberEnv(
  "MAX_UPLOAD_BYTES",
  DEFAULT_MAX_UPLOAD_BYTES,
);

const MAX_FILE_NAME_LENGTH = readNumberEnv(
  "MAX_FILE_NAME_LENGTH",
  DEFAULT_MAX_FILE_NAME_LENGTH,
);

const UPLOAD_URL_TTL_SECONDS = readNumberEnv(
  "UPLOAD_URL_TTL_SECONDS",
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
);

const VIEW_URL_TTL_SECONDS = readNumberEnv(
  "VIEW_URL_TTL_SECONDS",
  DEFAULT_VIEW_URL_TTL_SECONDS,
);

const UPLOAD_PREFIX = readStringEnv("UPLOAD_PREFIX", DEFAULT_UPLOAD_PREFIX);

const ALLOWED_ORIGINS = new Set(
  readListEnv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS),
);

const UPLOAD_RATE_LIMIT_WINDOW_SECONDS = readNumberEnv(
  "UPLOAD_RATE_LIMIT_WINDOW_SECONDS",
  DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
);

const UPLOAD_RATE_LIMIT_MAX_REQUESTS = readNumberEnv(
  "UPLOAD_RATE_LIMIT_MAX_REQUESTS",
  DEFAULT_UPLOAD_RATE_LIMIT_MAX_REQUESTS,
);

const FINALIZE_RATE_LIMIT_WINDOW_SECONDS = readNumberEnv(
  "FINALIZE_RATE_LIMIT_WINDOW_SECONDS",
  DEFAULT_FINALIZE_RATE_LIMIT_WINDOW_SECONDS,
);

const FINALIZE_RATE_LIMIT_MAX_REQUESTS = readNumberEnv(
  "FINALIZE_RATE_LIMIT_MAX_REQUESTS",
  DEFAULT_FINALIZE_RATE_LIMIT_MAX_REQUESTS,
);

module.exports = {
  ALLOWED_ORIGINS,
  ALLOWED_UPLOAD_TYPE_EXTENSIONS,
  ALLOWED_UPLOAD_TYPES,
  FINALIZE_RATE_LIMIT_MAX_REQUESTS,
  FINALIZE_RATE_LIMIT_WINDOW_SECONDS,
  MAX_FILE_NAME_LENGTH,
  MAX_UPLOAD_BYTES,
  UPLOAD_PREFIX,
  UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
  VIEW_URL_TTL_SECONDS,
};
