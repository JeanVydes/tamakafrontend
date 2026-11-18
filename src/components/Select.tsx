import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Texto cuando el valor no coincide con ninguna opción (p. ej. «Elige un atractivo»). */
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

interface Placement {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

/**
 * Selector propio de TAMAKA (reemplaza al <select> del navegador, cuyo desplegable no se puede estilizar).
 * Patrón combobox/listbox: el foco se queda en el botón y las flechas mueven la opción activa.
 * La lista se pinta en el body para que ninguna tarjeta ni diálogo la recorte.
 */
export function Select({ value, onChange, options, placeholder = "", disabled = false, ariaLabel }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<Placement | null>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const current = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const show = () => {
    if (disabled || options.length === 0) return;
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };

  const choose = (i: number) => {
    const option = options[i];
    if (option) onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  };

  // Coloca la lista bajo el botón, o encima si abajo no cabe.
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const wanted = Math.min(options.length * 42 + 14, 300);
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    const up = below < wanted && above > below;
    setPlace({
      left: r.left,
      width: Math.max(r.width, 200),
      maxHeight: Math.max(120, Math.min(300, up ? above : below)),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!trigger.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    };
    const away = (e: Event) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId depende solo de id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open, place]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(a + 1, last));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Escribir una letra salta a la siguiente opción que empiece por ella.
          const ch = fold(e.key);
          const from = active + 1;
          const hit = [...options.slice(from), ...options.slice(0, from)].find((o) => fold(o.label).startsWith(ch));
          if (hit) setActive(options.indexOf(hit));
        }
    }
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span className={current ? "select-value" : "select-value placeholder"}>{current?.label ?? placeholder}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open &&
        place &&
        createPortal(
          <div
            ref={menu}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="select-menu"
            style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={i === selectedIndex}
                className={`select-option${i === selectedIndex ? " selected" : ""}${i === active ? " active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                <span>{o.label}</span>
                {i === selectedIndex && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
