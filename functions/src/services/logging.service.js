const logger = require("firebase-functions/logger");

function sanitizeMetadata(metadata = {}) {
  const sanitizedEntries = Object.entries(metadata).filter(([, value]) => {
    return value !== undefined && value !== null;
  });

  return Object.fromEntries(sanitizedEntries);
}

function serializeError(error) {
  if (!error) {
    return undefined;
  }

  return sanitizeMetadata({
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
  });
}

function info(event, metadata) {
  logger.info(event, sanitizeMetadata({ event, ...metadata }));
}

function warn(event, metadata) {
  logger.warn(event, sanitizeMetadata({ event, ...metadata }));
}

function error(event, metadata) {
  logger.error(event, sanitizeMetadata({ event, ...metadata }));
}

module.exports = {
  info,
  warn,
  error,
  sanitizeMetadata,
  serializeError,
};
