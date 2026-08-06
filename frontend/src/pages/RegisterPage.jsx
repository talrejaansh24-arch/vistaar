import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { authAPI } from '../api/client';
import useStore from '../store/useStore';
import './AuthPages.css';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', business_name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { setAuth } = useStore();
  const navigate = useNavigate();

  // OTP
  const [step, setStep] = useState('register');
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
  const otpSectionRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Left panel
  const taglineRef = useRef(null);
  const h1Ref = useRef(null);
  const descRef = useRef(null);
  const tmplRowRef = useRef(null);
  const trustRef = useRef(null);
  const floatRefs = useRef([]);

  // ── GSAP ──
  useEffect(() => {
    // Set initial positions before animating
    if (cardRef.current) gsap.set(cardRef.current, { opacity: 0, y: 24 });
    if (brandRef.current) gsap.set(brandRef.current, { opacity: 0, y: 10 });
    if (headingRef.current) gsap.set(headingRef.current, { opacity: 0, y: 10 });
    if (subtitleRef.current) gsap.set(subtitleRef.current, { opacity: 0, y: 8 });
    if (formRef.current) gsap.set(formRef.current, { opacity: 0, y: 14 });
    if (footerRef.current) gsap.set(footerRef.current, { opacity: 0 });
    if (taglineRef.current) gsap.set(taglineRef.current, { opacity: 0, y: 14 });
    if (h1Ref.current) gsap.set(h1Ref.current, { opacity: 0, y: 20 });
    if (descRef.current) gsap.set(descRef.current, { opacity: 0, y: 14 });
    if (tmplRowRef.current) gsap.set(tmplRowRef.current, { opacity: 0, y: 18 });
    if (trustRef.current) gsap.set(trustRef.current, { opacity: 0, y: 12 });

    const ctx = gsap.context(() => {
      const ltl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (taglineRef.current) ltl.to(taglineRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.1);
      if (h1Ref.current) ltl.to(h1Ref.current, { opacity: 1, y: 0, duration: 0.6 }, 0.25);
      if (descRef.current) ltl.to(descRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.4);
      if (tmplRowRef.current) ltl.to(tmplRowRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.5);
      if (trustRef.current) ltl.to(trustRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.65);

      floatRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, { opacity: 1, duration: 1, delay: 0.3 + i * 0.15 });
        gsap.to(el, { y: `${10 + i * 5}`, x: `${5 - i * 3}`, rotation: i * 8, duration: 3 + i * 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.4 });
      });

      gsap.utils.toArray('.auth-tmpl-card').forEach((card, i) => {
        gsap.to(card, { y: -6 - i * 3, duration: 2.5 + i * 0.8, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.3 });
      });

      const rtl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (cardRef.current) rtl.to(cardRef.current, { opacity: 1, y: 0, duration: 0.65 }, 0.3);
      if (brandRef.current) rtl.to(brandRef.current, { opacity: 1, y: 0, duration: 0.4 }, 0.55);
      if (headingRef.current) rtl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.45 }, 0.65);
      if (subtitleRef.current) rtl.to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.4 }, 0.75);
      if (formRef.current) rtl.to(formRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.8);
      if (footerRef.current) rtl.to(footerRef.current, { opacity: 1, duration: 0.35 }, 1);
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const animateToOtp = useCallback(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.to(formRef.current, { opacity: 0, y: -10, duration: 0.25 });
    tl.to(footerRef.current, { opacity: 0, duration: 0.2 }, '<');
    tl.call(() => setStep('otp'));
    tl.fromTo(otpSectionRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45 }, '+=0.08');
  }, []);

  const animateBack = useCallback(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.to(otpSectionRef.current, { opacity: 0, y: -10, duration: 0.25 });
    tl.call(() => { setStep('register'); setOtp(['','','','','','']); setError(''); });
    tl.fromTo(formRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35 }, '+=0.05');
    tl.fromTo(footerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 }, '<0.08');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      const res = await authAPI.register(form);
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
        navigate('/dashboard');
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  // ── OTP ──
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
      gsap.to(cardRef.current, { scale: 0.97, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => navigate('/dashboard') });
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

  useEffect(() => {
    if (step === 'otp' && otp.every(d => d !== '')) handleVerifyOtp();
  }, [otp, step]);

  return (
    <div className="auth-page" ref={pageRef}>

      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-left">
        <div className="auth-float-shape auth-float-shape--1" ref={el => floatRefs.current[0] = el} />
        <div className="auth-float-shape auth-float-shape--2" ref={el => floatRefs.current[1] = el} />
        <div className="auth-float-shape auth-float-shape--3" ref={el => floatRefs.current[2] = el} />
        <div className="auth-float-shape auth-float-shape--4" ref={el => floatRefs.current[3] = el} />

        <div className="auth-left-content">
          <div className="auth-left-tagline" ref={taglineRef}>
            <span className="dot" />
            Join 2,000+ Businesses
          </div>

          <h1 ref={h1Ref}>
            Design Your <span className="gradient-text">Brand Identity</span> in Minutes
          </h1>

          <p className="auth-left-desc" ref={descRef}>
            Custom water bottle labels, branded packaging, posters and marketing materials — all designed with AI assistance. No design skills needed.
          </p>

          <div className="auth-templates-row" ref={tmplRowRef}>
            <div className="auth-tmpl-card auth-tmpl-card--1">
              <div className="auth-tmpl-inner">
                <div className="auth-tmpl-shape auth-tmpl-shape--circle" />
                <div className="auth-tmpl-lines"><div className="auth-tmpl-line" /><div className="auth-tmpl-line" /><div className="auth-tmpl-line" /></div>
              </div>
            </div>
            <div className="auth-tmpl-card auth-tmpl-card--2">
              <div className="auth-tmpl-inner">
                <div className="auth-tmpl-shape auth-tmpl-shape--diamond" />
                <div className="auth-tmpl-lines"><div className="auth-tmpl-line" /><div className="auth-tmpl-line" /><div className="auth-tmpl-line" /></div>
              </div>
            </div>
            <div className="auth-tmpl-card auth-tmpl-card--3">
              <div className="auth-tmpl-inner">
                <div className="auth-tmpl-shape auth-tmpl-shape--hex" />
                <div className="auth-tmpl-lines"><div className="auth-tmpl-line" /><div className="auth-tmpl-line" /><div className="auth-tmpl-line" /></div>
              </div>
            </div>
          </div>

          <div className="auth-trust" ref={trustRef}>
            <div className="auth-trust-item">
              <span className="auth-trust-num">Free</span>
              <span className="auth-trust-label">To Get Started</span>
            </div>
            <div className="auth-trust-item">
              <span className="auth-trust-num">30s</span>
              <span className="auth-trust-label">Setup Time</span>
            </div>
            <div className="auth-trust-item">
              <span className="auth-trust-num">AI</span>
              <span className="auth-trust-label">Powered Engine</span>
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

          <h2 ref={headingRef}>Create your account</h2>
          <p className="auth-subtitle" ref={subtitleRef}>Start designing in under a minute</p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" ref={formRef} onSubmit={handleSubmit} style={{ display: step === 'register' ? 'flex' : 'none' }}>
            <div className="auth-input-row">
              <div className="auth-input-group">
                <label>Business Name</label>
                <input className="auth-input" placeholder="Your Brand" value={form.business_name}
                  onChange={e => setForm({ ...form, business_name: e.target.value })} />
              </div>
              <div className="auth-input-group">
                <label>Phone</label>
                <input className="auth-input" type="tel" placeholder="+91 98765 43210" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="auth-input-group">
              <label>Email address *</label>
              <input className="auth-input" type="email" placeholder="you@business.com" required autoComplete="email"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="auth-input-group">
              <label>Password *</label>
              <div className="auth-input-wrap">
                <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" required minLength={6} autoComplete="new-password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? <><span className="auth-btn-spinner" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="otp-section" ref={otpSectionRef} style={{ display: step === 'otp' ? 'flex' : 'none' }}>
            <div className="auth-success">✅ Account created! Verify your email to continue.</div>
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
              {otpLoading ? <><span className="auth-btn-spinner" /> Verifying...</> : 'Verify & Continue'}
            </button>
            <p className="otp-resend">
              Didn't receive it?
              <button onClick={handleResend} disabled={resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </p>
            <button className="otp-back-btn" onClick={animateBack}>← Back to registration</button>
          </div>

          <p className="auth-footer" ref={footerRef} style={{ display: step === 'register' ? 'block' : 'none' }}>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
