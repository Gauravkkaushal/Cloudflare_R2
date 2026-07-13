// R2 credentials and bucket are read from environment variables (.env)
function getR2Config() {
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY_ID,
    bucketName: process.env.R2_BUCKET_NAME,
  };
}

module.exports = { getR2Config };
