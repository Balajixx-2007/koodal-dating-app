import React from 'react';
import { useApp } from '../context/AppContext';
import { IntentBadge } from '../components/IntentBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Heart, ArrowRight, RefreshCw, WifiOff } from 'lucide-react';

export const Matches: React.FC = () => {
  const { t, matches, navigateTo, isLoadingMatches, matchesError, refreshMatches } = useApp();

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#15182B] dark:text-white">
            {t.nav_matches}
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Mutual connections who want what you want.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#FFF0F3] text-[#D80B42] dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold border border-[#F8B4C4]/60 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 fill-[#F20D4E] text-[#F20D4E] animate-romantic-heartbeat" />
          <span>{matches.length} Matches</span>
        </span>
      </div>

      {/* Offline / Error Banner */}
      {matchesError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{matchesError}</span>
          </div>
          <button
            onClick={() => refreshMatches()}
            className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-100 rounded-lg font-medium text-[11px] flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingMatches && matches.length === 0 ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="flex gap-3 overflow-hidden pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="w-12 h-3 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
          <div className="surface-card divide-y divide-[#F0E3E6] dark:divide-slate-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="w-40 h-3 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Mutual Connections Row */}
          {matches.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-[#D80B42] uppercase tracking-wider block">
                Mutual Connections
              </span>
              <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none">
                {matches.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => navigateTo(`/chat/${m.id}`)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F20D4E] rounded-2xl p-1"
                    aria-label={`Open conversation with ${m.matchedProfile.name}`}
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#F20D4E] to-[#D80B42] shadow-sm group-hover:scale-105 transition-transform duration-200">
                        <img 
                          src={m.matchedProfile.photos[0]} 
                          alt={m.matchedProfile.name} 
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                      {m.unreadCount && m.unreadCount > 0 ? (
                        <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#F20D4E] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                          {m.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs font-medium text-[#15182B] dark:text-slate-200 max-w-[64px] truncate">
                      {m.matchedProfile.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversations List */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider block">
              Recent Conversations
            </span>

            {matches.length > 0 ? (
              <div className="divide-y divide-[#F0E3E6] dark:divide-slate-800 surface-card overflow-hidden">
                {matches.map((match) => (
                  <button
                    type="button"
                    key={match.id}
                    onClick={() => navigateTo(`/chat/${match.id}`)}
                    className="w-full text-left p-4 flex items-center gap-3.5 hover:bg-[#FFF9F5] dark:hover:bg-slate-800/60 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F20D4E]"
                    aria-label={`Chat with ${match.matchedProfile.name}`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={match.matchedProfile.photos[0]}
                        alt={match.matchedProfile.name}
                        className="w-13 h-13 rounded-2xl object-cover border border-[#F0E3E6] shadow-xs"
                      />
                      <div className="absolute -bottom-1 -right-1">
                        <VerifiedBadge size="sm" showLabel={false} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-heading text-sm font-bold text-[#15182B] dark:text-white truncate">
                          {match.matchedProfile.name}
                        </h3>
                        <span className="text-[11px] text-[#98A2B3] font-medium shrink-0">
                          {match.lastMessageTime || 'New'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <IntentBadge intent={match.matchedProfile.intent} size="sm" />
                        <span className="text-[11px] text-[#667085] truncate">
                          &bull; {match.matchedProfile.city}
                        </span>
                      </div>

                      <p className="text-xs text-[#667085] dark:text-slate-400 truncate font-normal">
                        {match.lastMessage || 'Connected! Start talking.'}
                      </p>
                    </div>

                    {match.unreadCount && match.unreadCount > 0 ? (
                      <span className="w-5 h-5 rounded-full bg-[#F20D4E] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {match.unreadCount}
                      </span>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-[#98A2B3] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="surface-card p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] text-[#F20D4E] flex items-center justify-center mx-auto border border-[#F0E3E6]">
                  <Heart className="w-6 h-6 fill-[#F20D4E]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[#15182B] dark:text-white">
                    No mutual matches yet
                  </h3>
                  <p className="text-xs text-[#667085] mt-1 max-w-xs mx-auto leading-relaxed">
                    Keep exploring profiles in your city. When someone you connect with also chooses you, you will see your conversation here.
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('/discover')}
                  className="px-6 py-2.5 btn-primary-rose text-xs font-semibold"
                >
                  Start Discovering
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
