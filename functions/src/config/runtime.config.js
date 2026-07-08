const {
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_ALLOWED_UPLOAD_TYPES,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_UPLOAD_PREFIX,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
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

const UPLOAD_URL_TTL_SECONDS = readNumberEnv(
  "UPLOAD_URL_TTL_SECONDS",
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
);

const UPLOAD_PREFIX = readStringEnv("UPLOAD_PREFIX", DEFAULT_UPLOAD_PREFIX);

const ALLOWED_ORIGINS = new Set(
  readListEnv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS),
);

module.exports = {
  ALLOWED_ORIGINS,
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_PREFIX,
  UPLOAD_URL_TTL_SECONDS,
};
