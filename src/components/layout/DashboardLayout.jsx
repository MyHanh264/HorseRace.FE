import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function DashboardLayout({ children, title }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow w-full px-6 sm:px-8 py-8">
        <div className="max-w-[1280px] mx-auto">
          {title ? (
            <div className="mb-8 animate-fade-in-up">
              <h1 className="font-serif text-3xl text-on-surface font-bold tracking-tight">{title}</h1>
              <div className="mt-2 h-[3px] w-16 rounded-full bg-gradient-to-r from-primary to-secondary" />
            </div>
          ) : null}
          {children}
        </div>
      </main>
      <Footer onNavigate={(page) => page === 'dashboard' && navigate('/')} />
    </div>
  )
}
