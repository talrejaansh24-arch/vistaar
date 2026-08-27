import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DesignResultsPage from './pages/DesignResultsPage';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import DashboardPage from './pages/DashboardPage';
import InquiryPage from './pages/InquiryPage';
import AdminPage from './pages/AdminPage';
import useStore from './store/useStore';

function App() {
  const { loading, fetchSiteConfig } = useStore();

  useEffect(() => {
    fetchSiteConfig();
  }, [fetchSiteConfig]);

  return (
    <HashRouter>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-logo">💧</div>
          <p style={{ color: 'var(--text-secondary)' }}>Generating your designs...</p>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      )}
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/designs" element={<DesignResultsPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inquiry" element={<InquiryPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  );
}

export default App;
