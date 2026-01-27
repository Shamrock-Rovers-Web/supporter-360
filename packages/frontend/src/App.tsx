import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SearchPage } from './pages/SearchPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminPage } from './pages/AdminPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-700 text-white py-4 px-6 shadow-md">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Supporter 360</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/supporters/:id" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
