import { useState } from "react";
import axios from "axios";
import { auth } from "../src/firebase"

const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm", "video/quicktime"
];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const CREATE_PRESIGNED_UPLOAD_URL =
    "http://127.0.0.1:5001/r2-project-5b86f/us-central1/createPresignedUploadUrl";

export default function FileUpload() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    // --- Step 1: User picks a file ---
    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        // Client-side validation
        if (!ALLOWED_TYPES.includes(selected.type)) {
            setError("Only images (JPG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are allowed.");
            return;
        }
        if (selected.size > MAX_SIZE) {
            setError("File must be under 100MB.");
            return;
        }

        setError("");
        setFile(selected);

        // Show local preview before upload
        const localUrl = URL.createObjectURL(selected);
        setPreview({ url: localUrl, type: selected.type });
    };


    // --- Step 2: Upload the file ---
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
            // 2a. Ask your Firebase Cloud Function for a presigned URL
            const { data } = await axios.post(CREATE_PRESIGNED_UPLOAD_URL, {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
            }, {
                headers: {
                    Authorization: `Bearer ${idToken}`, // ← Firebase token here
                },
            });

            const { uploadUrl, viewUrl, objectKey } = data;

            // 2b. Upload the file DIRECTLY to R2 using the presigned URL
            await axios.put(uploadUrl, file, {
                headers: { "Content-Type": file.type },
                onUploadProgress: (e) => {
                    setProgress(Math.round((e.loaded * 100) / e.total));
                },
            });

            // 2c. Done — store the viewUrl and objectKey
            setUploadedUrl(viewUrl);
            setStatus("success");

            // TODO: Save objectKey to your database here
            console.log("Saved object key:", objectKey);

        } catch (err) {
            console.error(err);
            const serverError = err.response?.data?.error;
            setError(serverError || "Upload failed. Please try again.");
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
            <h2>Upload Image or Video</h2>

            {/* File picker */}
            {status === "idle" && (
                <>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                        onChange={handleFileChange}
                    />
                    {error && <p style={{ color: "red" }}>{error}</p>}
                </>
            )}

            {/* Local preview before upload */}
            {preview && status === "idle" && (
                <div style={{ marginTop: 16 }}>
                    {preview.type.startsWith("image/") ? (
                        <img src={preview.url} alt="preview" style={{ width: "100%", borderRadius: 8 }} />
                    ) : (
                        <video src={preview.url} controls style={{ width: "100%" }} />
                    )}
                    <br />
                    <button onClick={handleUpload} style={{ marginTop: 8 }}>
                        Upload to R2
                    </button>
                </div>
            )}

            {/* Progress bar */}
            {status === "uploading" && (
                <div style={{ marginTop: 16 }}>
                    <p>Uploading... {progress}%</p>
                    <progress value={progress} max={100} style={{ width: "100%" }} />
                </div>
            )}

            {/* Success — show uploaded file */}
            {status === "success" && uploadedUrl && (
                <div style={{ marginTop: 16 }}>
                    <p style={{ color: "green" }}>✅ Upload successful!</p>
                    {file.type.startsWith("image/") ? (
                        <img src={uploadedUrl} alt="uploaded" style={{ width: "100%", borderRadius: 8 }} />
                    ) : (
                        <video src={uploadedUrl} controls style={{ width: "100%" }} />
                    )}
                    <br />
                    <button onClick={handleReset} style={{ marginTop: 8 }}>
                        Upload another file
                    </button>
                </div>
            )}

            {/* Error state */}
            {status === "error" && (
                <div style={{ marginTop: 16 }}>
                    <p style={{ color: "red" }}>{error}</p>
                    <button onClick={handleReset}>Try again</button>
                </div>
            )}
        </div>
    );
}
