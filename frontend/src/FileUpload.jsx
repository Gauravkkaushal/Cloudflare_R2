import { useEffect, useState } from "react";
import Loader from "./components/Loader";
import Attachment from "./components/Attachment";
import axios from "axios";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebase";

const getUploadUrl = httpsCallable(functions, "getUploadUrl");
const finalizeUpload = httpsCallable(functions, "finalizeUpload");
const listUploadedWallpapers = httpsCallable(functions, "listUploadedWallpapers");

function getErrorMessage(error) {
  return (
    error?.details?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Upload failed. Please try again."
  );
}

export default function FileUpload() {
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
        const { data } = await listUploadedWallpapers();
        if (!cancelled) {
          setUploadedUrls(data.wallpapers || []);
          setBackgroundImageUrl(data.wallpapers?.[0]?.imageUrl || "");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(getErrorMessage(err));
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

  const handleUpload = async (validFiles) => {
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

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        const { data: presignedData } = await getUploadUrl({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
        const { uploadId, uploadUrl } = presignedData;

        await axios.put(uploadUrl, file, {
          headers: { "Content-Type": file.type },
          onUploadProgress: (event) => {
            if (event.total) {
              const filesDoneProgress = (i / validFiles.length) * 100;
              const currentFileProgress = (event.loaded / event.total) * (100 / validFiles.length);
              setProgress(Math.round(filesDoneProgress + currentFileProgress));
            }
          },
        });

        const { data: finalizeData } = await finalizeUpload({ uploadId });

        results.push({
          imageUrl: finalizeData.viewUrl,
          thumbnailUrl: finalizeData.thumbnailUrl || finalizeData.viewUrl,
        });
      }

      setProgress(100);
      setUploadedUrls((currentUrls) => [...results, ...currentUrls]);
      setUploaded(true);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
      {backgroundImageUrl && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            backgroundImage: `linear-gradient(rgba(6, 8, 14, 0.6), rgba(6, 8, 14, 0.78)), url("${backgroundImageUrl}")`,
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}

      <Attachment
        onUpload={handleUpload}
        progress={progress}
        uploading={uploading}
        uploaded={uploaded}
      />

      {error && (
        <p style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "rgba(252,165,165,0.95)",
          fontSize: "0.85rem",
        }}>
          {error}
        </p>
      )}

      {loadingGallery && (
        <p style={{ marginTop: 16, textAlign: "center", color: "rgba(255,255,255,0.62)" }}>
          Loading uploaded wallpapers...
        </p>
      )}

      {uploadedUrls.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {uploadedUrls.map((image, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setBackgroundImageUrl(image.imageUrl)}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: 8,
              }}
            >
              <img
                src={image.thumbnailUrl}
                alt={`Uploaded ${idx + 1}`}
                style={{
                  width: "100%",
                  height: 96,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>
      )}


    </div>
  );
}
