import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { authAPI, designAPI, API_ORIGIN } from '../api/client';
import useStore from '../store/useStore';
import './AuthPages.css';

/* ── Google SVG Icon ── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { setAuth, setGeneratedDesigns, setDesignInput, setLoading: setGlobalLoading } = useStore();
  const navigate = useNavigate();

  // OTP
  const [step, setStep] = useState('credentials');
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs
  const pageRef = useRef(null);
  const cardRef = useRef(null);
  const brandRef = useRef(null);
  const headingRef = useRef(null);
  const subtitleRef = useRef(null);
  const formRef = useRef(null);
  const footerRef = useRef(null);
  const demoRef = useRef(null);
  const otpSectionRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Left panel refs
  const taglineRef = useRef(null);
  const h1Ref = useRef(null);
  const descRef = useRef(null);
  const tmplRowRef = useRef(null);
  const trustRef = useRef(null);
  const floatRefs = useRef([]);

  // ── GSAP Master Timeline ──
  useEffect(() => {
    // Set initial positions before animating
    if (cardRef.current) gsap.set(cardRef.current, { opacity: 0, y: 24 });
    if (brandRef.current) gsap.set(brandRef.current, { opacity: 0, y: 10 });
    if (headingRef.current) gsap.set(headingRef.current, { opacity: 0, y: 10 });
    if (subtitleRef.current) gsap.set(subtitleRef.current, { opacity: 0, y: 8 });
    if (formRef.current) gsap.set(formRef.current, { opacity: 0, y: 14 });
    if (footerRef.current) gsap.set(footerRef.current, { opacity: 0 });
    if (demoRef.current) gsap.set(demoRef.current, { opacity: 0 });
    if (taglineRef.current) gsap.set(taglineRef.current, { opacity: 0, y: 14 });
    if (h1Ref.current) gsap.set(h1Ref.current, { opacity: 0, y: 20 });
    if (descRef.current) gsap.set(descRef.current, { opacity: 0, y: 14 });
    if (tmplRowRef.current) gsap.set(tmplRowRef.current, { opacity: 0, y: 18 });
    if (trustRef.current) gsap.set(trustRef.current, { opacity: 0, y: 12 });

    const ctx = gsap.context(() => {
      // ─── Left panel entrance ───
      const ltl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (taglineRef.current) ltl.to(taglineRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.1);
      if (h1Ref.current) ltl.to(h1Ref.current, { opacity: 1, y: 0, duration: 0.6 }, 0.25);
      if (descRef.current) ltl.to(descRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.4);
      if (tmplRowRef.current) ltl.to(tmplRowRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.5);
      if (trustRef.current) ltl.to(trustRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.65);

      // Floating shapes
      floatRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, { opacity: 1, duration: 1, delay: 0.3 + i * 0.15 });
        gsap.to(el, {
          y: `${10 + i * 5}`,
          x: `${5 - i * 3}`,
          rotation: i * 8,
          duration: 3 + i * 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.4,
        });
      });

      // Template cards float
      gsap.utils.toArray('.auth-tmpl-card').forEach((card, i) => {
        gsap.to(card, {
          y: -6 - i * 3,
          duration: 2.5 + i * 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.3,
        });
      });

      // ─── Right panel entrance ───
      const rtl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (cardRef.current) rtl.to(cardRef.current, { opacity: 1, y: 0, duration: 0.65 }, 0.3);
      if (brandRef.current) rtl.to(brandRef.current, { opacity: 1, y: 0, duration: 0.4 }, 0.55);
      if (headingRef.current) rtl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.45 }, 0.65);
      if (subtitleRef.current) rtl.to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.4 }, 0.75);
      if (formRef.current) rtl.to(formRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.8);
      if (footerRef.current) rtl.to(footerRef.current, { opacity: 1, duration: 0.35 }, 1);
      if (demoRef.current) rtl.to(demoRef.current, { opacity: 1, duration: 0.35 }, 1.05);

    }, pageRef);

    return () => ctx.revert();
  }, []);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ── Animate to OTP ──
  const animateToOtp = useCallback(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.to(formRef.current, { opacity: 0, y: -10, duration: 0.25 });
    tl.to([footerRef.current, demoRef.current], { opacity: 0, duration: 0.2 }, '<');
    tl.call(() => setStep('otp'));
    tl.fromTo(otpSectionRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45 }, '+=0.08');
  }, []);

  // ── Animate back ──
  const animateBack = useCallback(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.to(otpSectionRef.current, { opacity: 0, y: -10, duration: 0.25 });
    tl.call(() => { setStep('credentials'); setOtp(['','','','','','']); setError(''); });
    tl.fromTo(formRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35 }, '+=0.05');
    tl.fromTo(footerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 }, '<0.08');
    tl.fromTo(demoRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 }, '<');
  }, []);

  // ── Handle pending design generation after login ──
  const handlePendingDesign = async () => {
    const pendingRaw = localStorage.getItem('vistaarwater_pending_design');
    if (!pendingRaw) return false;
    try {
      const pendingForm = JSON.parse(pendingRaw);
      localStorage.removeItem('vistaarwater_pending_design');
      setGlobalLoading(true);
      const res = await designAPI.generate(pendingForm);
      setGeneratedDesigns(res.data.designs);
      setDesignInput(pendingForm);
      setGlobalLoading(false);
      navigate('/designs');
      return true;
    } catch (err) {
      console.error('Pending design generation failed:', err);
      localStorage.removeItem('vistaarwater_pending_design');
      setGlobalLoading(false);
      return false;
    }
  };

  // ── Google Sign-In ──
  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Sign-In is not configured yet.');
      return;
    }

    if (!window.google?.accounts?.id) {
      setError('Google Sign-In is still loading. Please try again.');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setError('');
        setLoading(true);
        try {
          const res = await authAPI.googleLogin({ credential: response.credential });
          setAuth(res.data.user, res.data.access_token);
          const handled = await handlePendingDesign();
          if (!handled) {
            navigate(res.data.user?.role === 'admin' ? '/admin' : '/dashboard');
          }
        } catch (err) {
          setError(err.response?.data?.detail || 'Google login failed');
        } finally {
          setLoading(false);
        }
      },
    });

    window.google.accounts.id.prompt((notification) => {
      // If One Tap is dismissed or skipped, fallback to popup
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        window.google.accounts.id.renderButton(
          document.createElement('div'),
          { theme: 'filled_black', size: 'large' }
        );
        // Use the popup method instead
        window.google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: 'email profile',
          callback: () => {},
        });
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authAPI.login(form);
      if (typeof res.data === 'string' && res.data.includes('<html')) {
        setError('Error: Your VITE_API_ORIGIN in Render is incorrect. It is pointing to the Frontend URL instead of the Backend URL.');
        return;
      }
      if (res.data.requires_otp) {
        setOtpEmail(res.data.email);
        setResendCooldown(30);
        animateToOtp();
      } else if (res.data.access_token) {
        setAuth(res.data.user, res.data.access_token);
        // Check for pending design first
        const handled = await handlePendingDesign();
        if (!handled) {
          navigate(res.data.user?.role === 'admin' ? '/admin' : '/dashboard');
        }
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  // ── OTP handlers ──
  const handleOtpChange = (idx, value) => {
    if (!/^\d*$/.test(value)) return;
    const n = [...otp]; n[idx] = value.slice(-1); setOtp(n);
    if (value && idx < 5) otpInputRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpInputRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setOtp(p.split('')); otpInputRefs.current[5]?.focus(); }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the full 6-digit code'); return; }
    setError(''); setOtpLoading(true);
    try {
      const res = await authAPI.verifyOtp({ email: otpEmail, otp_code: code });
      setAuth(res.data.user, res.data.access_token);
      // Check for pending design first
      const handled = await handlePendingDesign();
      if (!handled) {
        gsap.to(cardRef.current, { scale: 0.97, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => navigate('/dashboard') });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP');
      gsap.fromTo('.otp-inputs', { x: -5 }, { x: 5, duration: 0.07, repeat: 5, yoyo: true, ease: 'power1.inOut' });
    } finally { setOtpLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try { await authAPI.sendOtp({ email: otpEmail }); setResendCooldown(30); setError(''); }
    catch { setError('Failed to resend OTP'); }
  };

  // Auto-submit
  useEffect(() => {
    if (step === 'otp' && otp.every(d => d !== '')) handleVerifyOtp();
  }, [otp, step]);

  return (
    <div className="auth-page" ref={pageRef}>

      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-left">
        {/* Floating decorative shapes */}
        <div className="auth-float-shape auth-float-shape--1" ref={el => floatRefs.current[0] = el} />
        <div className="auth-float-shape auth-float-shape--2" ref={el => floatRefs.current[1] = el} />
        <div className="auth-float-shape auth-float-shape--3" ref={el => floatRefs.current[2] = el} />
        <div className="auth-float-shape auth-float-shape--4" ref={el => floatRefs.current[3] = el} />

        <div className="auth-left-content">
          <div className="auth-left-tagline" ref={taglineRef}>
            <span className="dot" />
            AI-Powered Design Platform
          </div>

          <h1 ref={h1Ref}>
            Create <span className="gradient-text">Stunning Designs</span> in Seconds with AI
          </h1>

          <p className="auth-left-desc" ref={descRef}>
            Generate posters, banners, social media creatives and branded water bottle labels instantly. Premium design tools for businesses of all sizes.
          </p>

          {/* Template preview cards */}
          <div className="auth-templates-row" ref={tmplRowRef}>
            <div className="auth-tmpl-card auth-tmpl-card--1">
              <div className="auth-tmpl-inner">
                <div className="auth-tmpl-shape auth-tmpl-shape--circle" />
                <div className="auth-tmpl-lines">
                  <div className="auth-tmpl-line" />
                  <div className="auth-tmpl-line" />
                  <div className="auth-tmpl-line" />
                </div>
              </div>
            </div>
            <div className="auth-tmpl-card auth-tmpl-card--2">
              <div className="auth-tmpl-inner">
                <div className="auth-tmpl-shape auth-tmpl-shape--diamond" />
                <div className="auth-tmpl-lines">
                  <div className="auth-tmpl-line" />
                  <div className="auth-tmpl-line" />
                  <div className="auth-tmpl-line" />
                </div>
              </div>
            </div>
            <div className="auth-tmpl-card auth-tmpl-card--3">
              <div className="auth-tmpl-inner">
                <div className="auth-tmpl-shape auth-tmpl-shape--hex" />
                <div className="auth-tmpl-lines">
                  <div className="auth-tmpl-line" />
                  <div className="auth-tmpl-line" />
                  <div className="auth-tmpl-line" />
                </div>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="auth-trust" ref={trustRef}>
            <div className="auth-trust-item">
              <span className="auth-trust-num">10K+</span>
              <span className="auth-trust-label">Designs Created</span>
            </div>
            <div className="auth-trust-item">
              <span className="auth-trust-num">2K+</span>
              <span className="auth-trust-label">Active Users</span>
            </div>
            <div className="auth-trust-item">
              <span className="auth-trust-num">15+</span>
              <span className="auth-trust-label">Templates</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="auth-right">
        <div className="auth-card" ref={cardRef}>
          <div className="auth-brand" ref={brandRef}>
            <img src="/logo.png" alt="VistaarWater Logo" style={{ height: '28px', borderRadius: '50%', marginRight: '8px' }} />
            <span className="auth-brand-name">VISTAARWATER</span>
          </div>

          <h2 ref={headingRef}>Welcome back</h2>
          <p className="auth-subtitle" ref={subtitleRef}>Sign in to continue to your workspace</p>

          {error && <div className="auth-error">{error}</div>}

          {/* ─── Step 1: Credentials ─── */}
          <form className="auth-form" ref={formRef} onSubmit={handleSubmit} style={{ display: step === 'credentials' ? 'flex' : 'none' }}>
            <div className="auth-input-group">
              <label>Email address</label>
              <input className="auth-input" type="email" placeholder="you@business.com" required autoComplete="email"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="auth-input-group">
              <label>Password</label>
              <div className="auth-input-wrap">
                <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" required autoComplete="current-password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="auth-options-row">
              <label className="auth-remember">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" className="auth-forgot">Forgot password?</a>
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? <><span className="auth-btn-spinner" /> Signing in...</> : 'Sign In'}
            </button>
            <div className="auth-divider"><span>or continue with</span></div>
            <button type="button" className="auth-google-btn" onClick={handleGoogleLogin} disabled={loading}>
              <GoogleIcon /> Continue with Google
            </button>
          </form>

          {/* ─── Step 2: OTP ─── */}
          <div className="otp-section" ref={otpSectionRef} style={{ display: step === 'otp' ? 'flex' : 'none' }}>
            <p className="otp-email-hint">We sent a 6-digit code to <strong>{otpEmail}</strong></p>
            <div className="otp-inputs" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input key={idx} ref={el => otpInputRefs.current[idx] = el}
                  className={`otp-box ${digit ? 'filled' : ''}`} type="text" inputMode="numeric" maxLength={1}
                  value={digit} onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)} autoFocus={idx === 0} />
              ))}
            </div>
            <button className="auth-submit" onClick={handleVerifyOtp} disabled={otpLoading || otp.join('').length !== 6}>
              {otpLoading ? <><span className="auth-btn-spinner" /> Verifying...</> : 'Verify OTP'}
            </button>
            <p className="otp-resend">
              Didn't receive it?
              <button onClick={handleResend} disabled={resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </p>
            <button className="otp-back-btn" onClick={animateBack}>← Back to login</button>
          </div>

          <p className="auth-footer" ref={footerRef} style={{ display: step === 'credentials' ? 'block' : 'none' }}>Don't have an account? <Link to="/register">Create one</Link></p>

        </div>
      </div>
    </div>
  );
}
