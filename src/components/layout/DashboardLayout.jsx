import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function DashboardLayout({ children, title }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow max-w-[1200px] w-full mx-auto px-6 sm:px-8 py-8">
        {title ? (
          <h1 className="font-serif text-2xl text-primary font-bold mb-6">{title}</h1>
        ) : null}
        {children}
      </main>
      <Footer onNavigate={(page) => page === 'dashboard' && navigate('/')} />
    </div>
  )
}
