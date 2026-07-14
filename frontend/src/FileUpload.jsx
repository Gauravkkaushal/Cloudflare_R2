import { useState } from "react";
import Loader from "./components/Loader";
import axios from "axios";
import { auth } from "./firebase";
import { allowedUploadTypes, functionsBaseUrl, maxUploadBytes } from "./config/runtime";

const GET_UPLOAD_URL     = `${functionsBaseUrl}/getUploadUrl`;
const FINALIZE_UPLOAD    = `${functionsBaseUrl}/finalizeUpload`;

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
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
      setError("Only images (JPEG, SVG) are allowed.");
      return;
    }

    if (selected.size > maxUploadBytes) {
      setError(`File must be under ${Math.floor(maxUploadBytes / (1024 * 1024))}MB.`);
      return;
    }

    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
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

      // Get a fresh ID token to prove identity to the backend
      const idToken = await currentUser.getIdToken();
      const authHeader = { Authorization: `Bearer ${idToken}` };

      // Step 1 — ask backend for a presigned upload URL
      const { data: presignedData } = await axios.post(
        GET_UPLOAD_URL,
        { fileName: file.name, fileType: file.type, fileSize: file.size },
        { headers: authHeader },
      );
      const { uploadId, uploadUrl } = presignedData;

      // Step 2 — upload file directly to Cloudflare R2 (no auth needed here)
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      // Step 3 — tell backend the upload succeeded so it can finalize the record
      const { data: finalizeData } = await axios.post(
        FINALIZE_UPLOAD,
        { uploadId },
        { headers: authHeader },
      );

      setUploadedUrl(finalizeData.viewUrl);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err));
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
          <img src={preview} alt="preview" style={{ width: "100%", borderRadius: 8 }} />
          <br />
          <button onClick={handleUpload} style={{ marginTop: 8 }}>
            Upload to R2
          </button>
        </div>
      )}

      {status === "uploading" && (
        <Loader label="Uploading to R2" progress={progress} />
      )}

      {status === "success" && uploadedUrl && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "green" }}>Upload successful.</p>
          <img src={uploadedUrl} alt="uploaded" style={{ width: "100%", borderRadius: 8 }} />
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
