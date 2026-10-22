import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldAlert, Camera, Image, Users, 
  ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, BadgeCheck, Scale 
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: 'reports' | 'photos' | 'selfies' | 'users' | 'waitlist';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab }) => {
  const { 
    navigateTo, 
    reports, 
    selfieVerifications, 
    photoModerations, 
    allUsers,
    waitlistEntries,
    activeRole 
  } = useApp();

  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const pendingSelfiesCount = selfieVerifications.filter(s => s.status === 'pending').length;
  const pendingPhotosCount = photoModerations.filter(p => p.status === 'pending').length;
  const waitingWaitlistCount = waitlistEntries.filter(w => w.status === 'waiting').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Admin Top Header in Deep Navy */}
      <div className="bg-[#11172B] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Koodal Moderator Command Center &bull; Authorized Staff Only</span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Trust & Safety Admin Panel
          </h1>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Review community incident reports, hand-verify submitted gesture selfies, and screen profile media.
          </p>
        </div>

        <button
          onClick={() => navigateTo('/discover')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Member View</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#F0E3E6] dark:border-slate-800 gap-2 sm:gap-6 overflow-x-auto pb-1 text-xs font-semibold" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'reports'}
          onClick={() => navigateTo('/admin/reports')}
          className={`pb-3 px-1 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-[#F20D4E] text-[#F20D4E] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Reports Queue</span>
          {pendingReportsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
              {pendingReportsCount}
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'selfies'}
          onClick={() => navigateTo('/admin/selfies')}
          className={`pb-3 px-1 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'selfies'
              ? 'border-[#079669] text-[#079669] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-white'
          }`}
        >
          <BadgeCheck className="w-4 h-4 text-[#079669]" />
          <span>Selfie Verification</span>
          {pendingSelfiesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#079669] text-white text-[10px] font-bold">
              {pendingSelfiesCount}
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'photos'}
          onClick={() => navigateTo('/admin/photos')}
          className={`pb-3 px-1 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'photos'
              ? 'border-[#F20D4E] text-[#F20D4E] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-white'
          }`}
        >
          <Image className="w-4 h-4 text-[#F20D4E]" />
          <span>Photo Approval</span>
          {pendingPhotosCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#F20D4E] text-white text-[10px] font-bold">
              {pendingPhotosCount}
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'waitlist'}
          onClick={() => navigateTo('/admin/waitlist')}
          className={`pb-3 px-1 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'waitlist'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Ratio & Waitlist</span>
          {waitingWaitlistCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
              {waitingWaitlistCount}
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'users'}
          onClick={() => navigateTo('/admin/users')}
          className={`pb-3 px-1 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-[#11172B] text-[#11172B] dark:text-white font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-[#667085]" />
          <span>Member Directory ({allUsers.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  );
};
