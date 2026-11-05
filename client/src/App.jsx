import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { Catalog } from './pages/Catalog';
import { useAuth } from './context/AuthContext';
import { Phone, Mail, MapPin, Heart, Truck, ShieldCheck } from 'lucide-react';

// Code-split secondary routes & heavy admin/game features to reduce initial bundle
const QRModal = lazy(() => import('./components/QRModal').then(m => ({ default: m.QRModal || m.default })));
const WelcomeQR = lazy(() => import('./pages/WelcomeQR').then(m => ({ default: m.WelcomeQR || m.default })));
const TruthOrDare = lazy(() => import('./pages/TruthOrDare').then(m => ({ default: m.TruthOrDare || m.default })));
const GamesAndActivities = lazy(() => import('./pages/GamesAndActivities').then(m => ({ default: m.GamesAndActivities || m.default })));
const AboutUs = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUs || m.default })));
const Policies = lazy(() => import('./pages/Policies').then(m => ({ default: m.Policies || m.default })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage || m.default })));
const UserProfile = lazy(() => import('./pages/UserProfile').then(m => ({ default: m.UserProfile || m.default })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard || m.default })));

function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: '14px', color: '#64748b' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#10b981',
        borderRadius: '50%',
        animation: 'pandanest-spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>Loading...</span>
      <style>{`@keyframes pandanest-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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
    if (params.get('page') === 'games' || window.location.hash === '#games') {
      return 'games';
    }
    if (params.get('page') === 'admin' || window.location.hash === '#admin') {
      const savedToken = localStorage.getItem('pandanest_admin_token');
      try {
        const savedProfile = JSON.parse(localStorage.getItem('pandanest_admin_profile') || '{}');
        const role = savedProfile?.role;
        if (savedToken && ['super_admin', 'admin'].includes(role)) {
          return 'admin-dashboard';
        } else if (savedToken) {
          return 'profile';
        }
      } catch {}
      return 'admin-login';
    }
    if (params.get('page') === 'profile' || window.location.hash === '#profile') {
      return localStorage.getItem('pandanest_admin_token') ? 'profile' : 'admin-login';
    }
    return 'catalog';
  });

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isAuthenticated, isAdmin, admin } = useAuth();

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
    } else if (route === 'games') {
      window.history.pushState({}, '', '?page=games');
    } else if (route === 'profile') {
      window.history.pushState({}, '', '?page=profile');
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
      else if (page === 'games') setCurrentRoute('games');
      else if (page === 'profile') setCurrentRoute(isAuthenticated ? 'profile' : 'admin-login');
      else if (page === 'admin') setCurrentRoute(isAuthenticated ? (isAdmin ? 'admin-dashboard' : 'profile') : 'admin-login');
      else setCurrentRoute('catalog');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, isAdmin]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Black Announcement Bar (Matches Screenshot 1) */}
      <div
        style={{
          background: '#000000',
          color: '#ffffff',
          textAlign: 'center',
          padding: '9px 14px',
          fontSize: '0.78rem',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}
      >
        UNLOCK 5% OFF — APPLY COUPON &ldquo;PANDANEST&rdquo; AT CHECKOUT
      </div>

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
        <Suspense fallback={<PageLoader />}>
          {currentRoute === 'welcome' && (
            <WelcomeQR onContinueToCatalog={() => navigate('catalog')} />
          )}

          {currentRoute === 'catalog' && (
            <Catalog
              searchQuery={searchQuery}
              onOpenTruthOrDare={() => navigate('truth-or-dare')}
              onOpenWelcome={() => navigate('welcome')}
              onNavigate={navigate}
            />
          )}

          {currentRoute === 'truth-or-dare' && (
            <TruthOrDare onGoToCatalog={() => navigate('catalog')} />
          )}

          {currentRoute === 'games' && (
            <GamesAndActivities
              onGoToCatalog={() => navigate('catalog')}
              onRequireLogin={() => navigate('login')}
            />
          )}

          {currentRoute === 'about' && (
            <AboutUs onExploreCatalog={() => navigate('catalog')} />
          )}

          {currentRoute === 'policies' && (
            <Policies />
          )}

          {(currentRoute === 'admin-login' || currentRoute === 'login') && (
            isAuthenticated ? (
              isAdmin ? (
                <AdminDashboard onLogout={() => navigate('catalog')} />
              ) : (
                <UserProfile
                  onGoToCatalog={() => navigate('catalog')}
                  onGoToAdmin={() => navigate('admin-dashboard')}
                />
              )
            ) : (
              <AuthPage
                onLoginSuccess={(userData) => {
                  const userRole = userData?.role || admin?.role;
                  const isUserAdmin = ['super_admin', 'admin'].includes(userRole);
                  navigate(isUserAdmin ? 'admin-dashboard' : 'catalog');
                }}
                onExploreCatalog={() => navigate('catalog')}
              />
            )
          )}

          {currentRoute === 'profile' && (
            isAuthenticated ? (
              <UserProfile
                onGoToCatalog={() => navigate('catalog')}
                onGoToAdmin={() => navigate('admin-dashboard')}
              />
            ) : (
              <AuthPage
                onLoginSuccess={() => navigate(isAdmin ? 'admin-dashboard' : 'profile')}
                onExploreCatalog={() => navigate('catalog')}
              />
            )
          )}

          {currentRoute === 'admin-dashboard' && (
            isAuthenticated ? (
              isAdmin ? (
                <AdminDashboard onLogout={() => navigate('catalog')} />
              ) : (
                <UserProfile
                  onGoToCatalog={() => navigate('catalog')}
                  onGoToAdmin={() => navigate('admin-dashboard')}
                />
              )
            ) : (
              <AuthPage
                onLoginSuccess={() => navigate('admin-dashboard')}
                onExploreCatalog={() => navigate('catalog')}
              />
            )
          )}
        </Suspense>
      </div>

      {/* Shared Modals & Drawers */}
      {isQRModalOpen && (
        <Suspense fallback={null}>
          <QRModal
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
            onTestScan={() => navigate('welcome')}
          />
        </Suspense>
      )}
      <CartDrawer />
      <CheckoutModal />

      {/* Clean White & Emerald Consistent Footer */}
      <footer
        style={{
          background: '#ffffff',
          color: '#475569',
          padding: '48px 0 24px',
          borderTop: '3px solid #10b981',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '36px',
            marginBottom: '36px'
          }}
        >
          {/* Brand Info */}
          <div>
            <div style={{ marginBottom: '14px' }}>
              <img
                src="/logo.jpeg"
                alt="Panda Nest"
                style={{
                  height: '52px',
                  width: 'auto',
                  borderRadius: '10px'
                }}
              />
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.65, color: '#64748b', marginBottom: '16px' }}>
              Three College Friends. One Dream. A Million Smiles. Spreading joyful, high-quality, and affordable toys across India since 2nd October 2025.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontWeight: '700',
                  fontSize: '0.72rem',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #fde68a'
                }}
              >
                ⭐ Gold Seller Flipkart
              </span>
              <span
                style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  fontWeight: '700',
                  fontSize: '0.72rem',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #a7f3d0'
                }}
              >
                🏆 Amazon Best Seller
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: '#065f46', fontSize: '1rem', fontWeight: '800', marginBottom: '16px', letterSpacing: '0.2px' }}>
              Explore
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <button
                onClick={() => navigate('catalog')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Toy Catalog
              </button>
              <button
                onClick={() => navigate('games')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                🎮 Games & Activities (+10 PP)
              </button>
              <button
                onClick={() => navigate('welcome')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Join Panda Club (100 Points)
              </button>
              <button
                onClick={() => setIsQRModalOpen(true)}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Print Store QR Standee
              </button>
              <button
                onClick={() => navigate('about')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                About Panda Nest
              </button>
              <button
                onClick={() => navigate(isAuthenticated ? (isAdmin ? 'admin-dashboard' : 'profile') : 'admin-login')}
                style={{
                  color: '#047857',
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  marginTop: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f0fdf4',
                  border: '1px solid #a7f3d0',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  width: 'fit-content',
                  cursor: 'pointer'
                }}
              >
                🔒 Staff & Admin Portal
              </button>
            </div>
          </div>

          {/* Legal Policies */}
          <div>
            <h4 style={{ color: '#065f46', fontSize: '1rem', fontWeight: '800', marginBottom: '16px', letterSpacing: '0.2px' }}>
              Policies & Terms
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <button
                onClick={() => navigate('policies')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Free Delivery & Shipping
              </button>
              <button
                onClick={() => navigate('policies')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Return & Refund Policy (48h)
              </button>
              <button
                onClick={() => navigate('policies')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => navigate('policies')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => navigate('policies')}
                style={{ color: '#334155', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.paddingLeft = '4px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.paddingLeft = '0px'; }}
              >
                Sale & Offers Terms
              </button>
            </div>
          </div>

          {/* Official Contact Info */}
          <div>
            <h4 style={{ color: '#065f46', fontSize: '1rem', fontWeight: '800', marginBottom: '16px', letterSpacing: '0.2px' }}>
              Official Contact
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="#059669" />
                <a href="tel:7380405227" style={{ color: '#047857', textDecoration: 'none', fontWeight: '800', letterSpacing: '0.2px' }}>
                  +91 7380405227
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="#0284c7" />
                <a href="mailto:acubebeauty@gmail.com" style={{ color: '#0f172a', textDecoration: 'none', fontWeight: '500' }}>
                  acubebeauty@gmail.com
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span style={{ color: '#64748b', lineHeight: 1.5 }}>SCO 94, Swastic Vihar, Mansa Devi Complex, Panchkula, Haryana 134114</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="container"
          style={{
            textAlign: 'center',
            paddingTop: '20px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.82rem',
            color: '#64748b',
            paddingBottom: '40px'
          }}
        >
          © {new Date().getFullYear()} Panda Nest (pandanest.in) • All rights reserved. • Spreading Smiles Across India 🐼
        </div>
      </footer>

      {/* Floating Bottom App Navigation for Phone screens (< 768px) */}
      <MobileBottomNav currentRoute={currentRoute} navigate={navigate} />
    </div>
  );
}
export default App;
