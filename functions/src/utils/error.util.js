class AppError extends Error {
  constructor(message, statusCode, code, details, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details ?? null;
    this.appErrorKey = options.appErrorKey ?? code ?? "INTERNAL_ERROR";
    this.retryable = options.retryable ?? false;
    this.exposeMessage = options.exposeMessage ?? true;
  }
}

function createAppError(message, statusCode, code, details, options) {
  return new AppError(message, statusCode, code, details, options);
}

function buildErrorResponse(error, fallbackMessage) {
  if (error instanceof AppError) {
    const safeMessage = error.exposeMessage ? error.message : fallbackMessage;
    const response = {
      error: {
        message: safeMessage,
        code: error.code ?? "INTERNAL_ERROR",
        appErrorKey: error.appErrorKey ?? error.code ?? "INTERNAL_ERROR",
        retryable: Boolean(error.retryable),
      },
    };

    if (error.details) {
      response.error.details = error.details;
    }

    return {
      statusCode: error.statusCode,
      body: response,
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        message: fallbackMessage,
        code: "INTERNAL_ERROR",
        appErrorKey: "INTERNAL_ERROR",
        retryable: true,
      },
    },
  };
}

function sendErrorResponse(res, error, fallbackMessage) {
  const { statusCode, body } = buildErrorResponse(error, fallbackMessage);
  return res.status(statusCode).json(body);
}

module.exports = {
  AppError,
  buildErrorResponse,
  createAppError,
  sendErrorResponse,
};
