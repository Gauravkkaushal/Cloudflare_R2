export function getUploadErrorMessage(error) {
  return (
    error?.details?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Upload failed. Please try again."
  );
}
