import axios from "axios";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebase";

const getUploadUrl = httpsCallable(functions, "getUploadUrl");
const finalizeUpload = httpsCallable(functions, "finalizeUpload");
const listUploadedWallpapers = httpsCallable(functions, "listUploadedWallpapers");

export async function fetchUploadedWallpapers() {
  const { data } = await listUploadedWallpapers();
  return data.wallpapers || [];
}

export async function uploadWallpaperFile(file, onUploadProgress) {
  const { data: presignedData } = await getUploadUrl({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  await axios.put(presignedData.uploadUrl, file, {
    headers: { "Content-Type": file.type },
    onUploadProgress,
  });

  const { data: finalizeData } = await finalizeUpload({
    uploadId: presignedData.uploadId,
  });

  return {
    imageUrl: finalizeData.viewUrl,
    thumbnailUrl: finalizeData.thumbnailUrl || finalizeData.viewUrl,
  };
}
