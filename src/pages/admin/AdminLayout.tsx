import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldAlert, Camera, Image, Users, 
  ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, BadgeCheck, Scale, KeyRound, Lock 
} from 'lucide-react';
import { isAdminSession2FAVerified, verifyAdmin2FA } from '../../lib/admin-auth-service';

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

  const [is2FAVerified, setIs2FAVerified] = useState<boolean>(() => isAdminSession2FAVerified());
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const pendingSelfiesCount = selfieVerifications.filter(s => s.status === 'pending').length;
  const pendingPhotosCount = photoModerations.filter(p => p.status === 'pending').length;
  const waitingWaitlistCount = waitlistEntries.filter(w => w.status === 'waiting').length;

  if (activeRole !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-[#DC2626] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#15182B] dark:text-white">
          Access Restricted
        </h2>
        <p className="text-xs text-[#667085] dark:text-slate-400 mt-2">
          This area is restricted to authorized Koodal administrators only. Non-admin members cannot view or manage moderation queues.
        </p>
        <button
          onClick={() => navigateTo('/discover')}
          className="mt-6 px-5 py-2.5 btn-primary-rose text-xs inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Discovery</span>
        </button>
      </div>
    );
  }

  // Admin Two-Step Verification (2FA) Gate
  if (!is2FAVerified) {
    const handleVerify2FA = async (e: React.FormEvent) => {
      e.preventDefault();
      setTwoFactorError(null);
      setIsVerifying(true);

      try {
        const result = await verifyAdmin2FA(twoFactorCode);
        if (result.success) {
          setIs2FAVerified(true);
        } else {
          setTwoFactorError(result.error || 'Invalid verification code. Please check your authenticator app.');
        }
      } catch (err: any) {
        setTwoFactorError(err.message || 'Verification failed. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    };

    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="surface-card p-8 space-y-6 shadow-xl border border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/20">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Step 5 &bull; Two-Step Admin Verification</span>
            </div>
            <h2 className="text-xl font-bold text-[#15182B] dark:text-white">
              Admin Two-Factor Authentication
            </h2>
            <p className="text-xs text-[#667085] dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Administrative access requires two-step verification to safeguard sensitive member data, private photos, and moderation controls.
            </p>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-4 text-left">
            <div>
              <label htmlFor="admin-2fa-input" className="block text-xs font-semibold text-[#15182B] dark:text-slate-200 mb-1.5">
                6-Digit Authenticator Code
              </label>
              <input
                id="admin-2fa-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                required
                autoFocus
              />
            </div>

            {twoFactorError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800/40" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{twoFactorError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || twoFactorCode.length < 6}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying 2FA Token...' : 'Unlock Admin Command Center'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/discover')}
              className="w-full py-2.5 text-center text-xs text-[#667085] hover:text-[#15182B] dark:hover:text-white font-medium"
            >
              Return to Member Discovery
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Admin Top Header in Deep Navy */}
      <div className="bg-[#11172B] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Koodal Moderator Command Center &bull; Authorized Staff Only (2FA Verified)</span>
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
