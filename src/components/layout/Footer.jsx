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
            © {new Date().getFullYear()} GrandStride. Bảo lưu mọi quyền.
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Điều khoản dịch vụ: Bản sao giả lập hệ thống')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Điều Khoản Dịch Vụ
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Chính sách bảo mật: Bản sao chính sách mô phỏng')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Chính Sách Bảo Mật
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Hỗ trợ kỹ thuật: support@grandstride.com')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Liên Hệ Hỗ Trợ
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Quy định đua ngựa chính thức: Áp dụng đầy đủ quy tắc tính trọng tải & thể thức nài ngựa.')
            }}
            className="text-xs text-on-surface-variant hover:text-secondary transition-colors duration-200 no-underline"
          >
            Luật Đua Ngựa
          </a>
        </nav>
      </div>
    </footer>
  )
}
