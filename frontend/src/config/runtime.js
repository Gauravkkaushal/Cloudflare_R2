function getRequiredEnv(name) {
  const value = import.meta.env[name];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function getOptionalEnv(name) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNumberEnv(name, fallback) {
  const value = import.meta.env[name];

  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function getListEnv(name, fallback) {
  const value = import.meta.env[name];

  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsedValues = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsedValues.length > 0 ? parsedValues : fallback;
}

export const firebaseConfig = {
  apiKey: getRequiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getRequiredEnv("VITE_FIREBASE_APP_ID"),
};

export const functionsEmulatorUrl = getOptionalEnv("VITE_FUNCTIONS_BASE_URL")
  .replace(/\/+$/, "");

export const allowedUploadTypes = getListEnv("VITE_ALLOWED_UPLOAD_TYPES", [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export const maxUploadBytes = getNumberEnv("VITE_MAX_UPLOAD_BYTES", 5 * 1024 * 1024);
