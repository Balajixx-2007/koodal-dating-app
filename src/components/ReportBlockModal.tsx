import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Profile, Report } from '../types';
import { ShieldAlert, CheckCircle, X, AlertTriangle } from 'lucide-react';

interface ReportBlockModalProps {
  targetProfile: Profile;
  onClose: () => void;
}

export const ReportBlockModal: React.FC<ReportBlockModalProps> = ({ targetProfile, onClose }) => {
  const { t, submitReport, blockUser } = useApp();
  const [reason, setReason] = useState<Report['reason']>('inappropriate_content');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReport(
      targetProfile.userId,
      targetProfile.name,
      targetProfile.photos[0],
      reason,
      details || 'Submitted via standard report flow.'
    );
    if (alsoBlock) {
      blockUser(targetProfile.userId);
    }
    setSubmitted(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11172B]/80 backdrop-blur-sm animate-card-entrance"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="surface-card max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#98A2B3] hover:text-[#15182B] dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-[#D97706] flex items-center justify-center border border-amber-200 dark:border-amber-900">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 id="report-modal-title" className="font-heading font-bold text-lg text-[#15182B] dark:text-white">
                  {t.report_title}
                </h3>
                <p className="text-xs text-[#667085]">
                  Target: <span className="font-semibold text-[#15182B] dark:text-white">{targetProfile.name}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-[#667085] dark:text-slate-300 mb-4 bg-[#FFF9F5] dark:bg-slate-800 p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 leading-relaxed">
              {t.report_subtitle} Reports trigger immediate review by our human moderation team within 24 hours.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1.5">
                  Select Reason (Choose one)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'inappropriate_content', label: 'Inappropriate Photos or Bio' },
                    { id: 'scam', label: 'Financial Scam, Crypto or Asking for Money' },
                    { id: 'intent_mismatch', label: 'Misrepresenting Intent / Aggressive Advances' },
                    { id: 'fake_profile', label: 'Fake Profile / Catfish / Stolen Photos' },
                    { id: 'underage', label: 'Suspected Underage Member (Under 18)' },
                    { id: 'harassment', label: 'Harassment or Offensive Language' },
                  ].map(item => (
                    <label 
                      key={item.id}
                      className={`flex items-center p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        reason === item.id 
                          ? 'border-[#F59E0B] bg-[#FFFBEB] dark:bg-amber-950/20 text-[#92400E] dark:text-amber-200 font-semibold'
                          : 'border-[#F0E3E6] dark:border-slate-700 hover:bg-[#FFF9F5] dark:hover:bg-slate-800 text-[#667085] dark:text-slate-300'
                      }`}
                    >
                      <input 
                        type="radio"
                        name="reason"
                        value={item.id}
                        checked={reason === item.id}
                        onChange={() => setReason(item.id as any)}
                        className="mr-2 text-[#D97706] focus:ring-[#D97706]"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                  Additional Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide context to help our moderation team review quickly..."
                  className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFF0F3] dark:bg-rose-950/20 border border-[#F8B4C4] dark:border-rose-900 text-xs text-[#D80B42] dark:text-rose-300">
                <input 
                  type="checkbox"
                  id="alsoBlock"
                  checked={alsoBlock}
                  onChange={(e) => setAlsoBlock(e.target.checked)}
                  className="rounded text-[#F20D4E] focus:ring-[#F20D4E]"
                />
                <label htmlFor="alsoBlock" className="font-medium cursor-pointer">
                  Also block {targetProfile.name} immediately so they cannot see or contact you
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl btn-secondary-surface text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Submit Report</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#ECFDF5] text-[#079669] flex items-center justify-center mx-auto mb-2 border border-[#A7F3D0]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              Report Queued for Review
            </h3>
            <p className="text-xs text-[#667085] dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Thank you for keeping Koodal safe. Our team has queued this case for human review within 24 hours. The member has also been blocked from your feed.
            </p>
            <button
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-[#11172B] hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
