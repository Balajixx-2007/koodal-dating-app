import React from 'react';
import { useApp } from '../context/AppContext';
import { IntentBadge } from './IntentBadge';
import { Sparkles, MessageCircle, ArrowRight, Heart } from 'lucide-react';

export const MatchModal: React.FC = () => {
  const { matchMoment, setMatchMoment, myProfile, navigateTo, matches } = useApp();

  // Accessible escape key to dismiss
  React.useEffect(() => {
    if (!matchMoment) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMatchMoment(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [matchMoment, setMatchMoment]);

  if (!matchMoment) return null;

  const matchObj = matches.find(m => m.matchedProfile.id === matchMoment.id) || matches[0];

  const suggestedPrompt = matchMoment.prompts?.[0]?.answer 
    ? `I loved your take on "${matchMoment.prompts[0].question}"! ${matchMoment.prompts[0].answer}`
    : `Hi ${matchMoment.name}! We both want ${matchMoment.intent.replace('_', ' ')}. Excited to connect!`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11172B]/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
    >
      <div className="surface-card max-w-md w-full p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden love-ambient-glow">
        {/* Floating Romantic Hearts Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Heart className="w-8 h-8 fill-rose-200/40 text-rose-300/40 absolute bottom-4 left-6 animate-float-heart" style={{ animationDelay: '200ms' }} />
          <Heart className="w-6 h-6 fill-rose-300/30 text-rose-400/30 absolute bottom-6 right-8 animate-float-heart" style={{ animationDelay: '700ms' }} />
          <Heart className="w-10 h-10 fill-rose-200/30 text-rose-300/30 absolute bottom-2 left-1/2 -translate-x-1/2 animate-float-heart" style={{ animationDelay: '1200ms' }} />
        </div>

        {/* Subtle Brand Accent Accentuation with Heartbeat */}
        <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] text-[#F20D4E] flex items-center justify-center mx-auto mb-4 border border-[#F0E3E6] shadow-sm animate-romantic-heartbeat relative z-10">
          <Heart className="w-7 h-7 fill-[#F20D4E] text-[#F20D4E]" />
        </div>

        <div className="space-y-1 mb-4 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D80B42]">
            Mutual Connection
          </span>
          <h2 id="match-modal-title" className="font-heading text-2xl sm:text-3xl font-extrabold text-[#15182B] dark:text-white tracking-tight">
            It's a Match!
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-300">
            You and <span className="font-semibold text-[#15182B] dark:text-white">{matchMoment.name}</span> both want:
          </p>
        </div>

        <div className="flex justify-center mb-5">
          <IntentBadge intent={matchMoment.intent} size="md" />
        </div>

        {/* Dual Interlocking Photos */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="relative group">
            <img 
              src={myProfile.photos[0]} 
              alt={myProfile.name}
              className="w-22 h-26 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md rotate-[-5deg]"
            />
            <span className="absolute bottom-1 right-1 bg-white/95 dark:bg-slate-800 text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-xs">
              You
            </span>
          </div>

          <div className="w-9 h-9 rounded-full bg-[#F20D4E] text-white flex items-center justify-center z-10 shadow-md -mx-3">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>

          <div className="relative group">
            <img 
              src={matchMoment.photos[0]} 
              alt={matchMoment.name}
              className="w-22 h-26 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md rotate-[5deg]"
            />
            <span className="absolute bottom-1 right-1 bg-white/95 dark:bg-slate-800 text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-xs">
              {matchMoment.name.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Icebreaker Prompt Box */}
        <div className="bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700 rounded-2xl p-4 mb-5 text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#D80B42] dark:text-rose-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Suggested Icebreaker:</span>
          </div>
          <p className="text-xs text-[#15182B] dark:text-slate-200 italic font-medium leading-relaxed">
            "{suggestedPrompt}"
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setMatchMoment(null);
              navigateTo(`/chat/${matchObj.id}`);
            }}
            className="w-full py-3 px-4 btn-primary-rose text-sm flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Say Hello with Icebreaker</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMatchMoment(null)}
            className="w-full py-2.5 px-4 rounded-xl text-[#667085] hover:text-[#15182B] dark:hover:text-slate-200 text-xs font-semibold transition-colors"
          >
            Keep Browsing
          </button>
        </div>
      </div>
    </div>
  );
};
