import { useRef, useState } from "react";
import "./Attachment.css";

const ALLOWED_TYPES = ["image/jpeg", "image/svg+xml"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPEG & SVG allowed";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `Exceeds ${MAX_SIZE_BYTES / (1024 * 1024)}MB limit`;
  }
  return null; // valid
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachment({
  onUpload,
  progress = 0,
  uploading = false,
  uploaded = false,
}) {
  const inputRef = useRef(null);
  const [items, setItems] = useState([]); // { id, file, previewUrl, error }
  const [dragging, setDragging] = useState(false);

  // ── Add files ────────────────────────────────────────────────────────────────
  function addFiles(fileList) {
    const incoming = Array.from(fileList).slice(0, MAX_FILES - items.length);
    const newItems = incoming.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      error: validateFile(file),
    }));
    setItems((prev) => [...prev, ...newItems]);
  }

  function handleInputChange(e) {
    if (e.target.files?.length) addFiles(e.target.files);
    // reset input so same file can be re-selected after removal
    e.target.value = "";
  }

  // ── Remove a single file ─────────────────────────────────────────────────────
  function removeItem(id) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const validItems  = items.filter((i) => !i.error);
  const invalidItems = items.filter((i) => i.error);
  const hasValid    = validItems.length > 0;
  const canAdd      = items.length < MAX_FILES && !uploading;

  function handleUploadClick() {
    if (onUpload && hasValid) {
      onUpload(validItems.map((i) => i.file));
    }
  }

  return (
    <div className="att-wrapper">

      {/* ── Drop zone ── */}
      {canAdd && (
        <div
          className={`att-glass att-dropzone ${dragging ? "att-dropzone--active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Select images to attach"
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            onChange={handleInputChange}
            style={{ display: "none" }}
          />
          <div className="att-icon">📎</div>
          <span className="att-dropzone-title">
            {dragging ? "Drop images here" : "Click or drag images here"}
          </span>
          <span className="att-dropzone-sub">
            JPEG &amp; SVG · max {MAX_SIZE_BYTES / (1024 * 1024)}MB each · up to {MAX_FILES} files
          </span>
        </div>
      )}

      {/* ── Image grid ── */}
      {items.length > 0 && (
        <>
          <div className="att-grid">
            {items.map((item) => (
              <div key={item.id}>
                <div className="att-item">
                  {/* Preview */}
                  {item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.file.name} />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "2rem",
                    }}>
                      🖼
                    </div>
                  )}

                  {/* Validation badge */}
                  <div className={`att-badge ${item.error ? "att-badge--err" : "att-badge--ok"}`}>
                    {item.error ? `✕ ${item.error}` : `✓ ${formatBytes(item.file.size)}`}
                  </div>

                  {/* Remove button */}
                  {!uploading && (
                    <button
                      className="att-remove"
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      aria-label={`Remove ${item.file.name}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* File name */}
                <div className="att-name" title={item.file.name}>
                  {item.file.name}
                </div>
              </div>
            ))}
          </div>

          {/* ── Summary bar ── */}
          <div className="att-summary">
            <span>
              <strong>{validItems.length}</strong> valid &nbsp;·&nbsp;
              {invalidItems.length > 0 && (
                <span className="att-summary-err">
                  <strong>{invalidItems.length}</strong> invalid
                </span>
              )}
            </span>
            <span>{items.length} / {MAX_FILES} selected</span>
          </div>
        </>
      )}

      {/* ── Progress bar (shown while uploading or after) ── */}
      {(uploading || progress > 0) && (
        <div className="att-glass att-progress-section">
          <div className="att-progress-header">
            <span className="att-progress-label">
              {uploaded ? "Upload complete" : "Uploading images"}
            </span>
            <span className="att-progress-pct">{progress}%</span>
          </div>
          <div className="att-progress-track">
            <div
              className="att-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Success message ── */}
      {uploaded && (
        <div className="att-success">
          ✦ All images uploaded successfully!
        </div>
      )}

      {/* ── Upload button ── */}
      {items.length > 0 && !uploaded && (
        <button
          className="att-btn"
          onClick={handleUploadClick}
          disabled={!hasValid || uploading}
          aria-label={`Upload ${validItems.length} valid image${validItems.length !== 1 ? "s" : ""}`}
        >
          {uploading
            ? `Uploading ${validItems.length} image${validItems.length !== 1 ? "s" : ""}…`
            : `Upload ${validItems.length} valid image${validItems.length !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
