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

async function getUploadRecord({ uid, uploadId }) {
  const snap = await getFirestore().doc(`users/${uid}/uploads/${uploadId}`).get();

  if (!snap.exists) {
    throw new Error("Upload record not found");
  }

  return snap.data();
}

async function markUploadComplete({ uid, uploadId, imageUrl, thumbnailUrl }) {
  const ref = getFirestore().doc(`users/${uid}/uploads/${uploadId}`);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Upload record not found");
  }

  const currentRecord = snap.data();

  if (currentRecord.status === UPLOAD_STATUS.UPLOADED && currentRecord.imageUrl && currentRecord.thumbnailUrl) {
    return currentRecord;
  }

  const updateData = {
    status: UPLOAD_STATUS.UPLOADED,
    imageUrl,
    thumbnailUrl,
    uploadedAt: FieldValue.serverTimestamp(),
  };

  await ref.update(updateData);

  return { ...currentRecord, ...updateData };
}

async function listUploadedRecords({ uid }) {
  const snap = await getFirestore()
    .collection(`users/${uid}/uploads`)
    .where("status", "==", UPLOAD_STATUS.UPLOADED)
    .get();

  return snap.docs
    .map((doc) => doc.data())
    .sort((a, b) => {
      const bUploadedAt = b.uploadedAt?.toMillis?.() || 0;
      const aUploadedAt = a.uploadedAt?.toMillis?.() || 0;
      return bUploadedAt - aUploadedAt;
    });
}

module.exports = {
  countUserUploads,
  createUploadRecord,
  getUploadRecord,
  listUploadedRecords,
  markUploadComplete,
};
