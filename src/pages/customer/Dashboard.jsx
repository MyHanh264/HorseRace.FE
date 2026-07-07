import React from 'react'
import { useNavigate } from 'react-router-dom'
import { UPCOMING_RACES, TOP_HORSES, TOP_JOCKEYS } from '../../constants'
import RaceCard from '../../components/RaceCard'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import { useAuth } from '../../context/AuthContext'
import { getHomePathForRole } from '../../utils/token'
import {
  Calendar,
  MapPin,
  Award,
  Trophy,
  ChevronRight,
  Swords,
  ArrowRight,
  Target,
  Flag,
  Sparkles,
  Users,
  TrendingUp,
  Star,
} from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [activeRankTab, setActiveRankTab] = React.useState('combined')
  const [searchRank, setSearchRank] = React.useState('')

  const onNavigate = (page) => {
    if (page === 'signup') navigate('/register')
    else if (page === 'login') navigate('/login')
    else if (page === 'dashboard') navigate('/')
    else if (page === 'racedetails') {
      const home = getHomePathForRole(user?.role)
      if (isAuthenticated && home) navigate(home)
      else navigate('/login')
    }
  }

  const filteredHorses = TOP_HORSES.filter(
    (h) =>
      h.name.toLowerCase().includes(searchRank.toLowerCase()) ||
      h.stable.toLowerCase().includes(searchRank.toLowerCase())
  )

  const filteredJockeys = TOP_JOCKEYS.filter((j) =>
    j.name.toLowerCase().includes(searchRank.toLowerCase())
  )

  return (
    <div className="flex-grow pb-16 flex flex-col min-h-screen">
      <Navbar />

      {/* Top nav strip */}
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-3 hidden md:flex items-center gap-6 border-b border-outline-variant/10">
        <button
          onClick={() => onNavigate('racedetails')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary text-xs font-semibold uppercase tracking-wider transition-all bg-transparent border-none cursor-pointer py-1"
        >
          <Target className="w-4 h-4" />
          Giải đấu
        </button>
        <button
          onClick={() => onNavigate('racedetails')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary text-xs font-semibold uppercase tracking-wider transition-all bg-transparent border-none cursor-pointer py-1"
        >
          <Flag className="w-4 h-4" />
          Lịch đua
        </button>
        <button
          onClick={() => alert('Bảng xếp hạng lưu giữ kết quả từ năm 2024 đến năm 2026. Báo cáo chi tiết đang chuẩn bị tải!')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary text-xs font-semibold uppercase tracking-wider transition-all bg-transparent border-none cursor-pointer py-1"
        >
          <Trophy className="w-4 h-4" />
          Bảng xếp hạng
        </button>
      </div>

      {/* ── HERO SECTION ── */}
      <section className="relative w-full h-[75vh] min-h-[520px] max-h-[720px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/40 z-10" />
          <img
            alt="Horse Racing"
            className="w-full h-full object-cover object-center scale-105 filter brightness-90"
            referrerPolicy="no-referrer"
            src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=80"
          />
        </div>

        <div className="relative z-20 w-full max-w-[1280px] mx-auto px-6 sm:px-8 flex flex-col items-start gap-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/25 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
            <span className="text-secondary font-mono text-xs tracking-[0.2em] font-bold uppercase">
              Nền tảng quản lý đua ngựa hàng đầu
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-[58px] text-white font-bold leading-[1.1] max-w-3xl drop-shadow-xl">
            Nơi Những Nhà Vô Địch{' '}
            <span className="text-secondary">Ra Đời</span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
            Nắm quyền kiểm soát chuồng ngựa ưu tú nhất. Huấn luyện chiến mã
            thuần chủng hàng đầu, tham gia những vòng đua kịch tính và khẳng
            định huyền thoại của bạn trên đấu trường.
          </p>

          <div className="flex flex-wrap gap-4 mt-4">
            <button
              onClick={() => onNavigate('racedetails')}
              className="gs-btn gs-btn-secondary gs-btn-lg flex items-center gap-2 shadow-xl shadow-secondary/15"
            >
              <Target className="w-5 h-5" />
              Xem Lịch Đua
            </button>
            <button
              onClick={() => isAuthenticated ? onNavigate('racedetails') : onNavigate('signup')}
              className="gs-btn gs-btn-outline-emerald gs-btn-lg flex items-center gap-2"
            >
              {isAuthenticated ? (
                <>
                  <Users className="w-5 h-5" />
                  Vào Dashboard
                </>
              ) : (
                <>
                  <Star className="w-5 h-5" />
                  Đăng Ký Ngay
                </>
              )}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-8 mt-6 pt-6 border-t border-white/10">
            <div>
              <span className="text-2xl font-bold text-secondary">1,200+</span>
              <span className="block text-[11px] text-white/60 uppercase tracking-wider mt-0.5">Vận động viên</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-secondary">48</span>
              <span className="block text-[11px] text-white/60 uppercase tracking-wider mt-0.5">Vòng đua/năm</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-secondary">5</span>
              <span className="block text-[11px] text-white/60 uppercase tracking-wider mt-0.5">Vai trò</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-secondary">24/7</span>
              <span className="block text-[11px] text-white/60 uppercase tracking-wider mt-0.5">Giám sát</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── UPCOMING RACES ── */}
      <section className="py-12 w-full max-w-[1280px] mx-auto px-6 sm:px-8 mt-[-80px] relative z-30">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-mono font-bold tracking-widest uppercase">
                Trận Đấu Trực Tiếp
              </span>
            </div>
            <h2 className="font-serif text-3xl text-on-surface font-bold mt-1">
              Vòng Đua Sắp Diễn Ra
            </h2>
          </div>
          <button
            onClick={() => onNavigate('racedetails')}
            className="hidden sm:flex items-center gap-2 text-primary hover:text-primary/80 text-xs font-bold uppercase tracking-wider transition-all bg-transparent border-none cursor-pointer"
          >
            Lịch Trình Chi Tiết
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex overflow-x-auto gap-5 pb-6 no-scrollbar snap-x scroll-smooth">
          {UPCOMING_RACES.map((race, i) => (
            <div key={race.id} className={`animate-fade-in-up delay-row-${(i % 4) + 1}`} style={{ opacity: 0, animationFillMode: 'forwards' }}>
              <RaceCard race={race} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      </section>

      {/* ── MAIN BENTO GRID ── */}
      <section className="py-12 w-full max-w-[1280px] mx-auto px-6 sm:px-8 flex flex-col lg:flex-row gap-6">

        {/* Featured Tournament Widget */}
        <div className="flex-1 gs-card-glow flex flex-col justify-between overflow-hidden">
          <div>
            <div className="h-56 relative w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/90 to-surface-container-lowest/30 mix-blend-multiply z-10" />
              <img
                alt="Paddock at dusk"
                className="w-full h-full object-cover z-0"
                referrerPolicy="no-referrer"
                src="https://images.unsplash.com/photo-1534773728080-33d31da027cf?w=800&q=80"
              />
              <div className="absolute top-4 left-4 z-20">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(11,20,28,0.85)] backdrop-blur-md text-primary text-xs font-bold uppercase tracking-wider border border-primary/25">
                  <Star className="w-3.5 h-3.5" />
                  Sự Kiện Nổi Bật
                </span>
              </div>
              {/* Corner gold glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-secondary/20 to-transparent z-10 pointer-events-none" />
            </div>

            <div className="p-6">
              <h2 className="font-serif text-3xl text-on-surface font-bold mb-3 leading-tight">
                Giải Đấu Triple Crown<br />
                <span className="text-secondary">Danh Giá</span>
              </h2>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                Giải đấu danh giá và đầy kịch tính nhất của mùa giải đua năm nay.
                Chỉ những chuồng ngựa tinh anh hàng đầu được mời tham gia tranh tài
                giành vinh quang huyền thoại.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="gs-card-surface p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[10px] block uppercase tracking-wider font-bold mb-0.5">Thời Gian</span>
                    <span className="text-on-surface text-xs font-bold font-mono">12 - 20 thg 11</span>
                  </div>
                </div>

                <div className="gs-card-surface p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[10px] block uppercase tracking-wider font-bold mb-0.5">Địa Điểm</span>
                    <span className="text-on-surface text-xs font-bold">Trường Đua Ảo Ascot</span>
                  </div>
                </div>

                <div className="gs-card-surface p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Swords className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[10px] block uppercase tracking-wider font-bold mb-0.5">Số Kỳ Đua</span>
                    <span className="text-on-surface text-xs font-bold font-mono">12 Trận đua</span>
                  </div>
                </div>

                <div className="gs-card-glow p-4 flex items-start gap-3 relative overflow-hidden border border-secondary/30">
                  <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-secondary/10 rounded-full blur-xl" />
                  <div className="w-9 h-9 rounded-lg bg-secondary/15 border border-secondary/25 flex items-center justify-center shrink-0">
                    <Award className="w-4.5 h-4.5 text-secondary" />
                  </div>
                  <div>
                    <span className="text-secondary text-[10px] block uppercase tracking-wider font-bold mb-0.5">Quỹ Giải Thưởng</span>
                    <span className="text-secondary text-lg font-extrabold font-mono leading-none">1,500,000 GS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-0">
            <button
              onClick={() => alert('Hệ thống đang tải Trung tâm Giải đấu: Đăng ký sơ tuyển và Lịch đấu chủng tộc sẽ sớm công bố!')}
              className="w-full gs-btn gs-btn-secondary py-3.5 flex items-center justify-center gap-2"
            >
              <Trophy className="w-4.5 h-4.5" />
              Cổng Giải Đấu
            </button>
          </div>
        </div>

        {/* Live Leaderboard */}
        <div className="w-full lg:w-[410px] gs-card flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-outline-variant/30 bg-surface-container-high/30 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-secondary" />
                </div>
                <h2 className="font-serif text-lg text-on-surface font-bold leading-none">
                  Bảng Xếp Hạng
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error" />
                </span>
                <span className="text-[10px] text-error font-bold uppercase tracking-wider">Live</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-5 pt-4 pb-3 flex gap-1 border-b border-outline-variant/10">
            {[
              { key: 'combined', label: 'Tất Cả' },
              { key: 'horses', label: 'Chiến Mã' },
              { key: 'jockeys', label: 'Nài Ngựa' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveRankTab(tab.key); setSearchRank('') }}
                className={`flex-1 pb-3 text-xs font-bold tracking-wider uppercase text-center border-b-2 transition-all cursor-pointer ${
                  activeRankTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between">
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Tìm chiến mã hoặc nài ngựa..."
                value={searchRank}
                onChange={(e) => setSearchRank(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-xs rounded-xl px-3.5 py-2.5 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
              />
            </div>

            <div className="space-y-5 overflow-y-auto max-h-[320px] no-scrollbar pr-1 flex-grow">
              {/* Horses */}
              {(activeRankTab === 'combined' || activeRankTab === 'horses') && (
                <div>
                  <h3 className="text-secondary font-mono text-[10px] uppercase tracking-widest mb-3 font-bold pb-1 border-b border-outline-variant/20 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    Chiến Mã Hàng Đầu
                  </h3>
                  <div className="flex flex-col gap-1">
                    {filteredHorses.length > 0 ? (
                      filteredHorses.map((horse) => (
                        <div
                          key={horse.name}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            {/* Rank */}
                            <div className={`trophy-badge trophy-${horse.rank === 1 ? '1st' : horse.rank === 2 ? '2nd' : '3rd'}`}>
                              {horse.rank === 1 ? '★' : horse.rank}
                            </div>
                            <div>
                              <span className="text-on-surface text-sm font-semibold block group-hover:text-primary transition-colors">{horse.name}</span>
                              <span className="text-on-surface-variant text-[11px]">Chuồng: {horse.stable}</span>
                            </div>
                          </div>
                          <span className="text-on-surface font-mono text-xs font-bold bg-surface-container px-2.5 py-1 rounded-lg">
                            {horse.pts.toLocaleString()} điểm
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-on-surface-variant/60 py-3 italic text-center">Không tìm thấy chiến mã nào.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Jockeys */}
              {(activeRankTab === 'combined' || activeRankTab === 'jockeys') && (
                <div className={activeRankTab === 'combined' ? 'pt-2' : ''}>
                  <h3 className="text-secondary font-mono text-[10px] uppercase tracking-widest mb-3 font-bold pb-1 border-b border-outline-variant/20 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    Nài Ngựa Xuất Sắc
                  </h3>
                  <div className="flex flex-col gap-1">
                    {filteredJockeys.length > 0 ? (
                      filteredJockeys.map((jockey) => (
                        <div
                          key={jockey.name}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 ${
                              jockey.rank === 1
                                ? 'bg-secondary/15 border-secondary/40 text-secondary'
                                : 'bg-surface-container-high border-outline-variant/50 text-on-surface-variant'
                            }`}>
                              {jockey.initials}
                            </div>
                            <span className="text-on-surface text-sm font-semibold group-hover:text-primary transition-colors">{jockey.name}</span>
                          </div>
                          <span className="text-on-surface font-mono text-xs font-bold bg-surface-container px-2.5 py-1 rounded-lg">
                            {jockey.wins} thắng
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-on-surface-variant/60 py-3 italic text-center">Không tìm thấy nài ngựa nào.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="mt-5 pt-4 border-t border-outline-variant/20 text-center">
              <button
                onClick={() => alert('Bảng xếp hạng lưu giữ kết quả từ năm 2024 đến năm 2026.')}
                className="inline-flex items-center gap-2 text-on-surface-variant hover:text-secondary text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-none"
              >
                Xem Toàn Bộ BXH
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="py-12 w-full max-w-[1280px] mx-auto px-6 sm:px-8">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl font-bold text-on-surface mb-2">
            Tại Sao Chọn GrandStride?
          </h2>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto">
            Nền tảng quản lý đua ngựa toàn diện dành cho những người yêu thể thao đỉnh cao.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: <TrendingUp className="w-6 h-6 text-primary" />,
              title: 'Quản Lý Chuyên Nghiệp',
              desc: 'Theo dõi toàn bộ hoạt động của chuồng ngựa, lịch thi đấu và kết quả đua một cách chi tiết.',
            },
            {
              icon: <Users className="w-6 h-6 text-primary" />,
              title: 'Cộng Đồng Đua Ngựa',
              desc: 'Kết nối với những người yêu đua ngựa, chia sẻ kinh nghiệm và cùng nhau phát triển.',
            },
            {
              icon: <Award className="w-6 h-6 text-secondary" />,
              title: 'Giải Thưởng Hấp Dẫn',
              desc: 'Tham gia các giải đấu với quỹ giải thưởng lên đến hàng triệu GS và nhận nhiều ưu đãi.',
            },
          ].map((feat, i) => (
            <div key={i} className={`gs-card p-6 animate-fade-in-up delay-row-${i + 1}`} style={{ opacity: 0, animationFillMode: 'forwards' }}>
              <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center mb-4">
                {feat.icon}
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface mb-2">{feat.title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
