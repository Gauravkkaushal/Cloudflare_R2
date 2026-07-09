const { getAuth } = require("firebase-admin/auth");

const { AppError } = require("./error.util");

function extractBearerToken(req) {
  const authHeader = req.get("authorization");

  if (!authHeader) {
    throw new AppError("Authentication token is required", 401, "AUTH_MISSING");
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Invalid or expired token", 401, "AUTH_INVALID");
  }

  return token.trim();
}

async function parseAuthProfile(req) {
  try {
    const idToken = extractBearerToken(req);
    const decodedToken = await getAuth().verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      name: decodedToken.name ?? null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Invalid or expired token", 401, "AUTH_INVALID", null, {
      appErrorKey: "UNAUTHENTICATED",
    });
  }
}

module.exports = {
  extractBearerToken,
  parseAuthProfile,
};
