import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import useStore from '../store/useStore';
import { designAPI } from '../api/client';
import { pulseButton, ParticleSystem, counterAnimate } from '../utils/animations';
import './HeroSection.css';

export default function HeroSection() {
  const navigate = useNavigate();
  const { setGeneratedDesigns, setDesignInput, setLoading, user, token } = useStore();
  const heroRef = useRef(null);
  const sceneRef = useRef(null);
  const mainBottleRef = useRef(null);
  const box1Ref = useRef(null);
  const box2Ref = useRef(null);
  const ctaRef = useRef(null);
  const particleCanvasRef = useRef(null);
  const particleSystemRef = useRef(null);
  const statsRef = useRef(null);

  const [form, setForm] = useState({
    business_name: '', bottle_text: '', category: 'hotel', bottle_size: '500ml', style: 'modern',
  });

  //  Cinematic GSAP Timeline 
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Hero text entrance
      tl.fromTo('.hero-badge', { opacity: 0, x: -30, scale: 0.9 },
        { opacity: 1, x: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .fromTo('.hero-title', { opacity: 0, y: 60 },
          { opacity: 1, y: 0, duration: 1 }, '-=0.3')
        .fromTo('.hero-subtitle', { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
        .fromTo('.hero-input', { opacity: 0, y: 40, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8 }, '-=0.4');

      // 3D Scene entrance  main bottle rises up with rotation
      tl.fromTo(mainBottleRef.current,
        { opacity: 0, y: 120, rotateY: -30, scale: 0.7 },
        { opacity: 1, y: 0, rotateY: 0, scale: 1, duration: 1.4, ease: 'elastic.out(1, 0.6)' }, '-=0.8');

      // Packaging boxes slide in from sides
      tl.fromTo(box1Ref.current,
        { opacity: 0, x: -80, y: 60, rotateY: 20 },
        { opacity: 1, x: 0, y: 0, rotateY: -8, duration: 1, ease: 'back.out(1.4)' }, '-=1')
        .fromTo(box2Ref.current,
          { opacity: 0, x: 80, y: 60, rotateY: -20 },
          { opacity: 1, x: 0, y: 0, rotateY: 8, duration: 1, ease: 'back.out(1.4)' }, '-=0.8');

      // Continuous floating animations
      gsap.to(mainBottleRef.current, {
        y: -12, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });
      gsap.to(box1Ref.current, {
        y: -8, rotateY: -10, duration: 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });
      gsap.to(box2Ref.current, {
        y: -6, rotateY: 10, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5,
      });

      // Scene 3D tilt on mouse move
      const scene = sceneRef.current;
      if (scene) {
        const handleMouseMove = (e) => {
          const rect = scene.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const rotY = ((e.clientX - centerX) / (rect.width / 2)) * 8;
          const rotX = -((e.clientY - centerY) / (rect.height / 2)) * 5;
          gsap.to(scene, { rotateX: rotX, rotateY: rotY, duration: 0.5, ease: 'power2.out' });
        };
        const handleMouseLeave = () => {
          gsap.to(scene, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
        };
        const heroEl = heroRef.current;
        if (heroEl) {
          heroEl.addEventListener('mousemove', handleMouseMove);
          heroEl.addEventListener('mouseleave', handleMouseLeave);
        }
      }
    }, heroRef);

    // CTA pulse
    if (ctaRef.current) pulseButton(ctaRef.current);

    // Particles
    if (particleCanvasRef.current) {
      particleSystemRef.current = new ParticleSystem(particleCanvasRef.current, {
        count: 30, color: 'rgba(0, 184, 148, 0.4)', maxSize: 2, speed: 0.3, connectDistance: 90,
      });
      particleSystemRef.current.start();
    }

    // Stat counters
    if (statsRef.current) {
      const statEls = statsRef.current.querySelectorAll('.stat-number');
      const targets = [10000, 500, 50, 24];
      const suffixes = ['+', '+', '+', 'hr'];
      statEls.forEach((el, i) => counterAnimate(el, targets[i], suffixes[i]));
    }

    return () => {
      ctx.revert();
      if (particleSystemRef.current) particleSystemRef.current.stop();
    };
  }, []);

  // Live label update on all bottles
  const brandName = form.business_name || 'YOUR BRAND';
  const bottleText = form.bottle_text || 'Pure Himalayan';

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.business_name.trim()) return;

    // Anyone can generate designs — no login required

    setLoading(true);
    try {
      const res = await designAPI.generate(form);
      setGeneratedDesigns(res.data.designs);
      setDesignInput(form);
      navigate('/designs');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <section className="hero" ref={heroRef}>
      <canvas ref={particleCanvasRef} className="particle-canvas" />
      <div className="hero-bg-effects">
        <div className="hero-glow glow-1" />
        <div className="hero-glow glow-2" />
        <div className="hero-glow glow-3" />
        <div className="hero-grid-pattern" />
        <div className="floating-orb orb-1" />
        <div className="floating-orb orb-2" />
        <div className="floating-orb orb-3" />
      </div>

      <div className="container hero-content">
        {/*  LEFT: Form  */}
        <div className="hero-left">
          <div className="hero-badge">
            <span className="badge-pulse" />
            India's #1 Custom Water Bottle Platform
          </div>
          <h1 className="hero-title">
            Design Your <span className="gradient-text">Brand's</span> Perfect Water Bottle
          </h1>
          <p className="hero-subtitle">
            Enter your business details. Get instant AI-generated label designs. Customize & order in bulk. It's that simple.
          </p>

          <form className="hero-input smart-input glass" onSubmit={handleGenerate}>
            <div className="input-row">
              <div className="input-group">
                <label>Business Name *</label>
                <input className="input" placeholder="e.g. Royal Hotel" value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Bottle Text</label>
                <input className="input" placeholder="e.g. Pure Himalayan Water" value={form.bottle_text}
                  onChange={(e) => setForm({ ...form, bottle_text: e.target.value })} />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Category</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="hotel">Hotel</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="event">Event</option>
                  <option value="gym">Gym / Fitness</option>
                  <option value="corporate">Corporate</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="input-group">
                <label>Bottle Size</label>
                <select className="input" value={form.bottle_size} onChange={(e) => setForm({ ...form, bottle_size: e.target.value })}>
                  <option value="250ml">250ml</option>
                  <option value="500ml">500ml</option>
                  <option value="1000ml">1000ml</option>
                </select>
              </div>
              <div className="input-group">
                <label>Style</label>
                <select className="input" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                  <option value="luxury">Luxury</option>
                  <option value="eco">Eco</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg generate-cta" ref={ctaRef}>
              <span className="btn-sparkle">*</span> Generate Designs
            </button>
          </form>
        </div>

        {/*  RIGHT: 3D Bottle Scene with Packaging  */}
        <div className="hero-right">
          <div className="hero-3d-scene" ref={sceneRef}>

            {/*  Packaging Box 1 (left, smaller)  */}
            <div className="pkg-box pkg-box-left" ref={box1Ref}>
              <div className="pkg-box-inner">
                <div className="pkg-front">
                  <div className="pkg-logo">
                    <span className="pkg-brand">{brandName}</span>
                    <span className="pkg-sub">{bottleText}</span>
                  </div>
                </div>
                <div className="pkg-side" />
                <div className="pkg-top">
                  {/* Small bottle peeking out */}
                  <div className="pkg-bottle-peek">
                    <div className="peek-cap" />
                    <div className="peek-neck" />
                    <div className="peek-body">
                      <div className="peek-label">
                        <span>{brandName.substring(0, 6)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pkg-shadow" />
              <div className="pkg-size-tag">250ml</div>
            </div>

            {/*  Main Hero Bottle (center, large)  */}
            <div className="hero-main-bottle" ref={mainBottleRef}>
              <div className="main-bottle-shape">
                <div className="mb-cap">
                  <div className="mb-cap-shine" />
                </div>
                <div className="mb-neck">
                  <div className="mb-neck-ring" />
                </div>
                <div className="mb-body">
                  <div className="mb-water" />
                  <div className="mb-reflection" />
                  <div className="mb-reflection-2" />
                  <div className="mb-label">
                    <span className="mb-label-sub">{bottleText}</span>
                    <span className="mb-label-divider" />
                    <span className="mb-label-brand">{brandName}</span>
                    <span className="mb-label-divider" />
                    <span className="mb-label-tagline">Premium Water</span>
                  </div>
                </div>
                <div className="mb-base" />
              </div>
              <div className="mb-shadow" />
              <div className="mb-size-tag">500ml</div>
            </div>

            {/*  Packaging Box 2 (right, with bottle)  */}
            <div className="pkg-box pkg-box-right" ref={box2Ref}>
              <div className="pkg-box-inner pkg-open">
                <div className="pkg-front">
                  <div className="pkg-logo">
                    <span className="pkg-brand">{brandName}</span>
                    <span className="pkg-sub">{bottleText}</span>
                  </div>
                </div>
                <div className="pkg-side pkg-side-r" />
                <div className="pkg-top">
                  {/* Taller bottle inside */}
                  <div className="pkg-bottle-peek pkg-bottle-tall">
                    <div className="peek-cap" />
                    <div className="peek-neck" />
                    <div className="peek-body peek-body-tall">
                      <div className="peek-label">
                        <span>{brandName.substring(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pkg-shadow" />
              <div className="pkg-size-tag">1000ml</div>
            </div>

            {/*  Floating accent elements  */}
            <div className="scene-droplet scene-d1"></div>
            <div className="scene-droplet scene-d2"></div>
            <div className="scene-sparkle scene-s1"></div>
            <div className="scene-sparkle scene-s2"></div>
          </div>
        </div>
      </div>

      <div className="hero-stats container" ref={statsRef}>
        <div className="stat"><span className="stat-number">0</span><span className="stat-label">Bottles Designed</span></div>
        <div className="stat"><span className="stat-number">0</span><span className="stat-label">Happy Businesses</span></div>
        <div className="stat"><span className="stat-number">0</span><span className="stat-label">Design Templates</span></div>
        <div className="stat"><span className="stat-number">0</span><span className="stat-label">Delivery</span></div>
      </div>
    </section>
  );
}

