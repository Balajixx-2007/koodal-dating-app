import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminLayout } from './AdminLayout';
import { 
  ShieldAlert, AlertTriangle, CheckCircle, Ban, 
  Clock, ShieldOff, AlertCircle, X 
} from 'lucide-react';
import { Report } from '../../types';

export const AdminReports: React.FC = () => {
  const { reports, reviewReport } = useApp();
  const [confirmingAction, setConfirmingAction] = useState<{
    report: Report;
    action: 'ban' | 'suspend';
  } | null>(null);

  const handleExecuteConfirmedAction = () => {
    if (!confirmingAction) return;
    reviewReport(confirmingAction.report.id, confirmingAction.action);
    setConfirmingAction(null);
  };

  return (
    <AdminLayout activeTab="reports">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
            Pending Incident Reports
          </h2>
          <span className="text-xs text-[#667085]">
            Target SLA: Resolved within 24 hours
          </span>
        </div>

        {reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => {
              const isResolved = report.status !== 'pending';

              return (
                <div
                  key={report.id}
                  className={`surface-card p-6 space-y-4 transition-all ${
                    isResolved 
                      ? 'opacity-75' 
                      : 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0E3E6] dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={report.targetPhoto}
                        alt={report.targetName}
                        className="w-12 h-12 rounded-2xl object-cover border border-[#F0E3E6]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
                            Target: {report.targetName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF0F3] text-[#D80B42] border border-[#F8B4C4]">
                            {report.reason.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#98A2B3] mt-0.5">
                          Report ID: {report.id} &bull; Filed: {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        report.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : report.status === 'reviewed_banned'
                          ? 'bg-red-100 text-red-800'
                          : report.status === 'reviewed_suspended'
                          ? 'bg-orange-100 text-orange-800'
                          : report.status === 'reviewed_warned'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {report.status === 'pending' ? 'Pending Review' : report.status.replace('reviewed_', '').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 text-xs text-[#15182B] dark:text-slate-200 border border-[#F0E3E6] dark:border-slate-700">
                    <span className="font-bold block mb-1 text-[#15182B] dark:text-white">
                      Incident Summary / Evidence:
                    </span>
                    <p className="italic font-medium">"{report.details}"</p>
                  </div>

                  {/* Actions */}
                  {report.status === 'pending' ? (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        onClick={() => reviewReport(report.id, 'warn')}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-300 transition-colors"
                      >
                        Issue Warning
                      </button>

                      <button
                        onClick={() => setConfirmingAction({ report, action: 'suspend' })}
                        className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold border border-orange-300 transition-colors"
                      >
                        Suspend 7 Days...
                      </button>

                      <button
                        onClick={() => setConfirmingAction({ report, action: 'ban' })}
                        className="px-3.5 py-2 rounded-xl btn-destructive text-xs flex items-center gap-1 shadow-xs"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Permanent Ban...</span>
                      </button>

                      <button
                        onClick={() => reviewReport(report.id, 'dismiss')}
                        className="px-3.5 py-2 rounded-xl btn-secondary-surface text-xs ml-auto"
                      >
                        Dismiss Report
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-[#667085] flex items-center gap-1.5 pt-1">
                      <CheckCircle className="w-4 h-4 text-[#079669]" />
                      <span>Action recorded by {report.reviewedBy || 'Moderator'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="surface-card p-8 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-[#079669] mx-auto" />
            <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
              Reports Queue is Clear
            </h3>
            <p className="text-xs text-[#667085]">
              No pending incident reports. 100% of reported issues have been processed within SLA.
            </p>
          </div>
        )}
      </div>

      {/* Deliberate Confirmation Modal for High-Impact Actions */}
      {confirmingAction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11172B]/80 backdrop-blur-sm animate-card-entrance"
          role="dialog"
          aria-modal="true"
        >
          <div className="surface-card max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              confirmingAction.action === 'ban' ? 'bg-red-100 text-[#DC2626]' : 'bg-orange-100 text-orange-600'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              Confirm {confirmingAction.action === 'ban' ? 'Permanent Account Ban' : '7-Day Suspension'}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Are you sure you want to enforce a {confirmingAction.action === 'ban' ? 'permanent ban' : '7-day suspension'} on account <span className="font-bold text-[#15182B] dark:text-white">{confirmingAction.report.targetName}</span>? This action is audited and logged in the moderation ledger.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmingAction(null)}
                className="flex-1 py-2.5 rounded-xl btn-secondary-surface text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs ${
                  confirmingAction.action === 'ban' ? 'btn-destructive' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Confirm {confirmingAction.action === 'ban' ? 'Permanent Ban' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
