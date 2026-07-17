import Attachment from "./components/Attachment";

export default function FileUpload({ viewModel, actions }) {
  const { error, gallery, upload } = viewModel;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
      {gallery.backgroundImageUrl && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            backgroundImage: `linear-gradient(rgba(6, 8, 14, 0.6), rgba(6, 8, 14, 0.78)), url("${gallery.backgroundImageUrl}")`,
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}

      <Attachment
        onUpload={actions.uploadFiles}
        progress={upload.progress}
        uploading={upload.isUploading}
        uploaded={upload.isComplete}
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

      {gallery.isLoading && (
        <p style={{ marginTop: 16, textAlign: "center", color: "rgba(255,255,255,0.62)" }}>
          Loading uploaded wallpapers...
        </p>
      )}

      {gallery.wallpapers.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {gallery.wallpapers.map((image, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => actions.selectBackground(image.imageUrl)}
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
