import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

export default function RoleShell({
  sidebar,
  header,
  footer,
  sidebarWidth = 200,
  children,
  rootStyle,
  menuButtonClassName = "text-gray-400 hover:text-white hover:bg-white/5",
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const shellStyle = {
    "--role-sidebar-width": `${sidebarWidth}px`,
    background: "#0D1117",
    color: "#E6EDF3",
    ...rootStyle,
  };

  return (
    <div className="flex h-screen font-sans" style={shellStyle}>
      <aside className="role-shell__sidebar hidden lg:flex h-screen fixed left-0 top-0 flex-col bg-[#111418] border-r border-white/10 flex-shrink-0">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" aria-hidden={!mobileOpen}>
          <button
            type="button"
            className="absolute inset-0 w-full h-full bg-black/70"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="role-shell__sidebar absolute left-0 top-0 h-full flex flex-col bg-[#111418] border-r border-white/10 shadow-2xl"
            aria-label="Mobile navigation"
            onClick={(event) => {
              if (event.target.closest("a")) {
                setMobileOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => {
                setMobileOpen(false);
                triggerRef.current?.focus();
              }}
              className="absolute right-3 top-3 z-10 w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="role-shell__main flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-3 flex-shrink-0 sticky top-0 z-40 bg-[#111418] border-b border-white/10">
          <button
            ref={triggerRef}
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className={`lg:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${menuButtonClassName}`}
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0">{header}</div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
}
