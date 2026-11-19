// Subida end-to-end de portadas: la UI valida (tipo y 5 MB), llama al endpoint y el backend
// persiste en R2 y decide la URL publica. Si no hay foto, los cards muestran una ilustrativa.
// Uso: <ImageUpload url={x.imagen} onUpload={(f) => atractivos.subirImagen(id, f)} onRemove={() => atractivos.eliminarImagen(id)} />

import { Camera, Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { errorText } from "../lib/format";
import { useI18n } from "../i18n/I18n";
import { useToast } from "./Toast";
import { Dialog } from "./ui";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (el backend valida de nuevo)
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  /** URL de la foto actual en el backend, o null si no hay portada. */
  url?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  /** Tamaño del área de foto: square (avatar) o wide (portada de 16:9). */
  variant?: "square" | "wide";
}

export function ImageUpload({ url, onUpload, onRemove, variant = "wide" }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permitir volver a elegir el mismo archivo
    if (!file) return;
    if (!TIPOS.includes(file.type)) {
      toast(t("img.invalid"), "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast(t("img.tooBig"), "error");
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
      toast(t("img.saved"));
    } catch (err) {
      toast(errorText(err, t), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onRemove();
      toast(t("img.removed"));
    } catch (err) {
      toast(errorText(err, t), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`image-upload image-upload-${variant}`}>
      <button type="button" className="image-upload-btn" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? (
          <span className="image-upload-busy">{t("img.uploading")}</span>
        ) : url ? (
          <img src={url} alt="" className="image-upload-preview" />
        ) : (
          <span className="image-upload-empty">
            <Camera size={variant === "square" ? 26 : 30} aria-hidden="true" />
            <span>{t("img.upload")}</span>
          </span>
        )}
      </button>
      <div className="image-upload-meta">
        <small className="muted">{t("img.hint")}</small>
        <span className="image-upload-actions">
          <button type="button" className="text-link" onClick={() => input.current?.click()} disabled={busy}>
            <Upload size={14} aria-hidden="true" /> {url ? t("img.change") : t("img.upload")}
          </button>
          {url && (
            <button type="button" className="text-danger" onClick={remove} disabled={busy}>
              <X size={14} aria-hidden="true" /> {t("img.remove")}
            </button>
          )}
        </span>
      </div>
      <input ref={input} type="file" accept={TIPOS.join(",")} onChange={handle} className="sr-only" aria-label={t("img.upload")} />
    </div>
  );
}

/** Botón compacto para celdas de tabla: abre un diálogo con <ImageUpload/> dentro. */
export function ImageButton({ url, onUpload, onRemove, title }: Pick<Props, "url" | "onUpload" | "onRemove"> & { title: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-button image-button" onClick={() => setOpen(true)} aria-label={t("img.upload")} title={t("img.upload")}>
        {url ? (
          <img className="thumb" src={url} alt="" />
        ) : (
          <Camera size={17} aria-hidden="true" />
        )}
      </button>
      <Dialog open={open} title={title} onClose={() => setOpen(false)}>
        <ImageUpload url={url} onUpload={onUpload} onRemove={onRemove} />
      </Dialog>
    </>
  );
}
