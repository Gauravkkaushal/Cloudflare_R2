import "./Loader.css";

export default function Loader({
  label = "Loading",
  progress = null,
  overlay = true,
}) {
  const card = (
    <div className="loader-card">
      {/* ── Spinner ── */}
      <div className="loader-spinner">
        <div className="loader-ring loader-ring--outer" />
        <div className="loader-ring loader-ring--middle" />
        <div className="loader-ring loader-ring--inner" />
        <div className="loader-orbit" />
        <div className="loader-core" />
      </div>

      <div className="loader-text">
        <span className="loader-label">
          {label}
          <span className="loader-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </span>
      </div>
      {progress !== null && (
        <div className="loader-progress-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="loader-progress-bar"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );

  if (!overlay) {
    return <div className="loader-inline">{card}</div>;
  }

  return (
    <div className="loader-overlay" role="status" aria-label={label} aria-live="polite">
      {card}
    </div>
  );
}
