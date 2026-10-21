import React from 'react';
import { useApp } from '../../context/AppContext';
import { AdminLayout } from './AdminLayout';
import { Image, Check, X, CheckCircle } from 'lucide-react';

export const AdminPhotos: React.FC = () => {
  const { photoModerations, reviewPhoto } = useApp();

  return (
    <AdminLayout activeTab="photos">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              Photo Moderation Queue
            </h2>
            <p className="text-xs text-[#667085]">
              Ensure newly uploaded photos follow community standards (no explicit content, violence, or promotional imagery).
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#FFF0F3] text-[#D80B42] text-xs font-semibold border border-[#F8B4C4]">
            {photoModerations.filter(p => p.status === 'pending').length} Pending
          </span>
        </div>

        {photoModerations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {photoModerations.map((item) => {
              const isPending = item.status === 'pending';

              return (
                <div
                  key={item.id}
                  className={`surface-card p-5 space-y-3 ${
                    isPending
                      ? 'border-[#F8B4C4] dark:border-rose-900/60 ring-1 ring-[#F20D4E]/20'
                      : 'opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-heading font-bold text-xs text-[#15182B] dark:text-white">
                        {item.userName}
                      </h4>
                      <span className="text-[10px] text-[#98A2B3]">
                        {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.status === 'approved'
                        ? 'bg-emerald-100 text-[#065F46]'
                        : item.status === 'rejected'
                        ? 'bg-rose-100 text-[#DC2626]'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-[#F0E3E6] bg-slate-900">
                    <img 
                      src={item.photoUrl} 
                      alt="Uploaded candidate" 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => reviewPhoto(item.id, true)}
                        className="flex-1 py-2 rounded-xl bg-[#079669] hover:bg-[#065F46] text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Photo</span>
                      </button>
                      <button
                        onClick={() => reviewPhoto(item.id, false)}
                        className="flex-1 py-2 rounded-xl btn-secondary-surface text-xs text-[#DC2626] hover:bg-rose-50 flex items-center justify-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
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
              No Photos Pending Moderation
            </h3>
            <p className="text-xs text-[#667085]">
              All member profile photos have been screened and approved.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
