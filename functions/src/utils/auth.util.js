const { getAuth } = require("firebase-admin/auth");

const { AppError } = require("./error.util");

function extractBearerToken(req) {
  const authHeader = req.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Invalid or expired token", 401, "AUTH_INVALID");
  }

  return authHeader.slice("Bearer ".length);
}

async function parseAuthProfile(req) {
  const idToken = extractBearerToken(req);
  const decodedToken = await getAuth().verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
    name: decodedToken.name ?? null,
  };
}

module.exports = {
  extractBearerToken,
  parseAuthProfile,
};
