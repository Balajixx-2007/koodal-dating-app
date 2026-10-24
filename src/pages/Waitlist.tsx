import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RelationshipIntent } from '../types';
import { IntentBadge } from '../components/IntentBadge';
import { 
  Heart, ShieldCheck, Sparkles, ArrowRight, 
  MapPin, CheckCircle2, AlertCircle, Info, Lock 
} from 'lucide-react';

export const Waitlist: React.FC = () => {
  const { t, navigateTo, joinWaitlist, userWaitlistStatus } = useApp();

  const [email, setEmail] = useState('');
  const [city, setCity] = useState<'Chennai' | 'Bangalore' | 'Other'>('Chennai');
  const [customCity, setCustomCity] = useState('');
  const [gender, setGender] = useState<'woman' | 'man' | 'non_binary' | 'other'>('woman');
  const [intent, setIntent] = useState<RelationshipIntent>('long_term');
  const [referralCode, setReferralCode] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!ageConfirmed) {
      setError('You must confirm you are 18 years of age or older.');
      return;
    }

    const selectedCity = city === 'Other' ? (customCity.trim() || 'Other') : city;

    try {
      await joinWaitlist({
        email,
        city: selectedCity,
        gender,
        intent,
        referralCode: referralCode.trim() || undefined
      });
      navigateTo('/waitlist/status');
    } catch (err: any) {
      setError(err.message || 'Unable to join waitlist. Please try again.');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0F3] dark:bg-rose-950/40 border border-[#F0E3E6] dark:border-rose-900/40 text-[#D80B42] dark:text-rose-300 text-xs font-semibold shadow-sm">
          <Heart className="w-3.5 h-3.5 fill-[#F20D4E] text-[#F20D4E]" />
          <span>Intent-First &bull; Balanced Admissions</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#15182B] dark:text-white tracking-tight">
          Join the Koodal Waitlist
        </h1>

        <p className="text-sm text-[#667085] dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          We admit members in curated weekly batches to maintain healthy gender ratios, zero bots, and 100% verified intent.
        </p>
      </div>

      {/* If already on waitlist notice */}
      {userWaitlistStatus && (
        <div className="bg-[#FFF0F3] dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#D80B42] dark:text-rose-300">
              You already have an active waitlist entry ({userWaitlistStatus.email})
            </p>
            <p className="text-[11px] text-[#667085] dark:text-slate-300">
              Check your current queue position and complete tasks to move up.
            </p>
          </div>
          <button
            onClick={() => navigateTo('/waitlist/status')}
            className="px-3.5 py-1.5 rounded-xl bg-[#F20D4E] hover:bg-[#D80B42] text-white text-xs font-semibold whitespace-nowrap transition-colors"
          >
            View Status
          </button>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="surface-card p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#F20D4E]/30"
          />
          <p className="text-[11px] text-[#667085]">
            We will email your admission invitation code here. No spam, ever.
          </p>
        </div>

        {/* City selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#F20D4E]" />
            <span>Launch City</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Chennai', 'Bangalore', 'Other'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  city === c
                    ? 'border-[#F20D4E] bg-[#FFF0F3] dark:bg-rose-950/40 text-[#D80B42] dark:text-rose-300 font-bold'
                    : 'border-[#F0E3E6] dark:border-slate-800 text-[#667085] hover:border-slate-300'
                }`}
              >
                {c === 'Other' ? 'Other City' : `${c} (+20 pts)`}
              </button>
            ))}
          </div>

          {city === 'Other' && (
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="Enter your city name"
              className="w-full px-4 py-2.5 rounded-xl border border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#F20D4E]/30"
            />
          )}
        </div>

        {/* Gender identification */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider">
            How You Identify
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'woman', label: 'Woman' },
              { key: 'man', label: 'Man' },
              { key: 'non_binary', label: 'Non-Binary' },
              { key: 'other', label: 'Other' }
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGender(g.key as any)}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                  gender === g.key
                    ? 'border-[#F20D4E] bg-[#FFF0F3] dark:bg-rose-950/40 text-[#D80B42] dark:text-rose-300 font-bold'
                    : 'border-[#F0E3E6] dark:border-slate-800 text-[#667085] hover:border-slate-300'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#667085]">
            Used strictly to manage the two-lane queue and preserve healthy 1.0 - 1.5 ratio balance.
          </p>
        </div>

        {/* Relationship intent */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider">
            What Are You Looking For?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'casual', label: 'Casual Dating' },
              { key: 'long_term', label: 'Long-term Relationship' },
              { key: 'marriage', label: 'Marriage' },
              { key: 'friendship', label: 'Friendship & Circle' }
            ].map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => setIntent(it.key as RelationshipIntent)}
                className={`p-3 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-all ${
                  intent === it.key
                    ? 'border-[#F20D4E] bg-[#FFF0F3] dark:bg-rose-950/40 text-[#D80B42] dark:text-rose-300 font-bold shadow-sm'
                    : 'border-[#F0E3E6] dark:border-slate-800 text-[#667085] hover:border-slate-300'
                }`}
              >
                <span>{it.label}</span>
                <IntentBadge intent={it.key as RelationshipIntent} size="sm" />
              </button>
            ))}
          </div>
        </div>

        {/* Optional Referral Code */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#15182B] dark:text-white uppercase tracking-wider">
            Referral Code (Optional)
          </label>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="e.g. BALAJI-CH-2026"
            className="w-full px-4 py-2.5 rounded-xl border border-[#F0E3E6] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#F20D4E]/30"
          />
          <p className="text-[11px] text-[#667085]">
            Invitations from verified members give +10 points once confirmed.
          </p>
        </div>

        {/* 18+ Gate Confirmation */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-[#F0E3E6] text-[#F20D4E] focus:ring-[#F20D4E]"
            />
            <span className="text-xs text-[#15182B] dark:text-slate-300 leading-snug">
              I certify that I am <strong>18 years of age or older</strong> and agree to Koodal's{' '}
              <button
                type="button"
                onClick={() => navigateTo('/terms')}
                className="text-[#F20D4E] underline font-semibold"
              >
                Terms
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => navigateTo('/privacy')}
                className="text-[#F20D4E] underline font-semibold"
              >
                Privacy Policy
              </button>.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3.5 btn-primary-rose text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
        >
          <span>Claim Waitlist Spot</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#667085]">
          <Lock className="w-3.5 h-3.5 text-[#079669]" />
          <span>India DPDP Act 2023 compliant &bull; We never sell priority or data</span>
        </div>
      </form>
    </div>
  );
};
