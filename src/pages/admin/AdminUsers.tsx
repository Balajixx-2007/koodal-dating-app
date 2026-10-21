import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminLayout } from './AdminLayout';
import { Search, Ban, CheckCircle, Shield, UserX, RefreshCw, AlertTriangle } from 'lucide-react';
import { User } from '../../types';

export const AdminUsers: React.FC = () => {
  const { allUsers, toggleUserBan } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  const filtered = allUsers.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleToggle = (user: User) => {
    if (user.status !== 'banned') {
      // Banning is a dangerous action requiring confirmation
      setConfirmUser(user);
    } else {
      // Restoring can be executed directly
      toggleUserBan(user.id);
    }
  };

  const handleConfirmBan = () => {
    if (!confirmUser) return;
    toggleUserBan(confirmUser.id);
    setConfirmUser(null);
  };

  return (
    <AdminLayout activeTab="users">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              Member Directory & Status Management
            </h2>
            <p className="text-xs text-[#667085]">
              Audit member accounts, verify DPDP consent timestamps, and manage user suspensions.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email or ID..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'suspended', 'banned'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border transition-all ${
                filterStatus === st
                  ? 'bg-[#11172B] text-white border-[#11172B] shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-[#667085] dark:text-slate-300 border-[#F0E3E6] dark:border-slate-700'
              }`}
            >
              {st} ({st === 'all' ? allUsers.length : allUsers.filter(u => u.status === st).length})
            </button>
          ))}
        </div>

        {/* Member list table */}
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF9F5] dark:bg-slate-800/60 border-b border-[#F0E3E6] dark:border-slate-700 text-[#667085] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User ID & Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E3E6] dark:divide-slate-800">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-[#FFF9F5] dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#15182B] dark:text-white block">
                        {user.email}
                      </span>
                      <span className="text-[10px] text-[#98A2B3] font-mono">
                        {user.id}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 capitalize text-[#667085] dark:text-slate-300">
                      {user.role}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        user.status === 'active'
                          ? 'bg-emerald-100 text-[#065F46] dark:bg-emerald-950/60 dark:text-emerald-300'
                          : user.status === 'suspended'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {user.status === 'active' && <CheckCircle className="w-3 h-3" />}
                        {user.status === 'suspended' && <Shield className="w-3 h-3" />}
                        {user.status === 'banned' && <Ban className="w-3 h-3" />}
                        <span className="capitalize">{user.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#98A2B3] text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggle(user)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          user.status === 'banned'
                            ? 'bg-emerald-50 text-[#065F46] hover:bg-emerald-100 border border-emerald-300'
                            : 'btn-secondary-surface text-[#DC2626] hover:bg-rose-50'
                        }`}
                      >
                        {user.status === 'banned' ? 'Restore User' : 'Ban User...'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deliberate Confirmation Dialog for Banning Users */}
      {confirmUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11172B]/80 backdrop-blur-sm animate-card-entrance"
          role="dialog"
          aria-modal="true"
        >
          <div className="surface-card max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#DC2626] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              Confirm Account Ban
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Are you sure you want to ban user <span className="font-semibold text-[#15182B] dark:text-white">{confirmUser.email}</span>? This immediately revokes their session and hides their profile from Discovery.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmUser(null)}
                className="flex-1 py-2.5 rounded-xl btn-secondary-surface text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                className="flex-1 py-2.5 rounded-xl btn-destructive text-xs"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
