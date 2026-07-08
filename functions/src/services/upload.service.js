const { buildObjectKey, createSignedUploadUrls } = require("./r2.service");

async function issueUploadUrl({ user, request }) {
  const objectKey = buildObjectKey({
    uid: user.uid,
    fileType: request.fileType,
  });

  return createSignedUploadUrls({
    objectKey,
    fileType: request.fileType,
  });
}

module.exports = {
  issueUploadUrl,
};
