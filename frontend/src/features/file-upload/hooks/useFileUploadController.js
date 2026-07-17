import { useEffect, useState } from "react";
import { auth } from "../../../firebase";
import {
  fetchUploadedWallpapers,
  uploadWallpaperFile,
} from "../services/fileUpload.service";
import { getUploadErrorMessage } from "../utils/uploadError";

export function useFileUploadController() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUploadedWallpapers() {
      try {
        setLoadingGallery(true);
        const wallpapers = await fetchUploadedWallpapers();

        if (!cancelled) {
          setUploadedUrls(wallpapers);
          setBackgroundImageUrl(wallpapers[0]?.imageUrl || "");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(getUploadErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoadingGallery(false);
        }
      }
    }

    loadUploadedWallpapers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(validFiles) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Please log in first.");
      return;
    }

    try {
      setError("");
      setUploading(true);
      setUploaded(false);
      setProgress(0);

      const results = [];

      for (let fileIndex = 0; fileIndex < validFiles.length; fileIndex += 1) {
        const file = validFiles[fileIndex];
        const result = await uploadWallpaperFile(file, (event) => {
          if (!event.total) return;

          const filesDoneProgress = (fileIndex / validFiles.length) * 100;
          const currentFileProgress =
            (event.loaded / event.total) * (100 / validFiles.length);
          setProgress(Math.round(filesDoneProgress + currentFileProgress));
        });

        results.push(result);
      }

      setProgress(100);
      setUploadedUrls((currentUrls) => [...results, ...currentUrls]);
      setUploaded(true);
    } catch (err) {
      console.error(err);
      setError(getUploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return {
    viewModel: {
      error,
      gallery: {
        backgroundImageUrl,
        isLoading: loadingGallery,
        wallpapers: uploadedUrls,
      },
      upload: {
        isComplete: uploaded,
        isUploading: uploading,
        progress,
      },
    },
    actions: {
      selectBackground: setBackgroundImageUrl,
      uploadFiles: handleUpload,
    },
  };
}
