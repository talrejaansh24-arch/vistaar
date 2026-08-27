import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { navbarScrollEffect, cartBounce } from '../utils/animations';
import logoImg from '/logo.png';
import './Navbar.css';

export default function Navbar() {
  const { user, cart, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const cartIconRef = useRef(null);
  const prevCartLen = useRef(cart.length);

  // Scroll shrink effect
  useEffect(() => {
    if (navRef.current) navbarScrollEffect(navRef.current);
  }, []);

  // Cart bounce when items added
  useEffect(() => {
    if (cart.length > prevCartLen.current && cartIconRef.current) {
      cartBounce(cartIconRef.current);
    }
    prevCartLen.current = cart.length;
  }, [cart.length]);

  const handleLogout = () => { logout(); navigate('/'); };
  return (
    <nav className="navbar glass" ref={navRef}>
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src={logoImg} alt="VistaarWater Logo" className="navbar-logo" />
          <span className="brand-text">Vist<span className="gradient-text">aarWater</span></span>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          type="button"
        >
          <span className={`hamburger ${menuOpen ? 'active' : ''}`} />
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={location.pathname === '/' ? 'nav-active' : ''} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/designs" className={location.pathname === '/designs' ? 'nav-active' : ''} onClick={() => setMenuOpen(false)}>Designs</Link>
          <Link to="/inquiry" className={location.pathname === '/inquiry' ? 'nav-active' : ''} onClick={() => setMenuOpen(false)}>Get Quote</Link>

          {user ? (
            <>
              <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'nav-active' : ''} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              {user.role === 'admin' && <Link to="/admin" className={location.pathname === '/admin' ? 'nav-active' : ''} onClick={() => setMenuOpen(false)}>Admin</Link>}
              <Link to="/cart" className="cart-link" onClick={() => setMenuOpen(false)} ref={cartIconRef}>
                Cart <span className="cart-count">{cart.length}</span>
              </Link>
              <div className="user-menu">
                <span className="user-avatar">{(user.business_name || user.email || 'U').charAt(0).toUpperCase()}</span>
                <span className="user-name">{user.business_name || user.email}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
              </div>
            </>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="nav-login-btn" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="nav-signup-btn" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

