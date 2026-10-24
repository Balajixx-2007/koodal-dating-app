import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Heart, Sparkles, MessageCircle, UserRound, ShieldCheck, 
  Settings, Globe, ShieldAlert, BadgeCheck 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    t, 
    language, 
    setLanguage, 
    currentView, 
    navigateTo, 
    matches, 
    reports, 
    selfieVerifications,
    activeRole,
    setActiveRole
  } = useApp();

  const totalUnread = matches.reduce((acc, m) => acc + (m.unreadCount || 0), 0);
  const pendingAdminItems = reports.filter(r => r.status === 'pending').length + 
    selfieVerifications.filter(s => s.status === 'pending').length;

  return (
    <header className="sticky top-0 z-40 transition-all">
      {/* Top utility bar */}
      <div className="bg-[#11172B] text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F20D4E]"></span>
          <span className="font-medium tracking-wide text-slate-300">
            {t.stat_cities} &bull; Intent-First Dating
          </span>
        </div>
        {!import.meta.env.PROD ? (
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Role View (Dev):</span>
            <div className="inline-flex rounded-full bg-slate-800 p-0.5 text-xs border border-slate-700">
              <button
                onClick={() => {
                  setActiveRole('member');
                  navigateTo('/discover');
                }}
                className={`px-3 py-0.5 rounded-full transition-all text-[11px] font-semibold ${
                  activeRole === 'member' && !currentView.startsWith('/admin')
                    ? 'bg-[#F20D4E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Member
              </button>
              <button
                onClick={() => {
                  setActiveRole('admin');
                  navigateTo('/admin/reports');
                }}
                className={`px-3 py-0.5 rounded-full transition-all text-[11px] font-semibold flex items-center gap-1 ${
                  currentView.startsWith('/admin')
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Admin ({pendingAdminItems})</span>
              </button>
              <button
                onClick={() => {
                  setActiveRole('visitor');
                  navigateTo('/');
                }}
                className={`px-3 py-0.5 rounded-full transition-all text-[11px] font-semibold ${
                  currentView === '/'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Landing
              </button>
            </div>
          </div>
        ) : (
          activeRole === 'admin' && (
            <button
              onClick={() => navigateTo('/admin/reports')}
              className="px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold flex items-center gap-1 shadow-sm"
            >
              <ShieldAlert className="w-3 h-3 text-slate-950" />
              <span>Admin Portal ({pendingAdminItems})</span>
            </button>
          )
        )}
      </div>

      {/* Main Koodal Navigation Bar */}
      <div className="koodal-nav">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Logo with Romantic Heart */}
          <div 
            onClick={() => navigateTo(activeRole === 'admin' ? '/admin/reports' : '/discover')} 
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F20D4E] to-[#D80B42] flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-all duration-200">
                <Heart className="w-5 h-5 fill-white text-white drop-shadow-sm" />
              </div>
              <BadgeCheck className="w-4 h-4 text-emerald-500 fill-white absolute -bottom-1 -right-1" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight text-[#15182B] dark:text-white group-hover:text-[#F20D4E] transition-colors">
                  {t.brandName}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF0F3] text-[#D80B42] dark:bg-rose-950/60 dark:text-rose-300 border border-[#F0E3E6] dark:border-rose-900/40">
                  Intent-First
                </span>
              </div>
              <p className="text-[11px] text-[#667085] dark:text-slate-400 font-medium hidden sm:block">
                {t.brandTagline}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#FFF9F5] dark:bg-slate-900 p-1 rounded-2xl border border-[#F0E3E6] dark:border-slate-800">
            <button
              onClick={() => navigateTo('/discover')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentView === '/discover'
                  ? 'bg-white dark:bg-slate-800 text-[#F20D4E] shadow-sm border border-[#F0E3E6] dark:border-slate-700'
                  : 'text-[#667085] hover:text-[#15182B] dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#F20D4E]" />
              <span>{t.nav_discover}</span>
            </button>

            <button
              onClick={() => navigateTo('/matches')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 relative ${
                currentView === '/matches' || currentView.startsWith('/chat')
                  ? 'bg-white dark:bg-slate-800 text-[#F20D4E] shadow-sm border border-[#F0E3E6] dark:border-slate-700'
                  : 'text-[#667085] hover:text-[#15182B] dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-[#F20D4E]" />
              <span>{t.nav_matches}</span>
              {totalUnread > 0 && (
                <span className="w-4.5 h-4.5 rounded-full bg-[#F20D4E] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {totalUnread}
                </span>
              )}
            </button>

            <button
              onClick={() => navigateTo('/safety')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentView === '/safety'
                  ? 'bg-white dark:bg-slate-800 text-[#F20D4E] shadow-sm border border-[#F0E3E6] dark:border-slate-700'
                  : 'text-[#667085] hover:text-[#15182B] dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#079669]" />
              <span>{t.nav_safety}</span>
            </button>

            <button
              onClick={() => navigateTo('/me')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentView === '/me'
                  ? 'bg-white dark:bg-slate-800 text-[#F20D4E] shadow-sm border border-[#F0E3E6] dark:border-slate-700'
                  : 'text-[#667085] hover:text-[#15182B] dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
              }`}
            >
              <UserRound className="w-4 h-4 text-[#667085]" />
              <span>{t.nav_profile}</span>
            </button>

            <button
              onClick={() => navigateTo('/settings')}
              className={`p-2 rounded-xl transition-all ${
                currentView === '/settings' 
                  ? 'bg-white dark:bg-slate-800 text-[#F20D4E] shadow-sm' 
                  : 'text-[#98A2B3] hover:text-[#15182B] dark:hover:text-slate-200'
              }`}
              title="Settings & Privacy"
              aria-label="Settings & Privacy"
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>

          {/* Right Action: Language Switcher & Admin Shortcut */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-[#15182B] dark:text-slate-200 hover:border-[#F8B4C4] hover:text-[#F20D4E] shadow-sm transition-all"
              title="Toggle Language / மொழி மாற்றம்"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#F20D4E]" />
              <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
            </button>

            <button
              onClick={() => navigateTo('/admin/reports')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#11172B] hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors border border-slate-700"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
              {pendingAdminItems > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {pendingAdminItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
