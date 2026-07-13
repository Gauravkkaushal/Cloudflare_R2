const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const { UPLOAD_STATUS, MAX_UPLOADS_PER_USER } = require("../constants/upload.const");

async function countUserUploads(uid) {
  const snap = await getFirestore()
    .collection(`users/${uid}/uploads`)
    .where("status", "==", UPLOAD_STATUS.UPLOADED)
    .limit(MAX_UPLOADS_PER_USER)
    .get();
  return snap.size;
}

async function createUploadRecord({ uploadId, uid, objectKey, fileName, fileType, fileSize }) {
  await getFirestore().doc(`users/${uid}/uploads/${uploadId}`).set({
    uploadId,
    objectKey,
    originalFileName: fileName.trim(),
    fileType,
    fileSizeBytes: fileSize,
    status: UPLOAD_STATUS.PENDING,
    createdAt: FieldValue.serverTimestamp(),
    uploadedAt: null,
  });
}

module.exports = { countUserUploads, createUploadRecord };
