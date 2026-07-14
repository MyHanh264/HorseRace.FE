export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-[rgba(6,15,22,0.95)] border-t border-outline-variant/30 py-10 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 sm:px-8 max-w-[1280px] mx-auto gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <button
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="font-serif text-2xl text-primary font-bold tracking-tight hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer bg-transparent border-none p-0"
          >
            GrandStride
          </button>
          <p className="font-sans text-xs text-on-surface-variant/60 text-center md:text-left leading-relaxed">
            © {new Date().getFullYear()} GrandStride. All rights reserved.
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Terms of Service: System simulation placeholder copy')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Terms of Service
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Privacy Policy: Simulated policy placeholder copy')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Technical Support: support@grandstride.com')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Contact Support
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Official Racing Rules: Full weight allowance and jockey format rules apply.')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Racing Rules
          </a>
        </nav>
      </div>
    </footer>
  )
}
