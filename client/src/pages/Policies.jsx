import React, { useState } from 'react';
import { ShieldCheck, FileText, Truck, RotateCcw, CreditCard, Tag, Phone, Mail, MapPin } from 'lucide-react';

export function Policies({ initialTab = 'shipping' }) {
  const [activePolicy, setActivePolicy] = useState(initialTab);

  const POLICY_TABS = [
    { id: 'shipping', label: 'Delivery & Shipping', icon: Truck },
    { id: 'returns', label: 'Return & Refund', icon: RotateCcw },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'offers', label: 'Sale & Offers Terms', icon: Tag },
    { id: 'payments', label: 'Fees & Payments', icon: CreditCard },
    { id: 'contact', label: 'Contact Us', icon: Phone },
  ];

  return (
    <div style={{ background: '#f8fafc', paddingBottom: '60px', minHeight: '85vh' }}>
      {/* Header */}
      <section style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)', color: 'white', padding: '48px 20px', textAlign: 'center', borderBottom: '3px solid #10b981' }}>
        <div className="container" style={{ maxWidth: '720px' }}>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '8px', color: 'white', fontWeight: '800' }}>
            Panda Nest Policies & Information
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '1rem', lineHeight: 1.5 }}>
            Transparent terms, free delivery across India, and dedicated support for every family.
          </p>
        </div>
      </section>

      <div className="container" style={{ maxWidth: '1000px', marginTop: '30px' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '24px',
            scrollbarWidth: 'none'
          }}
        >
          {POLICY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePolicy === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePolicy(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  border: isActive ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                  background: isActive ? '#10b981' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  boxShadow: isActive ? '0 4px 10px rgba(16, 185, 129, 0.25)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Policy Content Card */}
        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '36px',
            border: '1.5px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {/* 1. Delivery & Shipping */}
          {activePolicy === 'shipping' && (
            <div>
              <div className="badge badge-green" style={{ marginBottom: '12px' }}>
                <Truck size={14} /> Shipping Policy
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '16px' }}>
                Panda Nest – Delivery & Shipping Policy
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                Last Updated: 20 October 2026
              </p>

              <div style={{ color: '#334155', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#047857', marginBottom: '6px' }}>1. Free Delivery</h3>
                  <p>
                    At Panda Nest, we believe happiness should reach every home without extra delivery costs. <strong>We offer free delivery on all products</strong> available on our website, with no additional shipping charges.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#047857', marginBottom: '6px' }}>2. Order Processing and Dispatch</h3>
                  <p>
                    Orders are processed after successful confirmation and payment, where applicable. Dispatch and estimated delivery timelines will be communicated through the website or order confirmation.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#047857', marginBottom: '6px' }}>3. Delivery Areas</h3>
                  <p>
                    We aim to deliver across India, subject to service availability at the customer's PIN code. Please provide a complete and accurate shipping address, contact number, and nearby landmark to help ensure smooth delivery.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#047857', marginBottom: '6px' }}>4. Damaged or Missing Products</h3>
                  <p>
                    If your order arrives damaged, incomplete, or with an incorrect product, please contact Panda Nest through our official contact details within 48 hours of delivery.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Return & Refund Policy */}
          {activePolicy === 'returns' && (
            <div>
              <div className="badge badge-amber" style={{ marginBottom: '12px' }}>
                <RotateCcw size={14} /> Return & Replacement Policy
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '16px' }}>
                Panda Nest – Return & Refund Policy
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                Last Updated: 20 October 2026
              </p>

              <div style={{ color: '#334155', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#b45309', marginBottom: '6px' }}>1. Return & Replacement</h3>
                  <p>
                    At Panda Nest, customer satisfaction is important to us. If you receive a damaged, defective, incomplete, or incorrect product, please contact our customer support team as soon as possible after delivery.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#b45309', marginBottom: '6px' }}>2. Reporting Window</h3>
                  <p>
                    Please report any damaged, defective, missing, or incorrect item within <strong>48 hours of delivery</strong>, along with your order details and clear photographs or videos of the product and packaging.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#b45309', marginBottom: '6px' }}>3. Product Condition</h3>
                  <p>
                    Approved returns should include original packaging, accessories, and any items supplied with the product. Products damaged due to misuse or improper handling may not qualify for return.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#b45309', marginBottom: '6px' }}>4. Refund Process</h3>
                  <p>
                    Once an eligible returned product has been received and inspected, approved refunds will generally be processed to the original payment method within standard banking timelines.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Terms & Conditions */}
          {activePolicy === 'terms' && (
            <div>
              <div className="badge badge-blue" style={{ marginBottom: '12px' }}>
                <FileText size={14} /> Terms of Service
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '16px' }}>
                Panda Nest – Terms & Conditions
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                Last Updated: 20 October 2026
              </p>

              <div style={{ color: '#334155', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>1. Introduction</h3>
                  <p>
                    Welcome to Panda Nest! These Terms & Conditions govern your access to and use of our website, products, and services. By browsing our website or placing an order, you agree to these terms.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>2. Eligibility</h3>
                  <p>
                    Customers under 18 years of age should use this website and make purchases under the supervision of a parent or legal guardian.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>3. Products and Pricing</h3>
                  <p>
                    Panda Nest aims to provide accurate product descriptions, images, and prices. Minor variations in product color, packaging, or presentation may occur.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>4. Governing Law</h3>
                  <p>
                    These Terms & Conditions are governed by the applicable laws of India. Any disputes will be handled by competent courts having jurisdiction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Privacy Policy */}
          {activePolicy === 'privacy' && (
            <div>
              <div className="badge badge-purple" style={{ marginBottom: '12px' }}>
                <ShieldCheck size={14} /> Data Protection
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '16px' }}>
                Panda Nest – Privacy Policy
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                Last Updated: 20 October 2026
              </p>

              <div style={{ color: '#334155', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>1. About Panda Nest</h3>
                  <p>
                    Panda Nest is committed to protecting your personal information when you visit our website, purchase our toys, or participate in Panda Club.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>2. Information We Collect</h3>
                  <p>
                    We collect personal details (name, phone number, delivery address), order information, and date of birth details provided for Panda Club birthday perks. We do not sell your personal information.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>3. Children's Privacy</h3>
                  <p>
                    Panda Nest creates a safe and enjoyable experience for children and families. Where child details are collected for birthday greetings, we ensure parental awareness and consent.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Sale & Offers Terms */}
          {activePolicy === 'offers' && (
            <div>
              <div className="badge badge-pink" style={{ marginBottom: '12px' }}>
                <Tag size={14} /> Discounts & Promotions
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '16px' }}>
                Panda Nest – Sale & Offers Terms
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                Last Updated: 20 October 2026
              </p>

              <div style={{ color: '#334155', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p>
                  Any discount, coupon, cashback, or promotional deal offered by Panda Nest is valid only for specified products, platforms, and validity periods.
                </p>
                <p>
                  <strong>Panda Club Points:</strong> Points earned through registration, purchases, or interactive games like Truth & Dare may be redeemed against eligible orders at checkout.
                </p>
              </div>
            </div>
          )}

          {/* 6. Fees & Payments */}
          {activePolicy === 'payments' && (
            <div>
              <div className="badge badge-green" style={{ marginBottom: '12px' }}>
                <CreditCard size={14} /> Payment Modes
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '16px' }}>
                Panda Nest – Fees & Payments Policy
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                Last Updated: 20 October 2026
              </p>

              <div style={{ color: '#334155', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p>
                  All product prices on the Panda Nest website are displayed in <strong>Indian Rupees (INR)</strong>.
                </p>
                <p>
                  <strong>Payment Options:</strong> Cash on Delivery (COD), UPI, Debit Cards, Credit Cards, Net Banking, and digital wallets.
                </p>
                <p>
                  <strong>Free Delivery:</strong> All orders enjoy free shipping across India.
                </p>
              </div>
            </div>
          )}

          {/* 7. Official Contact Us Section */}
          {activePolicy === 'contact' && (
            <div>
              <div className="badge badge-amber" style={{ marginBottom: '12px' }}>
                <Phone size={14} /> Support & Storefront
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '16px' }}>
                Contact Panda Nest
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '28px' }}>
                Have questions about toys, orders, or Panda Club? Reach out directly to our team!
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#10b981', marginBottom: '10px' }}><Phone size={24} /></div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Call / WhatsApp:</div>
                  <a href="tel:7380405227" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', textDecoration: 'none' }}>
                    +91 7380405227
                  </a>
                </div>

                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#0284c7', marginBottom: '10px' }}><Mail size={24} /></div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Official Email:</div>
                  <a href="mailto:acubebeauty@gmail.com" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', textDecoration: 'none' }}>
                    acubebeauty@gmail.com
                  </a>
                </div>

                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ color: '#d97706', marginBottom: '10px' }}><MapPin size={24} /></div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Store & Dispatch Address:</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                    SCO 94, Swastic Vihar, Mansa Devi Complex, Panchkula, Haryana 134114
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
