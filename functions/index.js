const { initializeApp } = require("firebase-admin/app");
const { setGlobalOptions } = require("firebase-functions");

const {
  createPresignedUploadUrl,
  finalizeUploadRequest,
} = require("./src/functions/upload.function");

initializeApp();
setGlobalOptions({ maxInstances: 10 });

exports.createPresignedUploadUrl = createPresignedUploadUrl;
exports.finalizeUpload = finalizeUploadRequest;
