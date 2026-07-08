const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const { getBucketName } = require("./r2.service");

function getUploadDocRef(uid, uploadId) {
  return getFirestore().doc(`users/${uid}/uploads/${uploadId}`);
}

async function createUploadRecord({
  uploadId,
  uid,
  objectKey,
  fileName,
  fileSize,
  fileType,
  status,
}) {
  await getUploadDocRef(uid, uploadId).set({
    uploadId,
    ownerUid: uid,
    bucket: getBucketName(),
    objectKey,
    originalFileName: fileName,
    expectedFileSizeBytes: fileSize,
    expectedContentType: fileType,
    status,
    createdAt: FieldValue.serverTimestamp(),
    uploadedAt: null,
    failedAt: null,
    verification: null,
  });
}

async function getUploadRecord({ uid, uploadId }) {
  const snapshot = await getUploadDocRef(uid, uploadId).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data();
}

async function markUploadUploaded({ uid, uploadId, verification }) {
  await getUploadDocRef(uid, uploadId).set(
    {
      status: "uploaded",
      uploadedAt: FieldValue.serverTimestamp(),
      failedAt: null,
      failureReason: FieldValue.delete(),
      verification: {
        ...verification,
        verifiedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
}

async function markUploadFailed({ uid, uploadId, reason, verification }) {
  await getUploadDocRef(uid, uploadId).set(
    {
      status: "failed",
      failedAt: FieldValue.serverTimestamp(),
      failureReason: reason,
      verification: {
        ...verification,
        verifiedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
}

module.exports = {
  createUploadRecord,
  getUploadDocRef,
  getUploadRecord,
  markUploadFailed,
  markUploadUploaded,
};
