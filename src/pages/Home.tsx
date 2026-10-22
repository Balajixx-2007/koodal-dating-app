import React from 'react';
import { useApp } from '../context/AppContext';
import { RelationshipIntent } from '../types';
import { IntentBadge } from '../components/IntentBadge';
import { 
  Heart, ShieldCheck, Sparkles, MessageSquare, 
  ArrowRight, Users, CheckCircle2, Lock, Flame, 
  HeartHandshake, Crown, MapPin, CheckSquare, 
  HelpCircle, Shield, Mail, Scale 
} from 'lucide-react';

export const Home: React.FC = () => {
  const { t, navigateTo, setActiveIntentFilter } = useApp();

  const intents: { key: RelationshipIntent; icon: React.ElementType }[] = [
    { key: 'casual', icon: Flame },
    { key: 'long_term', icon: HeartHandshake },
    { key: 'marriage', icon: Crown },
    { key: 'friendship', icon: Users },
  ];

  return (
    <div className="space-y-16 pb-12 relative overflow-hidden">
      {/* Restrained Ambient Blush Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-[#FFF0F3] to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Hero Section */}
      <section className="pt-10 sm:pt-16 pb-4 px-4 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0F3] dark:bg-rose-950/40 border border-[#F0E3E6] dark:border-rose-900/40 text-[#D80B42] dark:text-rose-300 text-xs font-semibold shadow-sm">
          <Heart className="w-3.5 h-3.5 fill-[#F20D4E] text-[#F20D4E]" />
          <span>Chennai & Campus Communities &bull; Adults 18+ Only</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#15182B] dark:text-white tracking-tight leading-[1.12]">
          Meet people who <br />
          <span className="text-brand-accent">
            want what you want.
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-[#667085] dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          {t.hero_subtitle}
        </p>

        {/* Primary and Secondary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
          <button
            onClick={() => navigateTo('/waitlist')}
            className="w-full sm:w-auto px-8 py-3.5 btn-primary-rose text-base flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Join Launch Waitlist</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo('/discover')}
            className="w-full sm:w-auto px-7 py-3.5 btn-secondary-surface text-sm flex items-center justify-center gap-2"
          >
            <span>Explore Demo Profiles</span>
          </button>
          <button
            onClick={() => navigateTo('/waitlist/status')}
            className="w-full sm:w-auto px-4 py-3.5 text-xs text-[#667085] hover:text-[#15182B] dark:hover:text-white font-semibold transition-colors"
          >
            Check Queue Status
          </button>
        </div>

        {/* Audited Trust Indicators & Platform Commitments */}
        <div className="pt-8 max-w-3xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="surface-card p-4">
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#15182B] dark:text-white block">100%</span>
              <span className="text-xs text-[#667085] font-medium">Hand-Reviewed Selfies</span>
            </div>
            <div className="surface-card p-4">
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#F20D4E] block">4 Lanes</span>
              <span className="text-xs text-[#667085] font-medium">Clear Relationship Intents</span>
            </div>
            <div className="surface-card p-4">
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#079669] block">&lt; 24h</span>
              <span className="text-xs text-[#667085] font-medium">Moderator Report SLA</span>
            </div>
            <div className="surface-card p-4">
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#11172B] dark:text-slate-200 block">18+</span>
              <span className="text-xs text-[#667085] font-medium">Strict Age Gate Verified</span>
            </div>
          </div>
          <p className="text-[11px] text-[#98A2B3] mt-2.5 text-center">
            Operational standards & verified pilot commitments for Chennai launch community.
          </p>
        </div>
      </section>

      {/* 4 Relationship Intents Showcase */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D80B42]">
            Clear Intentions Upfront
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#15182B] dark:text-white mt-1">
            Choose your lane. Connect without mixed signals.
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-400 mt-1.5">
            Chosen at sign-up, editable anytime in your profile, and prominently visible on every connection.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {intents.map(({ key, icon: IconComponent }) => (
            <div 
              key={key}
              onClick={() => {
                setActiveIntentFilter(key);
                navigateTo('/discover');
              }}
              className="surface-card p-5 hover:border-[#F8B4C4] dark:hover:border-rose-900 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <IntentBadge intent={key} size="sm" />
                  <IconComponent className="w-4 h-4 text-[#667085] group-hover:text-[#F20D4E] transition-colors" />
                </div>
                <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white mb-1.5">
                  {t[`intent_${key}` as keyof typeof t]}
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-300 leading-relaxed font-normal">
                  {t[`intent_${key}_desc` as keyof typeof t]}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#F0E3E6] dark:border-slate-800 flex items-center justify-between text-xs text-[#98A2B3]">
                <span className="font-medium group-hover:text-[#F20D4E] transition-colors">Browse profiles</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Koodal — Balanced Feature Grid */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="surface-card p-6 sm:p-10">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D80B42]">
              Why Koodal
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#15182B] dark:text-white tracking-tight mt-1">
              Engineered for genuine connection & emotional safety
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-400 mt-1.5">
              Traditional dating apps mix conflicting expectations in one feed. Koodal aligns your intentions before you say hello.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FFF0F3] text-[#F20D4E] flex items-center justify-center shrink-0 border border-[#F0E3E6]">
                <Heart className="w-5 h-5 fill-[#F20D4E]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white mb-1">
                  {t.pillar_intent_title}
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
                  {t.pillar_intent_desc}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#079669] flex items-center justify-center shrink-0 border border-[#A7F3D0]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white mb-1">
                  {t.pillar_verified_title}
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
                  {t.pillar_verified_desc}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white mb-1">
                  {t.pillar_prompts_title}
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
                  {t.pillar_prompts_desc}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0 border border-[#DDD6FE]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white mb-1">
                  {t.pillar_safety_title}
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
                  {t.pillar_safety_desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Spirit of Koodal — Intentional Romantic Connection in Chennai */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="surface-card p-6 sm:p-8 border border-[#F8B4C4]/60 bg-gradient-to-br from-[#FFF9F5] via-white to-[#FFF0F3] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden love-ambient-glow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 text-left">
              <span className="text-[11px] font-bold text-[#D80B42] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-[#F20D4E] text-[#F20D4E] animate-romantic-heartbeat" />
                <span>The Spirit of Koodal</span>
              </span>
              <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-[#15182B] dark:text-white">
                "கூடல்" — Where genuine hearts meet with honesty.
              </h3>
              <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-300 max-w-xl leading-relaxed">
                In classical Tamil poetry, <em>Koodal</em> celebrates the joyous coming together of souls. We bring that ancient warmth to modern dating — replacing mindless swiping with heartfelt, intent-aligned connections across Chennai's vibrant community.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Besant Nagar Beach Walks 🌅', 'Mylapore Filter Coffee ☕', 'Higginbothams Book Dates 📚', 'ECR Coastal Drives 🚗'].map((chip, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-800 text-[#D80B42] dark:text-rose-300 border border-[#F8B4C4] shadow-2xs">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => navigateTo('/signup')}
                className="px-6 py-3.5 btn-primary-rose text-sm font-semibold flex items-center gap-2 shadow-md"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Find Someone Special</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & DPDP Privacy Framework Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-[#11172B] text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>DPDP Act 2023 Principles &bull; Transparent Data Governance</span>
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-bold">Your privacy and boundaries come first.</h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Approximate location privacy, hand-verified verification selfies, zero automated third-party ad sharing, and one-tap complete account data purging.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigateTo('/safety')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              Safety Guidelines
            </button>
            <button
              onClick={() => navigateTo('/privacy')}
              className="px-4 py-2.5 rounded-xl bg-[#F20D4E] hover:bg-[#D80B42] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Privacy & Grievance
            </button>
          </div>
        </div>
      </section>

      {/* Polished Product Footer & Trust Section */}
      <footer className="max-w-5xl mx-auto px-4 pt-12 border-t border-[#F0E3E6] dark:border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#F20D4E] flex items-center justify-center text-white">
                <Heart className="w-3.5 h-3.5 fill-white text-white" />
              </div>
              <span className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
                Koodal (கூடல்)
              </span>
            </div>
            <p className="text-[#667085] leading-relaxed">
              Intent-first relationship platform for adults aged 18 and older. Built for genuine compatibility.
            </p>
            <span className="text-[11px] text-[#98A2B3] block">
              Pilot region: Chennai & Campuses
            </span>
          </div>

          <div>
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#15182B] dark:text-white mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-[#667085] dark:text-slate-400">
              <li>
                <button onClick={() => navigateTo('/discover')} className="hover:text-[#F20D4E] transition-colors">
                  Discover Feed
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/matches')} className="hover:text-[#F20D4E] transition-colors">
                  Mutual Matches
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/safety')} className="hover:text-[#F20D4E] transition-colors">
                  Safety Center
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/me')} className="hover:text-[#F20D4E] transition-colors">
                  Member Profile
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#15182B] dark:text-white mb-3">
              Safety & Governance
            </h4>
            <ul className="space-y-2 text-[#667085] dark:text-slate-400">
              <li>
                <button onClick={() => navigateTo('/guidelines')} className="hover:text-[#F20D4E] transition-colors">
                  Community Standards
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/safety')} className="hover:text-[#F20D4E] transition-colors">
                  Romance Scam Prevention
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/settings')} className="hover:text-[#F20D4E] transition-colors">
                  DPDP Data Rights & Erasure
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/admin/reports')} className="hover:text-[#F20D4E] transition-colors">
                  Moderator Console
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#15182B] dark:text-white mb-3">
              Legal & Grievance
            </h4>
            <ul className="space-y-2 text-[#667085] dark:text-slate-400">
              <li>
                <button onClick={() => navigateTo('/terms')} className="hover:text-[#F20D4E] transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/privacy')} className="hover:text-[#F20D4E] transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('/privacy')} className="hover:text-[#F20D4E] transition-colors">
                  Grievance Officer: grievance@koodal.dating
                </button>
              </li>
              <li className="text-[11px] text-[#98A2B3] pt-1">
                Response SLA: 24 to 48 hours
              </li>
            </ul>
          </div>
        </div>

        <div className="py-6 border-t border-[#F0E3E6] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#98A2B3]">
          <p>&copy; {new Date().getFullYear()} Koodal Dating. All rights reserved. Strictly 18+.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigateTo('/terms')} className="hover:text-[#667085]">Terms</button>
            <button onClick={() => navigateTo('/privacy')} className="hover:text-[#667085]">Privacy</button>
            <button onClick={() => navigateTo('/guidelines')} className="hover:text-[#667085]">Guidelines</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
