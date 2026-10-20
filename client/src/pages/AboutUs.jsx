import React from 'react';
import { Heart, Users, Award, ShieldCheck, Sparkles, CheckCircle, Gift, Star } from 'lucide-react';

export function AboutUs({ onExploreCatalog }) {
  return (
    <div style={{ paddingBottom: '70px', background: '#f8fafc' }}>
      {/* Hero Header */}
      <section
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          color: 'white',
          padding: '54px 20px',
          textAlign: 'center'
        }}
      >
        <div className="container" style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div className="badge badge-amber" style={{ marginBottom: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Sparkles size={14} /> Our Heartfelt Story
          </div>
          <h1 style={{ fontSize: '2.8rem', lineHeight: 1.15, marginBottom: '14px', color: 'white' }}>
            About Panda Nest – Spreading Happiness Through Play 🐼
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.95, lineHeight: 1.5 }}>
            Three College Friends. One Dream. A Million Smiles.
          </p>
        </div>
      </section>

      {/* Badges Bar (Flipkart Gold Seller & Amazon Best Seller) */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '18px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '12px' }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>Gold Seller on Flipkart</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Trusted marketplace partner</div>
            </div>
          </div>

          <div style={{ height: '32px', width: '1px', background: '#e2e8f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px', borderRadius: '12px' }}>
              <Star size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>Best Seller on Amazon</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Thousands of joyful reviews</div>
            </div>
          </div>

          <div style={{ height: '32px', width: '1px', background: '#e2e8f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ede9fe', color: '#7c3aed', padding: '8px', borderRadius: '12px' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>10 Dedicated Members</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Growing together since 2nd Oct 2025</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="container" style={{ maxWidth: '860px', marginTop: '40px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '36px',
            border: '1.5px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '32px'
          }}
        >
          <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '14px' }}>
            How Panda Nest Began
          </h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '18px' }}>
            Panda Nest was born from a simple dream shared by three college friends — to make high-quality, fun, and educational toys accessible to every child at affordable prices.
          </p>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '18px' }}>
            Our journey began on <strong>2nd October 2025</strong>, with a vision to bring happiness into every home through toys that inspire creativity, encourage learning, and create unforgettable childhood memories.
          </p>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.7 }}>
            What started as a dream among three friends has grown into a brand that continues to reach more families across India. We believe that every child deserves the joy of play, and every parent deserves quality products at prices they can trust.
          </p>
        </div>

        {/* Mission & Values Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '28px',
              border: '1.5px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Heart size={26} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '10px' }}>Our Mission</h3>
            <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
              At Panda Nest, we believe that toys are more than just toys — they are tools for imagination, learning, creativity, and growth. Our mission is to bring together <strong>quality, affordability, and happiness</strong> by offering a carefully selected range of toys for children of all ages.
            </p>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '28px',
              border: '1.5px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Gift size={26} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '10px' }}>Panda Club Initiative</h3>
            <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
              We believe the fun shouldn't end when playtime is over. That's why we introduced <strong>Panda Club</strong> — Play More. Learn More. Earn Rewards. Families earn Panda Points, enjoy birthday surprises, and participate in joyful activities.
            </p>
          </div>
        </div>

        {/* Our Promise Checklist */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
            border: '2px dashed #10b981',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '36px'
          }}
        >
          <h3 style={{ fontSize: '1.5rem', color: '#047857', marginBottom: '16px' }}>Our Promise to You</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#0f172a' }}>
              <CheckCircle size={20} color="#10b981" />
              <span><strong>Quality You Can Trust:</strong> Toys selected with care for fun and safe play.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#0f172a' }}>
              <CheckCircle size={20} color="#10b981" />
              <span><strong>Affordable Prices & Free Delivery:</strong> Making joyful play accessible to more families across India.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#0f172a' }}>
              <CheckCircle size={20} color="#10b981" />
              <span><strong>Rewards with Panda Club:</strong> Exclusive birthday surprises and loyalty benefits.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#0f172a' }}>
              <CheckCircle size={20} color="#10b981" />
              <span><strong>A Growing Community:</strong> Spreading happiness, one toy and one smile at a time.</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={onExploreCatalog}>
            <span>Explore All Toys at Panda Nest</span>
          </button>
        </div>
      </main>
    </div>
  );
}
