import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18n";
import { Select, type SelectOption } from "./Select";

const OTHER = "__otra";

/**
 * Categoría de un comercio o atractivo. El backend acepta cualquier texto (máx. 60), así que se ofrece una lista de
 * categorías habituales —para que los datos no se dispersen en «Tour», «TOURS», «tours»— y «Otra categoría…», que
 * abre un campo de texto para escribir una propia.
 */
export function CategoryField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: SelectOption[] }) {
  const { t } = useI18n();
  const known = options.some((o) => o.value === value);
  const [custom, setCustom] = useState(false);

  // Si el valor llega de fuera (editar un registro con una categoría propia) se abre directamente el campo de texto.
  useEffect(() => {
    if (value !== "" && !known) setCustom(true);
  }, [value, known]);

  const choice = custom ? OTHER : known ? value : "";

  const choose = (v: string) => {
    if (v === OTHER) {
      setCustom(true);
      if (known) onChange("");
    } else {
      setCustom(false);
      onChange(v);
    }
  };

  return (
    <div className="field">
      <span>{label}</span>
      <Select
        ariaLabel={label}
        value={choice}
        placeholder={t("cat.choose")}
        onChange={choose}
        options={[...options, { value: OTHER, label: t("cat.other") }]}
      />
      {custom && (
        <input
          required
          autoFocus
          maxLength={60}
          value={value}
          placeholder={t("cat.customPlaceholder")}
          aria-label={t("cat.customPlaceholder")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/** Forma normalizada con la que se guarda una categoría: MAYÚSCULAS y guion bajo en vez de espacios. */
export const normalizeCategory = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "_");
