import React from 'react';
import { useApp } from '../../context/AppContext';
import { AdminLayout } from './AdminLayout';
import { ShieldCheck, Check, X, Camera, AlertCircle, BadgeCheck } from 'lucide-react';

export const AdminSelfies: React.FC = () => {
  const { selfieVerifications, reviewSelfie } = useApp();

  return (
    <AdminLayout activeTab="selfies">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              Selfie Verification Queue
            </h2>
            <p className="text-xs text-[#667085]">
              Manually compare member profile photos with their submitted gesture selfie to grant the Verified Member badge.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] text-xs font-semibold border border-[#A7F3D0]">
            {selfieVerifications.filter(s => s.status === 'pending').length} Pending
          </span>
        </div>

        {selfieVerifications.length > 0 ? (
          <div className="space-y-4">
            {selfieVerifications.map((item) => {
              const isPending = item.status === 'pending';

              return (
                <div
                  key={item.id}
                  className={`surface-card p-6 space-y-4 ${
                    isPending
                      ? 'border-emerald-300 dark:border-emerald-900/60 ring-1 ring-emerald-500/20'
                      : 'opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
                        {item.userName}
                      </h3>
                      <p className="text-[11px] text-[#98A2B3]">
                        Submitted: {new Date(item.submittedAt).toLocaleString()}
                      </p>
                    </div>

                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      item.status === 'approved'
                        ? 'bg-emerald-100 text-[#065F46]'
                        : item.status === 'rejected'
                        ? 'bg-rose-100 text-[#DC2626]'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FFF9F5] dark:bg-slate-800 p-4 rounded-2xl border border-[#F0E3E6] dark:border-slate-700">
                    <div className="text-center space-y-2">
                      <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                        1. Uploaded Profile Photo
                      </span>
                      <div className="aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border border-[#F0E3E6] shadow-xs">
                        <img 
                          src={item.profilePhoto} 
                          alt="Profile reference" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <span className="text-[11px] font-bold text-[#079669] uppercase tracking-wider block">
                        2. Live Gesture Selfie (Two-Finger Gesture Verification)
                      </span>
                      <div className="aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xs relative">
                        <img 
                          src={item.selfieUrl} 
                          alt="Selfie proof" 
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-[#079669] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Live Proof
                        </span>
                      </div>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => reviewSelfie(item.id, true)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#079669] hover:bg-[#065F46] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <BadgeCheck className="w-4 h-4" />
                        <span>Approve & Grant Verified Badge</span>
                      </button>

                      <button
                        onClick={() => reviewSelfie(item.id, false)}
                        className="py-2.5 px-4 rounded-xl btn-secondary-surface text-xs font-semibold flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject / Retake</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#98A2B3]">
                      Decision settled by {item.reviewedBy || 'Moderator'}.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="surface-card p-8 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-[#079669] mx-auto" />
            <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
              No Pending Selfies
            </h3>
            <p className="text-xs text-[#667085]">
              All member selfie verifications have been processed.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
