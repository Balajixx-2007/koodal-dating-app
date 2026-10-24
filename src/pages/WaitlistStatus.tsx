import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, ShieldCheck, CheckCircle2, Circle, ArrowRight, 
  Copy, Check, Share2, HelpCircle, Users, Award, Camera, 
  FileText, Clock, ExternalLink, AlertTriangle, PartyPopper 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WaitlistService } from '../lib/waitlist-service';
import { getClaimWindowDetails } from '../lib/waitlist-gate';

export const WaitlistStatus: React.FC = () => {
  const { userWaitlistStatus, boostWaitlistEntry, navigateTo, waitlistEntries } = useApp();
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selfiePromptModal, setSelfiePromptModal] = useState(false);

  const [livePosition, setLivePosition] = useState<{
    rank: number;
    total: number;
    estimatedDays: number;
    score: number;
    status: string;
    loading: boolean;
  }>({
    rank: 0,
    total: 0,
    estimatedDays: 0,
    score: userWaitlistStatus?.score || 0,
    status: userWaitlistStatus?.status || 'waiting',
    loading: !!userWaitlistStatus?.email,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadPosition() {
      if (!userWaitlistStatus?.email) return;
      try {
        const res = await WaitlistService.fetchWaitlistPosition(userWaitlistStatus.email);
        if (isMounted && res.success && res.found) {
          setLivePosition({
            rank: res.rank ?? 0,
            total: res.lane_total ?? 0,
            estimatedDays: res.estimated_days ?? 0,
            score: res.score ?? userWaitlistStatus.score,
            status: res.status ?? userWaitlistStatus.status,
            loading: false,
          });
        } else if (isMounted) {
          setLivePosition(prev => ({ ...prev, loading: false }));
        }
      } catch {
        if (isMounted) setLivePosition(prev => ({ ...prev, loading: false }));
      }
    }
    loadPosition();
    return () => { isMounted = false; };
  }, [userWaitlistStatus?.email, userWaitlistStatus?.score, userWaitlistStatus?.status]);

  // If no waitlist entry exists, redirect to /waitlist
  if (!userWaitlistStatus) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-heading text-xl font-bold">No Active Waitlist Entry Found</h2>
        <p className="text-xs text-[#667085]">Join the waitlist to view your honest queue standing.</p>
        <button
          onClick={() => navigateTo('/waitlist')}
          className="btn-primary-rose px-6 py-2.5 text-xs font-semibold"
        >
          Join Waitlist
        </button>
      </div>
    );
  }

  // Calculate position in lane from context fallback if DB position is not yet loaded
  const laneEntries = waitlistEntries
    .filter(w => w.lane === userWaitlistStatus.lane && w.status === 'waiting')
    .sort((a, b) => b.score - a.score);

  const localRank = laneEntries.findIndex(w => w.id === userWaitlistStatus.id) + 1;
  const currentRank = livePosition.rank > 0 
    ? livePosition.rank 
    : (localRank > 0 ? localRank : 1);
  const estimatedDays = livePosition.estimatedDays > 0 
    ? livePosition.estimatedDays 
    : Math.max(3, Math.ceil(currentRank / 15) * 7);
  const currentScore = livePosition.score > 0 ? livePosition.score : userWaitlistStatus.score;
  const currentStatus = livePosition.status || userWaitlistStatus.status;

  // 7-day claim window inspection
  const claimDetails = getClaimWindowDetails(
    userWaitlistStatus.admittedAt || (currentStatus === 'admitted' ? userWaitlistStatus.createdAt : undefined)
  );

  const handleCopyLink = () => {
    const url = `${window.location.origin}/waitlist?ref=${userWaitlistStatus.id.slice(0, 8)}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateSelfie = () => {
    boostWaitlistEntry(userWaitlistStatus.id, 'selfie');
    setSelfiePromptModal(false);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
  };

  const handleSimulateProfile = () => {
    boostWaitlistEntry(userWaitlistStatus.id, 'profile');
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0F3] dark:bg-rose-950/40 border border-[#F0E3E6] dark:border-rose-900/40 text-[#D80B42] dark:text-rose-300 text-xs font-semibold shadow-sm">
          <Clock className="w-3.5 h-3.5 text-[#F20D4E]" />
          <span>Real-time Waitlist Status</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#15182B] dark:text-white tracking-tight">
          {claimDetails.isAdmitted 
            ? (claimDetails.isExpired ? "Admission Window Expired" : "You Are Admitted!") 
            : `You are number #${currentRank}`}
        </h1>

        <p className="text-sm text-[#667085] dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          {claimDetails.isAdmitted && !claimDetails.isExpired ? (
            <span>Welcome to Koodal! Claim your spot within your <strong>7-day admission window</strong>.</span>
          ) : claimDetails.isExpired ? (
            <span>Your 7-day claim period has elapsed. Please rejoin the queue to be considered in next week's batch.</span>
          ) : (
            <span>
              In {userWaitlistStatus.city} &bull; {userWaitlistStatus.lane === 'men' ? 'Men\'s Lane' : 'Women & Others Lane'}.
              Estimated admission: <strong>~{estimatedDays} days</strong>.
            </span>
          )}
        </p>
      </div>

      {/* Admitted Active 7-Day Claim Window Banner */}
      {claimDetails.isAdmitted && !claimDetails.isExpired && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <PartyPopper className="w-5 h-5 text-emerald-200" />
            <span>Admission Spot Available</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold leading-snug">
            7-Day Claim Window Active
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Unclaimed spots automatically expire after 7 days to maintain balanced active ratios in {userWaitlistStatus.city}.
          </p>
          <div className="bg-black/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Time Left: <strong>{claimDetails.remainingDays}d {claimDetails.remainingHours}h</strong> (Deadline: {claimDetails.claimDeadline ? new Date(claimDetails.claimDeadline).toLocaleDateString() : '7 days'})</span>
            </div>
            <button
              onClick={() => navigateTo('/onboarding')}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Claim & Complete Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Claim Window Expired Warning */}
      {claimDetails.isExpired && (
        <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>7-Day Claim Window Lapsed</span>
          </div>
          <p className="text-xs leading-relaxed">
            Your admission spot in {userWaitlistStatus.city} has automatically expired per Section 13 rules to avoid dormant accounts. You can rejoin the waitlist anytime to enter the upcoming weekly admission batch.
          </p>
          <button
            onClick={() => navigateTo('/waitlist')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            Rejoin Waitlist
          </button>
        </div>
      )}

      {/* Main Status & Priority Score Card */}
      <div className="surface-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#F0E3E6] dark:border-slate-800 pb-4">
          <div>
            <p className="text-xs text-[#667085] uppercase tracking-wider font-semibold">Priority Score</p>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-black text-[#F20D4E]">
                {currentScore}
              </span>
              <span className="text-xs text-[#667085]">points</span>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              claimDetails.isExpired 
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 border-amber-200 dark:border-amber-800/40' 
                : claimDetails.isAdmitted 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#079669] border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-[#D80B42] border-rose-200 dark:border-rose-800/40'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{claimDetails.isExpired ? 'Expired' : claimDetails.isAdmitted ? 'Admitted!' : 'Active in Queue'}</span>
            </span>
            <p className="text-[11px] text-[#667085] mt-1">{userWaitlistStatus.email}</p>
          </div>
        </div>

        {/* Tasks to move up */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider">
              Move Up the Waitlist
            </h3>
            <span className="text-[11px] text-[#667085]">Honest merit scoring</span>
          </div>

          <div className="space-y-2.5">
            {/* 1. Email verified */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#079669] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#15182B] dark:text-white">Email Verified</p>
                  <p className="text-[11px] text-[#667085]">Required entry gate</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#079669]">Included</span>
            </div>

            {/* 2. Selfie submission */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              userWaitlistStatus.hasSelfieApproved
                ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {userWaitlistStatus.hasSelfieApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-[#079669] shrink-0" />
                ) : (
                  <Camera className="w-4 h-4 text-[#F20D4E] shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-[#15182B] dark:text-white">
                    Submit Photo Verification Selfie
                  </p>
                  <p className="text-[11px] text-[#667085]">Reviewed privately by human moderators (+30 pts)</p>
                </div>
              </div>

              {userWaitlistStatus.hasSelfieApproved ? (
                <span className="text-xs font-bold text-[#079669]">+30 Earned</span>
              ) : (
                <button
                  onClick={() => setSelfiePromptModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#F20D4E] hover:bg-[#D80B42] text-white text-xs font-semibold transition-colors"
                >
                  Verify Now
                </button>
              )}
            </div>

            {/* 3. Complete profile */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              userWaitlistStatus.hasProfileComplete
                ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {userWaitlistStatus.hasProfileComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-[#079669] shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-[#F20D4E] shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-[#15182B] dark:text-white">
                    Complete 3+ Photos & Bio Prompts
                  </p>
                  <p className="text-[11px] text-[#667085]">Ensures quality conversations (+20 pts)</p>
                </div>
              </div>

              {userWaitlistStatus.hasProfileComplete ? (
                <span className="text-xs font-bold text-[#079669]">+20 Earned</span>
              ) : (
                <button
                  onClick={handleSimulateProfile}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  Complete (+20)
                </button>
              )}
            </div>

            {/* 4. Launch City */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#079669] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#15182B] dark:text-white">
                    Located in {userWaitlistStatus.city}
                  </p>
                  <p className="text-[11px] text-[#667085]">Launch cluster density focus</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#079669]">+20 Earned</span>
            </div>

            {/* 5. Referrals */}
            <div className="p-3.5 rounded-xl border border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#15182B] dark:text-white">
                    Invite Friends (+10 pts per friend)
                  </p>
                  <p className="text-[11px] text-[#667085]">
                    {userWaitlistStatus.referralCount} verified friends joined &bull; points apply after friend's selfie is approved
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg border border-[#F0E3E6] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link' : 'Invite'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Explore / Info actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {claimDetails.isAdmitted && !claimDetails.isExpired ? (
            <button
              onClick={() => navigateTo('/onboarding')}
              className="w-full sm:flex-1 py-3 btn-primary-rose text-xs font-bold flex items-center justify-center gap-2 shadow-md"
            >
              <span>Proceed to Onboarding</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-[#667085] dark:text-slate-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#F20D4E] shrink-0" />
              <span>Admissions run weekly. We will email your admission invite when your batch is called.</span>
            </div>
          )}
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full sm:w-auto px-4 py-3 text-xs text-[#667085] hover:text-[#15182B] dark:hover:text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How Admissions Work</span>
          </button>
        </div>
      </div>

      {/* Rules Explainer Accordion */}
      {showRules && (
        <div className="surface-card p-6 space-y-4 border border-rose-200 dark:border-rose-900/40">
          <div className="flex items-center gap-2 text-xs font-bold text-[#D80B42] dark:text-rose-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Fairness & Two-Lane Queue Policy (Section 13)</span>
          </div>

          <div className="text-xs text-[#667085] dark:text-slate-300 space-y-2.5 leading-relaxed">
            <p>
              <strong>1. Why two lanes?</strong> On general dating apps, male users outnumber women 5:1, causing women to be overwhelmed with spam likes while men get zero matches. Koodal uses a two-lane queue to maintain a healthy <strong>1.0 to 1.5 ratio</strong> in every launch city.
            </p>
            <p>
              <strong>2. The Weekly Admission Formula:</strong> We admit eligible women and members of other genders first, then calculate men admissions as:
              <br />
              <code className="text-[#F20D4E] bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded font-mono text-[11px]">
                men admitted = max(0, 1.5 × active women - active men)
              </code>
            </p>
            <p>
              <strong>3. Never pay-to-skip:</strong> We never sell fast passes or skip-the-line tokens. Your position depends solely on profile completeness, photo verification, and honest community participation.
            </p>
          </div>
        </div>
      )}

      {/* Selfie Verification Simulator Modal */}
      {selfiePromptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[#F0E3E6] dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-[#F20D4E] flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
                Gesture Selfie Verification
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Hold up two fingers (peace sign) and take a quick selfie. Our admin team will verify it matches your photos within 24 hours.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] text-[#667085] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#079669] shrink-0" />
              <span>Selfies are strictly private and never shown on public profiles.</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelfiePromptModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateSelfie}
                className="flex-1 py-2.5 btn-primary-rose text-xs font-bold"
              >
                Submit Selfie (+30)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
