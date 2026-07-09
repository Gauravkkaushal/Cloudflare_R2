const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const { AppError } = require("../utils/error.util");

function getRateLimitDoc(scope, subject) {
  return getFirestore().collection("_rateLimits").doc(`${scope}:${subject}`);
}

async function assertWithinRateLimit({
  scope,
  subject,
  maxRequests,
  windowSeconds,
}) {
  const docRef = getRateLimitDoc(scope, subject);
  const nowMs = Date.now();

  try {
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const existingData = snapshot.exists ? snapshot.data() : null;
      const windowStartedAtMs =
        typeof existingData?.windowStartedAtMs === "number"
          ? existingData.windowStartedAtMs
          : nowMs;
      const count = typeof existingData?.count === "number" ? existingData.count : 0;
      const windowExpired = nowMs - windowStartedAtMs >= windowSeconds * 1000;

      if (!windowExpired && count >= maxRequests) {
        throw new AppError(
          "Too many upload requests. Please wait and try again.",
          429,
          "RATE_LIMIT_EXCEEDED",
          {
            scope,
            retryAfterSeconds: windowSeconds,
          },
          {
            appErrorKey: "RESOURCE_EXHAUSTED",
            retryable: true,
          },
        );
      }

      const nextCount = windowExpired ? 1 : count + 1;
      const nextWindowStartedAtMs = windowExpired ? nowMs : windowStartedAtMs;

      transaction.set(
        docRef,
        {
          scope,
          subject,
          count: nextCount,
          windowSeconds,
          windowStartedAtMs: nextWindowStartedAtMs,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Unable to enforce rate limit", 500, "RATE_LIMIT_FAILED", null, {
      appErrorKey: "INTERNAL_ERROR",
      retryable: true,
      exposeMessage: false,
    });
  }
}

module.exports = {
  assertWithinRateLimit,
};
