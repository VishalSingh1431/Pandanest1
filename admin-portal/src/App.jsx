import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import MainLedgerPage from './pages/MainLedgerPage';
import PartnerKharchaPage from './pages/PartnerKharchaPage';
import VendorKhataPage from './pages/VendorKhataPage';
import SalaryRentPage from './pages/SalaryRentPage';
import PlatformProfitPage from './pages/PlatformProfitPage';
import InvestmentPage from './pages/InvestmentPage';
import UserAccessManager from './pages/UserAccessManager';
import AuditLogsPage from './pages/AuditLogsPage';
import { RefreshCw, ShieldAlert } from 'lucide-react';

function PortalShell() {
  const { user, loading, canView, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('main_ledger');

  const PAGE_TITLES = {
    main_ledger: 'Main Page (Cashbook & Daily Ledger)',
    partner_kharcha: 'Partner Kharcha (गल्ला / Daily Withdrawals)',
    vendor_page: 'Vendor Page (Khata Ledger & Due)',
    salary_rent: 'सबका Salary + Rent (Month-Wise)',
    platform_profit: 'Platform Profit (Connected P&L Engine)',
    investment: 'Investment Tracker (Partner Capital Fund)',
    user_access: 'User Access & Permissions Governance',
    audit_logs: 'Audit Trail Explorer',
  };

  useEffect(() => {
    // If current tab is restricted for user, find first accessible tab
    if (user && !canView(activeTab)) {
      const candidates = [
        'main_ledger',
        'partner_kharcha',
        'vendor_page',
        'salary_rent',
        'platform_profit',
        'investment',
        'audit_logs',
      ];
      const firstAvailable = candidates.find((tab) => canView(tab));
      if (firstAvailable) {
        setActiveTab(firstAvailable);
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-mono tracking-wider uppercase">Loading Panda Nest Admin Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'main_ledger':
        return <MainLedgerPage />;
      case 'partner_kharcha':
        return <PartnerKharchaPage />;
      case 'vendor_page':
        return <VendorKhataPage />;
      case 'salary_rent':
        return <SalaryRentPage />;
      case 'platform_profit':
        return <PlatformProfitPage />;
      case 'investment':
        return <InvestmentPage />;
      case 'user_access':
        return isSuperAdmin() ? (
          <UserAccessManager />
        ) : (
          <div className="p-8 text-center text-slate-400">Restricted to Super Admin.</div>
        );
      case 'audit_logs':
        return <AuditLogsPage />;
      default:
        return <MainLedgerPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar activeTab={activeTab} pageTitle={PAGE_TITLES[activeTab] || 'Dashboard'} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto bg-slate-950/60 pb-12">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PortalShell />
    </AuthProvider>
  );
}
