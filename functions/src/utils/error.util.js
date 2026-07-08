class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function buildErrorResponse(error, fallbackMessage) {
  if (error instanceof AppError) {
    const response = {
      error: error.message,
    };

    if (error.code) {
      response.code = error.code;
    }

    if (error.details) {
      response.details = error.details;
    }

    return {
      statusCode: error.statusCode,
      body: response,
    };
  }

  return {
    statusCode: 500,
    body: { error: fallbackMessage },
  };
}

function sendErrorResponse(res, error, fallbackMessage) {
  const { statusCode, body } = buildErrorResponse(error, fallbackMessage);
  return res.status(statusCode).json(body);
}

module.exports = {
  AppError,
  buildErrorResponse,
  sendErrorResponse,
};
