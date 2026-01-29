import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Search } from './pages/Search'
import { Profile } from './pages/Profile'
import { AdminPage } from './pages/AdminPage'

// Premium Header Component
function Header() {
  const location = useLocation()

  const isHomePage = location.pathname === '/'
  const isProfilePage = location.pathname.startsWith('/supporters/')
  const isAdminPage = location.pathname === '/admin'

  const navItems = [
    { path: '/', label: 'Search', active: isHomePage },
    { path: '/admin', label: 'Admin', active: isAdminPage },
  ]

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-white/90">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Supporter 360</h1>
              <p className="text-xs text-slate-500">Shamrock Rovers FC</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${item.active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Quick Stats (only on home) */}
          {isHomePage && (
            <div className="hidden lg:flex items-center space-x-6 text-sm">
              <div className="flex items-center text-slate-600">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                <span className="text-slate-500">System Online</span>
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

// Breadcrumb Component for Profile Pages
function Breadcrumbs() {
  const location = useLocation()

  if (!location.pathname.startsWith('/supporters/')) {
    return null
  }

  return (
    <nav className="flex items-center space-x-2 text-sm mb-4" aria-label="Breadcrumb">
      <Link
        to="/"
        className="text-slate-500 hover:text-slate-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="text-slate-900 font-medium">Profile</span>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-6">
          <Breadcrumbs />
          <Routes>
            <Route path="/" element={<Search />} />
            <Route path="/supporters/:id" element={<Profile />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        {/* Premium Footer */}
        <footer className="bg-white border-t border-slate-200 mt-auto">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500">
              <p>&copy; {new Date().getFullYear()} Shamrock Rovers FC. Internal use only.</p>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                  v1.0.0
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
