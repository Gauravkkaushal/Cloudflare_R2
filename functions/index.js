const { initializeApp } = require("firebase-admin/app");
const { setGlobalOptions } = require("firebase-functions");

const { createPresignedUploadUrl } = require("./src/functions/upload.function");

initializeApp();
setGlobalOptions({ maxInstances: 10 });

exports.createPresignedUploadUrl = createPresignedUploadUrl;
