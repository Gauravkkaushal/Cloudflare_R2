const logger = require("firebase-functions/logger");

function info(message, metadata) {
  logger.info(message, metadata);
}

function warn(message, metadata) {
  logger.warn(message, metadata);
}

function error(message, metadata) {
  logger.error(message, metadata);
}

module.exports = {
  info,
  warn,
  error,
};
