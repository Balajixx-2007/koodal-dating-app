import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, MessageCircle, UserRound, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { canAccessMemberRoutes } from '../lib/waitlist-gate';

export const BottomNav: React.FC = () => {
  const { 
    currentView, 
    navigateTo, 
    matches, 
    reports, 
    selfieVerifications,
    currentUser,
    userWaitlistStatus,
    activeRole 
  } = useApp();

  const hasMemberAccess = canAccessMemberRoutes(currentUser, userWaitlistStatus);
  const totalUnread = matches.reduce((acc, m) => acc + (m.unreadCount || 0), 0);
  const pendingAdminItems = reports.filter(r => r.status === 'pending').length + 
    selfieVerifications.filter(s => s.status === 'pending').length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 koodal-nav px-2 py-1.5 flex items-center justify-around shadow-md">
      {hasMemberAccess ? (
        <>
          <button
            onClick={() => navigateTo('/discover')}
            className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === '/discover'
                ? 'text-[#F20D4E] font-semibold'
                : 'text-[#667085] hover:text-[#15182B] dark:text-slate-400'
            }`}
            aria-label="Discover"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Discover</span>
          </button>

          <button
            onClick={() => navigateTo('/matches')}
            className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors relative ${
              currentView === '/matches' || currentView.startsWith('/chat')
                ? 'text-[#F20D4E] font-semibold'
                : 'text-[#667085] hover:text-[#15182B] dark:text-slate-400'
            }`}
            aria-label="Matches"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#F20D4E] text-white text-[9px] font-bold flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Matches</span>
          </button>

          <button
            onClick={() => navigateTo('/safety')}
            className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === '/safety'
                ? 'text-[#F20D4E] font-semibold'
                : 'text-[#667085] hover:text-[#15182B] dark:text-slate-400'
            }`}
            aria-label="Safety"
          >
            <ShieldCheck className="w-5 h-5 text-[#079669]" />
            <span className="text-[10px] tracking-tight">Safety</span>
          </button>

          <button
            onClick={() => navigateTo('/me')}
            className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === '/me' || currentView === '/settings'
                ? 'text-[#F20D4E] font-semibold'
                : 'text-[#667085] hover:text-[#15182B] dark:text-slate-400'
            }`}
            aria-label="Profile"
          >
            <UserRound className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Profile</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => navigateTo('/waitlist/status')}
            className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === '/waitlist/status'
                ? 'text-[#F20D4E] font-semibold'
                : 'text-[#667085] hover:text-[#15182B] dark:text-slate-400'
            }`}
            aria-label="Waitlist Status"
          >
            <Clock className="w-5 h-5 text-[#F20D4E]" />
            <span className="text-[10px] tracking-tight">Waitlist</span>
          </button>

          <button
            onClick={() => navigateTo('/safety')}
            className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === '/safety'
                ? 'text-[#F20D4E] font-semibold'
                : 'text-[#667085] hover:text-[#15182B] dark:text-slate-400'
            }`}
            aria-label="Safety"
          >
            <ShieldCheck className="w-5 h-5 text-[#079669]" />
            <span className="text-[10px] tracking-tight">Safety</span>
          </button>
        </>
      )}

      {activeRole === 'admin' && (
        <button
          onClick={() => navigateTo('/admin/reports')}
          className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors relative ${
            currentView.startsWith('/admin')
              ? 'text-amber-600 font-semibold'
              : 'text-[#667085] hover:text-[#15182B] dark:text-slate-400'
          }`}
          aria-label="Admin Panel"
        >
          <div className="relative">
            <ShieldAlert className="w-5 h-5" />
            {pendingAdminItems > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                {pendingAdminItems}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Admin</span>
        </button>
      )}
    </nav>
  );
};
