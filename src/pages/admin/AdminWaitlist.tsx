import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminLayout } from './AdminLayout';
import { 
  Users, Scale, AlertTriangle, CheckCircle2, 
  ArrowRight, Sparkles, Filter, ShieldCheck, 
  Clock, RefreshCw, ChevronRight, UserCheck 
} from 'lucide-react';
import { IntentBadge } from '../../components/IntentBadge';
import { WaitlistService } from '../../lib/waitlist-service';

export const AdminWaitlist: React.FC = () => {
  const { 
    waitlistEntries, 
    admissionBatches, 
    runBatchAdmission 
  } = useApp();

  const [selectedCity, setSelectedCity] = useState<'Chennai' | 'Bangalore'>('Chennai');
  const [womenInput, setWomenInput] = useState<number>(10);
  const [lastBatchResult, setLastBatchResult] = useState<{
    womenAdmitted: number;
    menAdmitted: number;
    newRatio: number;
  } | null>(null);

  const womenToAdmit = Math.max(0, womenInput);

  // Dynamic database metrics state
  const [metrics, setMetrics] = useState({
    activeWomen: 0,
    activeMen: 0,
    currentRatio: 1.0,
    computedMenToAdmit: 0,
    projectedRatio: 1.0,
    isHealthy: true,
    isLoading: false
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchDatabaseMetrics() {
      setMetrics(prev => ({ ...prev, isLoading: true }));
      const res = await WaitlistService.executeBatchAdmission(selectedCity, womenToAdmit, true);
      if (isMounted) {
        if (res.success) {
          setMetrics({
            activeWomen: res.activeWomen ?? 0,
            activeMen: res.activeMen ?? 0,
            currentRatio: res.ratioBefore ?? 1.0,
            computedMenToAdmit: res.admittedMen ?? 0,
            projectedRatio: res.ratioAfter ?? 1.0,
            isHealthy: res.isHealthy ?? true,
            isLoading: false
          });
        } else {
          // Fallback based on real queues
          const fallbackWomen = waitlistEntries.filter(w => w.lane === 'women_and_others' && w.city.toLowerCase().includes(selectedCity.toLowerCase()) && w.status === 'admitted').length;
          const fallbackMen = waitlistEntries.filter(w => w.lane === 'men' && w.city.toLowerCase().includes(selectedCity.toLowerCase()) && w.status === 'admitted').length;
          const ratio = fallbackWomen > 0 ? Number((fallbackMen / fallbackWomen).toFixed(2)) : 1.0;
          const menAdmit = Math.max(0, Math.floor(1.5 * (fallbackWomen + womenToAdmit) - fallbackMen));
          const projRatio = (fallbackWomen + womenToAdmit) > 0 ? Number(((fallbackMen + menAdmit) / (fallbackWomen + womenToAdmit)).toFixed(2)) : 1.0;
          setMetrics({
            activeWomen: fallbackWomen,
            activeMen: fallbackMen,
            currentRatio: ratio,
            computedMenToAdmit: menAdmit,
            projectedRatio: projRatio,
            isHealthy: projRatio >= 1.0 && projRatio <= 1.5,
            isLoading: false
          });
        }
      }
    }
    fetchDatabaseMetrics();
    return () => { isMounted = false; };
  }, [selectedCity, womenToAdmit, waitlistEntries]);

  // Filter queues
  const womenAndOthersQueue = waitlistEntries
    .filter(w => w.lane === 'women_and_others' && w.city.toLowerCase().includes(selectedCity.toLowerCase()) && w.status === 'waiting')
    .sort((a, b) => b.score - a.score);

  const menQueue = waitlistEntries
    .filter(w => w.lane === 'men' && w.city.toLowerCase().includes(selectedCity.toLowerCase()) && w.status === 'waiting')
    .sort((a, b) => b.score - a.score);

  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecuteBatch = async () => {
    setIsExecuting(true);
    try {
      const result = await runBatchAdmission(selectedCity, womenToAdmit, metrics.computedMenToAdmit);
      setLastBatchResult(result);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AdminLayout activeTab={'waitlist' as any}>
      <div className="space-y-6">
        {/* City Filter & Ratio Summary Banner */}
        <div className="surface-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0E3E6] dark:border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800/40">
                <Scale className="w-3.5 h-3.5" />
                <span>Section 13 &bull; Ratio Control & Two-Lane Queue</span>
              </div>
              <h2 className="font-heading text-xl font-bold text-[#15182B] dark:text-white mt-1">
                Active Member Ratio Dashboard
              </h2>
            </div>

            {/* City Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              {(['Chennai', 'Bangalore'] as const).map(city => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCity === city
                      ? 'bg-white dark:bg-slate-900 text-[#15182B] dark:text-white shadow-xs'
                      : 'text-[#667085] hover:text-[#15182B] dark:hover:text-white'
                  }`}
                >
                  {city} Cluster
                </button>
              ))}
            </div>
          </div>

          {/* Ratio Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[#F0E3E6] dark:border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-[#667085]">Active Women</span>
              <p className="font-heading text-3xl font-extrabold text-[#F20D4E]">{metrics.activeWomen}</p>
              <span className="text-[11px] text-[#667085]">Verified in last 14 days (Database)</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[#F0E3E6] dark:border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-[#667085]">Active Men</span>
              <p className="font-heading text-3xl font-extrabold text-[#15182B] dark:text-white">{metrics.activeMen}</p>
              <span className="text-[11px] text-[#667085]">Verified in last 14 days (Database)</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[#F0E3E6] dark:border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-[#667085]">Current Ratio</span>
              <div className="flex items-baseline gap-2">
                <p className="font-heading text-3xl font-extrabold text-[#079669]">{metrics.currentRatio}:1</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  metrics.isHealthy
                    ? 'bg-emerald-100 text-[#065F46] dark:bg-emerald-950/60'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {metrics.isHealthy ? 'Healthy (1.0 - 1.5)' : 'Needs Balance'}
                </span>
              </div>
              <span className="text-[11px] text-[#667085]">Target: 1.0 to 1.5 men per woman</span>
            </div>
          </div>
        </div>

        {/* Batch Admission Calculator (Section 13) */}
        <div className="surface-card p-6 space-y-5 border-2 border-rose-200 dark:border-rose-900/40">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-heading text-base font-bold text-[#15182B] dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F20D4E]" />
                <span>Weekly Batch Admission Simulator</span>
              </h3>
              <p className="text-xs text-[#667085]">
                Formula: <code className="font-mono text-[#F20D4E]">men to admit = max(0, floor(1.5 × active women after batch - active men now))</code>
              </p>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#D80B42] border border-rose-200">
              {selectedCity} Weekly Intake
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider">
                Women & Others to Admit
              </label>
              <input
                type="number"
                min="1"
                max={Math.max(1, womenAndOthersQueue.length)}
                value={womenInput}
                onChange={(e) => setWomenInput(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-[#F20D4E]"
              />
              <span className="text-[11px] text-[#667085]">Available in queue: {womenAndOthersQueue.length}</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider">
                Computed Men to Admit
              </label>
              <div className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                <span>{metrics.computedMenToAdmit} men</span>
                <span className="text-[11px] text-[#079669] font-normal">Auto-balanced (DB)</span>
              </div>
              <span className="text-[11px] text-[#667085]">Available in queue: {menQueue.length}</span>
            </div>

            <button
              onClick={handleExecuteBatch}
              disabled={isExecuting || (womenAndOthersQueue.length === 0 && menQueue.length === 0)}
              className="w-full py-2.5 btn-primary-rose text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isExecuting ? 'Executing Batch...' : 'Execute Batch Admission'}</span>
            </button>
          </div>

          {/* Simulation Preview Banner */}
          <div className="p-3.5 rounded-xl bg-[#FFF0F3] dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#D80B42] dark:text-rose-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#079669] shrink-0" />
              <span>
                Preview: Admitting top {womenToAdmit} women & others and top {metrics.computedMenToAdmit} men will balance active pool to ratio {metrics.projectedRatio}:1.
              </span>
            </div>
            <div className="shrink-0 font-bold text-[#15182B] dark:text-white">
              Projected Ratio: <span className="text-[#079669]">{metrics.projectedRatio}:1</span>
            </div>
          </div>

          {lastBatchResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
              <span>
                Batch admitted successfully: {lastBatchResult.womenAdmitted} women/others and {lastBatchResult.menAdmitted} men. New active ratio: {lastBatchResult.newRatio}:1.
              </span>
              <span className="font-bold">Batch logged &bull; Emails queued</span>
            </div>
          )}
        </div>

        {/* Two-Lane Waiting Queues Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lane 1: Women & Others */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0E3E6] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-[#15182B] dark:text-white">
                  Lane 1: Women & Others ({womenAndOthersQueue.length})
                </h3>
                <p className="text-[11px] text-[#667085]">Admitted with priority to drive healthy density</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#F20D4E] font-bold text-xs">
                Lane 1
              </span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {womenAndOthersQueue.length === 0 ? (
                <p className="text-xs text-[#667085] py-6 text-center">No waiting entries in Lane 1.</p>
              ) : (
                womenAndOthersQueue.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-800 hover:border-rose-300 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-[#667085] text-[11px] w-5">#{idx + 1}</span>
                      <div className="truncate">
                        <p className="font-bold text-[#15182B] dark:text-white truncate">{entry.email}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#667085]">
                          <IntentBadge intent={entry.intent} size="sm" />
                          <span>&bull;</span>
                          <span>{entry.city}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#F20D4E] text-sm">{entry.score} pts</span>
                      <p className="text-[10px] text-[#667085]">
                        {entry.hasSelfieApproved ? '✓ Selfie' : 'No Selfie'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lane 2: Men */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0E3E6] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-[#15182B] dark:text-white">
                  Lane 2: Men ({menQueue.length})
                </h3>
                <p className="text-[11px] text-[#667085]">Paced strictly by the ratio formula</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#15182B] font-bold text-xs">
                Lane 2
              </span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {menQueue.length === 0 ? (
                <p className="text-xs text-[#667085] py-6 text-center">No waiting entries in Lane 2.</p>
              ) : (
                menQueue.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-800 hover:border-slate-400 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-[#667085] text-[11px] w-5">#{idx + 1}</span>
                      <div className="truncate">
                        <p className="font-bold text-[#15182B] dark:text-white truncate">{entry.email}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#667085]">
                          <IntentBadge intent={entry.intent} size="sm" />
                          <span>&bull;</span>
                          <span>{entry.city}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#15182B] dark:text-white text-sm">{entry.score} pts</span>
                      <p className="text-[10px] text-[#667085]">
                        {entry.hasSelfieApproved ? '✓ Selfie' : 'No Selfie'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Admission Batches Audit History */}
        <div className="surface-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0E3E6] dark:border-slate-800 pb-3">
            <h3 className="font-heading text-sm font-bold text-[#15182B] dark:text-white">
              Past Admission Batches Audit Trail
            </h3>
            <span className="text-[11px] text-[#667085]">{admissionBatches.length} recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0E3E6] dark:border-slate-800 text-[#667085]">
                  <th className="py-2.5 font-bold">Batch ID</th>
                  <th className="py-2.5 font-bold">City</th>
                  <th className="py-2.5 font-bold">Date</th>
                  <th className="py-2.5 font-bold">Women Admitted</th>
                  <th className="py-2.5 font-bold">Men Admitted</th>
                  <th className="py-2.5 font-bold">Ratio Before</th>
                  <th className="py-2.5 font-bold">Ratio After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E3E6] dark:divide-slate-800">
                {admissionBatches.map(b => (
                  <tr key={b.id} className="text-[#15182B] dark:text-slate-200">
                    <td className="py-2.5 font-mono text-[11px]">{b.id}</td>
                    <td className="py-2.5 font-bold">{b.city}</td>
                    <td className="py-2.5 text-[#667085]">{b.date}</td>
                    <td className="py-2.5 text-[#F20D4E] font-bold">+{b.womenAdmitted}</td>
                    <td className="py-2.5 font-bold">+{b.menAdmitted}</td>
                    <td className="py-2.5 text-[#667085]">{b.ratioBefore}:1</td>
                    <td className="py-2.5 text-[#079669] font-bold">{b.ratioAfter}:1</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
