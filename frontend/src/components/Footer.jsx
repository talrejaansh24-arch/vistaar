import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>
              <img src="/logo.png" alt="Logo" style={{ height: '24px', borderRadius: '50%', verticalAlign: 'middle', marginRight: '8px' }} />
              Vist<span className="gradient-text">aarWater</span>
            </h3>
            <p>Premium custom branded water bottles for your business. Design, customize, and order in bulk.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/inquiry">Get Quote</Link>
            <Link to="/login">Login</Link>
          </div>
          <div className="footer-links">
            <h4>Bottle Sizes</h4>
            <span>250ml — Events & Meetings</span>
            <span>500ml — Hotels & Restaurants</span>
            <span>1000ml — Gyms & Premium</span>
          </div>
          <div className="footer-links">
            <h4>Contact</h4>
            <span>📧 vistaarwater@gmail.com</span>
            <span>📞 +91 7000689145</span>
            <span>📍 Indore, India</span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 VistaarWater. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
