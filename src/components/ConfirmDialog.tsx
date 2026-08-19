"use client";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "削除する",
  cancelLabel = "キャンセル",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: description ? 8 : 16 }}>{title}</div>
        {description && (
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{description}</p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="ghost" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? "danger-ghost" : "primary"}
            style={{ flex: 1 }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "処理中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
