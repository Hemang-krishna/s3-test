import './App.css'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import { NavLink, Route, Routes } from './router'

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Minimal S3 media upload test</p>
          <h1>S3 Media Studio</h1>
          <p className="subtle">
            Upload media to S3 with pre-signed URLs, save metadata to MySQL, and preview everything locally.
          </p>
        </div>
        <nav className="nav-tabs" aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/upload">Upload</NavLink>
        </nav>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
