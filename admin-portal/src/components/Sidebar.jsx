import React from 'react';
import {
  BookOpen,
  Wallet,
  Building2,
  Users,
  TrendingUp,
  PieChart,
  Shield,
  FileText,
  Lock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { canView, canEdit, isSuperAdmin, getAccessLevel } = useAuth();

  const navItems = [
    {
      id: 'main_ledger',
      label: 'Main Page (Cashbook)',
      sub: 'Acube, Treo, Tritoy & Cash',
      icon: BookOpen,
      pageKey: 'main_ledger',
    },
    {
      id: 'partner_kharcha',
      label: 'Partner Kharcha (गल्ला)',
      sub: 'Ashish, Aman, Anurag Counter',
      icon: Wallet,
      pageKey: 'partner_kharcha',
    },
    {
      id: 'vendor_page',
      label: 'Vendor Page (Khata)',
      sub: 'Purchases, Payments & Due',
      icon: Building2,
      pageKey: 'vendor_page',
    },
    {
      id: 'salary_rent',
      label: 'सबका Salary + Rent',
      sub: 'Staff Payroll & Property Rent',
      icon: Users,
      pageKey: 'salary_rent',
    },
    {
      id: 'platform_profit',
      label: 'Platform Profit (P&L)',
      sub: 'Flipkart, Meesho, Net Profit',
      icon: TrendingUp,
      pageKey: 'platform_profit',
    },
    {
      id: 'investment',
      label: 'Investment Tracker',
      sub: 'Vishal, Bhai, Divesh Capital',
      icon: PieChart,
      pageKey: 'investment',
    },
  ];

  const adminItems = [
    {
      id: 'user_access',
      label: 'User & Access Manager',
      sub: 'Email Whitelist & Permissions',
      icon: Shield,
      pageKey: 'user_access',
      superAdminOnly: true,
    },
    {
      id: 'audit_logs',
      label: 'Audit Log Explorer',
      sub: 'Which email edited what',
      icon: FileText,
      pageKey: 'audit_logs',
    },
  ];

  return (
    <aside className="w-72 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-6 overflow-y-auto">
        {/* Core Financial Modules */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Financial & Accounting Modules
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const visible = canView(item.pageKey);
              const accessMode = getAccessLevel(item.pageKey);
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              if (!visible) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl opacity-40 cursor-not-allowed bg-slate-950/20 text-slate-500"
                    title="Access Restricted by Super Admin"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <div>
                        <div className="text-xs font-semibold text-slate-500">{item.label}</div>
                        <div className="text-[10px] text-slate-600">{item.sub}</div>
                      </div>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-semibold'
                      : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate leading-tight">{item.label}</div>
                      <div className={`text-[10px] truncate leading-tight mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                        {item.sub}
                      </div>
                    </div>
                  </div>

                  {/* Mode Indicator */}
                  {!isSuperAdmin() && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ml-1 ${
                        accessMode === 'edit'
                          ? isActive
                            ? 'bg-blue-700 text-blue-100'
                            : 'bg-blue-500/20 text-blue-400'
                          : isActive
                          ? 'bg-amber-600/80 text-amber-100'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {accessMode === 'edit' ? 'Edit' : 'View'}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Administration & Security */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Governance & Audit
          </div>
          <nav className="space-y-1">
            {adminItems.map((item) => {
              if (item.superAdminOnly && !isSuperAdmin()) return null;
              const visible = canView(item.pageKey);
              if (!visible) return null;

              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 font-semibold'
                      : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-purple-400'}`} />
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate leading-tight">{item.label}</div>
                      <div className={`text-[10px] truncate leading-tight mt-0.5 ${isActive ? 'text-purple-100' : 'text-slate-500'}`}>
                        {item.sub}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 bg-slate-950/40">
        <div className="flex items-center justify-between font-mono">
          <span>PORTAL ACTIVE</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400 truncate">
          Main Admin: <strong className="text-slate-200">ashishpsd91@gmail.com</strong>
        </div>
      </div>
    </aside>
  );
}
