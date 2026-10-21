import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, EyeOff, Trash2, ShieldCheck, Lock, 
  HelpCircle, Check, AlertTriangle, ArrowRight, Mail 
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { t, myProfile, updateMyProfile, deleteAccount, navigateTo } = useApp();
  const [isPaused, setIsPaused] = useState(myProfile.isPaused || false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleTogglePause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    updateMyProfile({ isPaused: nextState });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.toLowerCase() === 'delete') {
      deleteAccount();
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-extrabold text-[#15182B] dark:text-white">
          Account & Privacy Settings
        </h2>
        <p className="text-xs text-[#667085] mt-0.5">
          Manage your discovery visibility, notifications, and DPDP data rights.
        </p>
      </div>

      {/* Discovery & Privacy controls */}
      <div className="surface-card p-6 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3]">
          Discovery Visibility
        </h3>

        {/* Pause profile toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-[#667085] dark:text-slate-300" />
              <span className="font-bold text-sm text-[#15182B] dark:text-white">
                {t.pause_profile}
              </span>
            </div>
            <p className="text-xs text-[#667085] dark:text-slate-400 max-w-sm">
              {t.pause_desc}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPaused}
            aria-label="Pause profile visibility"
            onClick={handleTogglePause}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              isPaused ? 'bg-[#F59E0B] justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-xs transition-transform"></div>
          </button>
        </div>

        {isPaused && (
          <div className="p-3 rounded-2xl bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-xs font-medium">
            Your profile is currently hidden from new matches. Existing conversation threads remain active.
          </div>
        )}

        <hr className="border-[#F0E3E6] dark:border-slate-800" />

        {/* Notification settings */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3]">
          Notifications
        </h3>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#667085] dark:text-slate-300" />
              <span className="font-bold text-sm text-[#15182B] dark:text-white">
                {t.email_notifications}
              </span>
            </div>
            <p className="text-xs text-[#667085] max-w-sm">
              Receive email notifications when a compatible mutual connection starts talking.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailNotifs}
            aria-label="Toggle email notifications"
            onClick={() => setEmailNotifs(!emailNotifs)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              emailNotifs ? 'bg-[#F20D4E] justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-xs transition-transform"></div>
          </button>
        </div>
      </div>

      {/* Safety & Legal links */}
      <div className="surface-card p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3]">
          Trust & Legal Framework
        </h3>

        <div className="divide-y divide-[#F0E3E6] dark:divide-slate-800 text-xs">
          <button
            onClick={() => navigateTo('/safety')}
            className="w-full py-3 flex items-center justify-between text-[#15182B] dark:text-slate-300 hover:text-[#F20D4E] transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#079669]" />
              <span className="font-medium">Safety Guidelines & Scam Prevention</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#98A2B3]" />
          </button>

          <button
            onClick={() => navigateTo('/terms')}
            className="w-full py-3 flex items-center justify-between text-[#15182B] dark:text-slate-300 hover:text-[#F20D4E] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#667085]" />
              <span className="font-medium">Terms of Service</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#98A2B3]" />
          </button>

          <button
            onClick={() => navigateTo('/privacy')}
            className="w-full py-3 flex items-center justify-between text-[#15182B] dark:text-slate-300 hover:text-[#F20D4E] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#667085]" />
              <span className="font-medium">Privacy Policy & Grievance Officer Contact</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#98A2B3]" />
          </button>
        </div>
      </div>

      {/* DPDP Act 2023 Account Deletion Section */}
      <div className="surface-card p-6 space-y-4 border-red-200 bg-red-50/30 dark:bg-red-950/20">
        <div>
          <h3 className="font-heading text-sm font-bold text-[#DC2626] flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#DC2626]" />
            <span>{t.delete_account}</span>
          </h3>
          <p className="text-xs text-[#DC2626]/80 mt-1">
            {t.delete_account_warn}
          </p>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2.5 rounded-xl btn-destructive text-xs"
        >
          Permanently Delete My Data
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11172B]/80 backdrop-blur-sm animate-card-entrance"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="surface-card max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#DC2626] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 id="delete-dialog-title" className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              Permanent Account Removal
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              This action cannot be undone. In accordance with Section 12 of the DPDP Act 2023, your photos, verification selfies, mutual matches, and chat transcripts will be immediately purged.
            </p>

            <div className="text-left">
              <label className="block text-[11px] font-bold text-[#15182B] dark:text-slate-300 mb-1">
                Type "DELETE" below to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 py-2.5 rounded-xl btn-secondary-surface text-xs"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmation.toLowerCase() !== 'delete'}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl btn-destructive text-xs disabled:opacity-40"
              >
                Confirm & Wipe Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
