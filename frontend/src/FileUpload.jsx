import { useState } from "react";
import axios from "axios";
import { auth } from "./firebase";
import {
  allowedUploadTypes,
  functionsBaseUrl,
  maxUploadBytes,
} from "./config/runtime";

const CREATE_PRESIGNED_UPLOAD_URL =
  `${functionsBaseUrl}/createPresignedUploadUrl`;
const FINALIZE_UPLOAD_URL = `${functionsBaseUrl}/finalizeUpload`;

function getServerErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    "Upload failed. Please try again."
  );
}

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selected = event.target.files[0];
    if (!selected) return;

    if (!allowedUploadTypes.includes(selected.type)) {
      setError(
        "Only images (JPG, PNG, WebP, GIF, SVG) are allowed.",
      );
      return;
    }

    if (selected.size > maxUploadBytes) {
      setError(
        `File must be under ${Math.floor(maxUploadBytes / (1024 * 1024))}MB.`,
      );
      return;
    }

    setError("");
    setFile(selected);

    const localUrl = URL.createObjectURL(selected);
    setPreview({ url: localUrl, type: selected.type });
  };

  const handleUpload = async () => {
    if (!file) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Please log in first.");
      return;
    }

    try {
      setStatus("uploading");
      setProgress(0);

      const idToken = await currentUser.getIdToken();
      const { data } = await axios.post(
        CREATE_PRESIGNED_UPLOAD_URL,
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const { uploadId, uploadUrl } = data;

      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (uploadEvent) => {
          if (!uploadEvent.total) {
            return;
          }

          setProgress(Math.round((uploadEvent.loaded * 100) / uploadEvent.total));
        },
      });

      const finalizeResponse = await axios.post(
        FINALIZE_UPLOAD_URL,
        { uploadId },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const { objectKey, viewUrl } = finalizeResponse.data;
      setUploadedUrl(viewUrl);
      setStatus("success");

      console.log("Verified object key:", objectKey);
    } catch (uploadError) {
      console.error(uploadError);
      setError(getServerErrorMessage(uploadError));
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setUploadedUrl(null);
    setProgress(0);
    setStatus("idle");
    setError("");
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Upload Image</h2>

      {status === "idle" && (
        <>
          <input
            type="file"
            accept={allowedUploadTypes.join(",")}
            onChange={handleFileChange}
          />
          {error && <p style={{ color: "red" }}>{error}</p>}
        </>
      )}

      {preview && status === "idle" && (
        <div style={{ marginTop: 16 }}>
          <img
            src={preview.url}
            alt="preview"
            style={{ width: "100%", borderRadius: 8 }}
          />
          <br />
          <button onClick={handleUpload} style={{ marginTop: 8 }}>
            Upload to R2
          </button>
        </div>
      )}

      {status === "uploading" && (
        <div style={{ marginTop: 16 }}>
          <p>Uploading... {progress}%</p>
          <progress value={progress} max={100} style={{ width: "100%" }} />
        </div>
      )}

      {status === "success" && uploadedUrl && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "green" }}>Upload successful.</p>
          <img
            src={uploadedUrl}
            alt="uploaded"
            style={{ width: "100%", borderRadius: 8 }}
          />
          <br />
          <button onClick={handleReset} style={{ marginTop: 8 }}>
            Upload another file
          </button>
        </div>
      )}

      {status === "error" && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "red" }}>{error}</p>
          <button onClick={handleReset}>Try again</button>
        </div>
      )}
    </div>
  );
}
