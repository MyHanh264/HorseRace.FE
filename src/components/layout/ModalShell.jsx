import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function ModalShell({
  children,
  onClose,
  labelledBy,
  className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm",
  closeOnBackdrop = true,
}) {
  const rootRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = rootRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus?.();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;
      const elements = Array.from(rootRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? []);
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      {children}
    </div>
  );
}
