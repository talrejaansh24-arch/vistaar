import HeroSection from '../components/HeroSection';
import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { scrollReveal, waveAnimation, drawTimeline, marqueeScroll } from '../utils/animations';
import './HomePage.css';

export default function HomePage() {
  const { siteConfig } = useStore();
  const sectionRefs = useRef([]);
  const stepsGridRef = useRef(null);
  const timelineRef = useRef(null);
  const featuresGridRef = useRef(null);
  const bottleShowcaseRef = useRef(null);
  const marqueeRef = useRef(null);

  useEffect(() => {
    scrollReveal(sectionRefs.current.filter(Boolean));

    if (timelineRef.current && stepsGridRef.current) {
      const cards = stepsGridRef.current.querySelectorAll('.step-card');
      drawTimeline(timelineRef.current, Array.from(cards));
    }

    if (featuresGridRef.current) {
      const cards = featuresGridRef.current.querySelectorAll('.feature-card');
      waveAnimation(cards, { scrollTriggerEl: featuresGridRef.current });
    }

    if (marqueeRef.current) {
      marqueeScroll(marqueeRef.current);
    }
  }, []);

  const addRef = (el) => { if (el && !sectionRefs.current.includes(el)) sectionRefs.current.push(el); };

  const steps = [
    { icon: '01', title: 'Enter Details', desc: 'Fill in your business name, choose category and bottle size', accent: 'var(--primary)' },
    { icon: '02', title: 'Get Designs', desc: 'Our engine generates 8-12 unique label designs instantly', accent: 'var(--accent)' },
    { icon: '03', title: 'Customize', desc: 'Edit text, colors, upload logo in our powerful editor', accent: 'var(--secondary)' },
    { icon: '04', title: 'Order in Bulk', desc: 'Choose quantity, checkout, and get delivered in 24 hours', accent: 'var(--success)' },
  ];

  const features = [
    { icon: 'A', title: 'Instant Design', desc: 'Get professional label designs in seconds, not days' },
    { icon: 'B', title: 'Bulk Pricing', desc: 'Up to 20% discount on large orders. More bottles means less cost' },
    { icon: 'C', title: 'Full Customization', desc: 'Powerful editor to make every label uniquely yours' },
    { icon: 'D', title: 'Fast Delivery', desc: '24-hour delivery across India for standard orders' },
    { icon: 'E', title: 'Premium Quality', desc: 'BIS certified bottles with food-grade materials' },
    { icon: 'F', title: 'Easy Reorder', desc: 'One-click reorder from your dashboard anytime' },
  ];

  const categories = ['Hotels', 'Restaurants', 'Cafes', 'Corporate', 'Events', 'Gyms', 'Spas', 'Airlines'];

  return (
    <div className="home-page">
      <HeroSection />

      <section className="trusted-section" ref={addRef}>
        <div className="container">
          <p className="trusted-label">{siteConfig.trusted_label || "Trusted by leading businesses across India"}</p>
        </div>
        <div className="marquee-wrapper" ref={marqueeRef}>
          <div className="marquee-inner">
            {[...categories, ...categories].map((cat, i) => (
              <span className="marquee-item" key={i}>{cat}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="how-it-works container" ref={addRef}>
        <div className="section-divider" />
        <h2 className="section-title">
          {siteConfig.how_it_works_title ? (
            siteConfig.how_it_works_title.includes('[') && siteConfig.how_it_works_title.includes(']') ? (
              <>
                {siteConfig.how_it_works_title.split('[')[0]}
                <span className="gradient-text">{siteConfig.how_it_works_title.split('[')[1].split(']')[0]}</span>
                {siteConfig.how_it_works_title.split(']')[1]}
              </>
            ) : (
              siteConfig.how_it_works_title
            )
          ) : (
            <>How It <span className="gradient-text">Works</span></>
          )}
        </h2>
        <p className="section-subtitle">{siteConfig.how_it_works_subtitle || "Four simple steps to get your branded bottles"}</p>

        <div className="steps-wrapper">
          <div className="timeline-line" ref={timelineRef} />
          <div className="steps-grid" ref={stepsGridRef}>
            {steps.map((step, i) => (
              <div className="step-card card" key={i}>
                <div className="step-number-badge" style={{ background: step.accent }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <span className="step-icon">{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                <div className="step-connector" style={{ background: step.accent }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bottle-showcase container" ref={addRef}>
        <div className="section-divider" />
        <h2 className="section-title">Available <span className="gradient-text">Sizes</span></h2>
        <p className="section-subtitle">Choose the perfect size for your business needs</p>

        <div className="showcase-grid" ref={bottleShowcaseRef}>
          {[
            { size: '250ml', label: 'Compact', desc: 'Events and Meetings', height: 160, bodyH: 120, price: 'Rs 15' },
            { size: '500ml', label: 'Standard', desc: 'Hotels and Restaurants', height: 220, bodyH: 170, price: 'Rs 20', popular: true },
            { size: '1000ml', label: 'Premium', desc: 'Gyms and Premium', height: 280, bodyH: 220, price: 'Rs 30' },
          ].map((b) => (
            <div className={`showcase-bottle ${b.popular ? 'popular' : ''}`} key={b.size}>
              {b.popular && <span className="popular-badge">Most Popular</span>}
              <div className="showcase-bottle-visual">
                <div className="showcase-bottle-shape" style={{ height: b.height + 'px' }}>
                  <div className="s-cap" />
                  <div className="s-neck" />
                  <div className="s-body" style={{ height: b.bodyH + 'px' }}>
                    <div className="s-water" />
                    <div className="s-label">
                      <span>YOUR</span>
                      <span>BRAND</span>
                    </div>
                  </div>
                </div>
              </div>
              <h3>{b.size}</h3>
              <p className="showcase-label">{b.label}</p>
              <p className="showcase-desc">{b.desc}</p>
              <p className="showcase-price">{b.price}<span>/bottle</span></p>
            </div>
          ))}
        </div>
      </section>

      <section className="why-vistaar container" ref={addRef}>
        <div className="section-divider" />
        <h2 className="section-title">
          {siteConfig.features_title ? (
            siteConfig.features_title.includes('[') && siteConfig.features_title.includes(']') ? (
              <>
                {siteConfig.features_title.split('[')[0]}
                <span className="gradient-text">{siteConfig.features_title.split('[')[1].split(']')[0]}</span>
                {siteConfig.features_title.split(']')[1]}
              </>
            ) : (
              siteConfig.features_title
            )
          ) : (
            <>Why <span className="gradient-text">VistaarWater</span>?</>
          )}
        </h2>
        <p className="section-subtitle">{siteConfig.features_subtitle || "Everything you need for professional branded water bottles"}</p>

        <div className="features-grid" ref={featuresGridRef}>
          {features.map((f, i) => (
            <div className="feature-card card" key={i}>
              <div className="feature-icon-wrapper">
                <span className="feature-icon">{f.icon}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section" ref={addRef}>
        <div className="container cta-content">
          <div className="cta-glow" />
          <h2>
            {siteConfig.cta_title ? (
              siteConfig.cta_title.includes('[') && siteConfig.cta_title.includes(']') ? (
                <>
                  {siteConfig.cta_title.split('[')[0]}
                  <span className="gradient-text">{siteConfig.cta_title.split('[')[1].split(']')[0]}</span>
                  {siteConfig.cta_title.split(']')[1]}
                </>
              ) : (
                siteConfig.cta_title
              )
            ) : (
              <>Ready to <span className="gradient-text">Brand</span> Your Bottles?</>
            )}
          </h2>
          <p>{siteConfig.cta_subtitle || "Join 500+ businesses who trust VistaarWater for their custom water bottles"}</p>
          <a href="#" className="btn btn-primary btn-lg" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            Start Designing Now {'>'}
          </a>
        </div>
      </section>
    </div>
  );
}
