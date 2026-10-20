import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { QRModal } from './components/QRModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { WelcomeQR } from './pages/WelcomeQR';
import { Catalog } from './pages/Catalog';
import { TruthOrDare } from './pages/TruthOrDare';
import { AboutUs } from './pages/AboutUs';
import { Policies } from './pages/Policies';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { useAuth } from './context/AuthContext';
import { Phone, Mail, MapPin, Heart, Truck, ShieldCheck } from 'lucide-react';

export function App() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'welcome' || window.location.hash === '#welcome') {
      return 'welcome';
    }
    if (params.get('page') === 'about' || window.location.hash === '#about') {
      return 'about';
    }
    if (params.get('page') === 'policies' || window.location.hash === '#policies') {
      return 'policies';
    }
    if (params.get('page') === 'game' || window.location.hash === '#game') {
      return 'truth-or-dare';
    }
    if (params.get('page') === 'admin' || window.location.hash === '#admin') {
      return 'admin-login';
    }
    return 'catalog';
  });

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isAuthenticated } = useAuth();

  const navigate = (route) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (route === 'welcome') {
      window.history.pushState({}, '', '?page=welcome');
    } else if (route === 'about') {
      window.history.pushState({}, '', '?page=about');
    } else if (route === 'policies') {
      window.history.pushState({}, '', '?page=policies');
    } else if (route === 'truth-or-dare') {
      window.history.pushState({}, '', '?page=game');
    } else if (route === 'admin-login' || route === 'admin-dashboard') {
      window.history.pushState({}, '', '?page=admin');
    } else {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page');
      if (page === 'welcome') setCurrentRoute('welcome');
      else if (page === 'about') setCurrentRoute('about');
      else if (page === 'policies') setCurrentRoute('policies');
      else if (page === 'game') setCurrentRoute('truth-or-dare');
      else if (page === 'admin') setCurrentRoute(isAuthenticated ? 'admin-dashboard' : 'admin-login');
      else setCurrentRoute('catalog');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        onOpenQR={() => setIsQRModalOpen(true)}
        currentRoute={currentRoute}
        navigate={navigate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Page Routing */}
      <div style={{ flex: 1 }}>
        {currentRoute === 'welcome' && (
          <WelcomeQR onContinueToCatalog={() => navigate('catalog')} />
        )}

        {currentRoute === 'catalog' && (
          <Catalog
            searchQuery={searchQuery}
            onOpenTruthOrDare={() => navigate('truth-or-dare')}
            onOpenWelcome={() => navigate('welcome')}
          />
        )}

        {currentRoute === 'truth-or-dare' && (
          <TruthOrDare onGoToCatalog={() => navigate('catalog')} />
        )}

        {currentRoute === 'about' && (
          <AboutUs onExploreCatalog={() => navigate('catalog')} />
        )}

        {currentRoute === 'policies' && (
          <Policies />
        )}

        {currentRoute === 'admin-login' && (
          isAuthenticated ? (
            <AdminDashboard onLogout={() => navigate('admin-login')} />
          ) : (
            <AdminLogin onLoginSuccess={() => navigate('admin-dashboard')} />
          )
        )}

        {currentRoute === 'admin-dashboard' && (
          isAuthenticated ? (
            <AdminDashboard onLogout={() => navigate('admin-login')} />
          ) : (
            <AdminLogin onLoginSuccess={() => navigate('admin-dashboard')} />
          )
        )}
      </div>

      {/* Shared Modals & Drawers */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onTestScan={() => navigate('welcome')}
      />
      <CartDrawer />
      <CheckoutModal />

      {/* Rich Footer with Contact Details & Policies */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '48px 0 24px', borderTop: '1px solid #1e293b' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', marginBottom: '36px' }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '28px' }}>🐼</span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff' }}>Panda Nest</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '16px' }}>
              Three College Friends. One Dream. A Million Smiles. Spreading joyful, high-quality, and affordable toys across India since 2nd October 2025.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>Gold Seller Flipkart</span>
              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Amazon Best Seller</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '14px' }}>Explore</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              <button onClick={() => navigate('catalog')} style={{ color: '#94a3b8', textAlign: 'left' }}>Toy Catalog</button>
              <button onClick={() => navigate('truth-or-dare')} style={{ color: '#94a3b8', textAlign: 'left' }}>Panda Club Truth or Dare 🎲</button>
              <button onClick={() => navigate('welcome')} style={{ color: '#94a3b8', textAlign: 'left' }}>Join Panda Club (100 Points)</button>
              <button onClick={() => setIsQRModalOpen(true)} style={{ color: '#94a3b8', textAlign: 'left' }}>Print Store QR Standee</button>
              <button onClick={() => navigate('about')} style={{ color: '#94a3b8', textAlign: 'left' }}>About Panda Nest</button>
            </div>
          </div>

          {/* Legal Policies */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '14px' }}>Policies & Terms</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              <button onClick={() => navigate('policies')} style={{ color: '#94a3b8', textAlign: 'left' }}>Free Delivery & Shipping</button>
              <button onClick={() => navigate('policies')} style={{ color: '#94a3b8', textAlign: 'left' }}>Return & Refund Policy (48h)</button>
              <button onClick={() => navigate('policies')} style={{ color: '#94a3b8', textAlign: 'left' }}>Privacy Policy</button>
              <button onClick={() => navigate('policies')} style={{ color: '#94a3b8', textAlign: 'left' }}>Terms & Conditions</button>
              <button onClick={() => navigate('policies')} style={{ color: '#94a3b8', textAlign: 'left' }}>Sale & Offers Terms</button>
            </div>
          </div>

          {/* Official Contact Info */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '14px' }}>Official Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={15} color="#10b981" />
                <a href="tel:7380405227" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: '700' }}>
                  +91 7380405227
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={15} color="#0284c7" />
                <a href="mailto:acubebeauty@gmail.com" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                  acubebeauty@gmail.com
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>SCO 94, Swastic Vihar, Mansa Devi Complex, Panchkula, Haryana 134114</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container" style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #1e293b', fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} Panda Nest (pandanest.in) • All rights reserved. • Spreading Smiles Across India
        </div>
      </footer>
    </div>
  );
}
export default App;
