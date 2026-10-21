import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { RelationshipIntent, Profile } from '../types';
import { IntentBadge } from '../components/IntentBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ReportBlockModal } from '../components/ReportBlockModal';
import { 
  Heart, X, Sparkles, MapPin, Briefcase, GraduationCap, 
  ChevronLeft, ChevronRight, ShieldAlert, Share2, 
  RotateCcw, Eye, ShieldCheck 
} from 'lucide-react';

export const Discover: React.FC = () => {
  const { 
    t, 
    discoverableProfiles, 
    likeProfile, 
    passProfile, 
    activeIntentFilter, 
    setActiveIntentFilter,
    navigateTo 
  } = useApp();

  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [reportingProfile, setReportingProfile] = useState<Profile | null>(null);
  const [actionState, setActionState] = useState<'like' | 'pass' | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const currentProfile = discoverableProfiles[0];

  const handleNextPhoto = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentProfile) return;
    setCurrentPhotoIdx(prev => (prev + 1) % currentProfile.photos.length);
  }, [currentProfile]);

  const handlePrevPhoto = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentProfile) return;
    setCurrentPhotoIdx(prev => (prev - 1 + currentProfile.photos.length) % currentProfile.photos.length);
  }, [currentProfile]);

  // Handle Like with tactile feedback and duplicate tap prevention
  const handleLike = useCallback(() => {
    if (!currentProfile || isLocked) return;
    setIsLocked(true);
    setActionState('like');

    setTimeout(() => {
      likeProfile(currentProfile);
      setCurrentPhotoIdx(0);
      setActionState(null);
      setIsLocked(false);
    }, 180);
  }, [currentProfile, isLocked, likeProfile]);

  // Handle Pass with smooth slide feedback and duplicate tap prevention
  const handlePass = useCallback(() => {
    if (!currentProfile || isLocked) return;
    setIsLocked(true);
    setActionState('pass');

    setTimeout(() => {
      passProfile(currentProfile.id);
      setCurrentPhotoIdx(0);
      setActionState(null);
      setIsLocked(false);
    }, 180);
  }, [currentProfile, isLocked, passProfile]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (reportingProfile) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleLike();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePass();
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLike, handlePass, handleNextPhoto, handlePrevPhoto, reportingProfile]);

  const intents: (RelationshipIntent | 'all')[] = ['all', 'casual', 'long_term', 'marriage', 'friendship'];

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {/* Intent Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter by relationship intent">
        {intents.map((intentKey) => {
          const isSelected = activeIntentFilter === intentKey;
          const label = intentKey === 'all' 
            ? 'All Intents' 
            : t[`intent_${intentKey}` as keyof typeof t];
          return (
            <button
              key={intentKey}
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveIntentFilter(intentKey);
                setCurrentPhotoIdx(0);
              }}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isSelected
                  ? 'bg-[#15182B] text-white border-[#15182B] shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-[#667085] dark:text-slate-300 border-[#F0E3E6] dark:border-slate-800 hover:border-[#F8B4C4] hover:text-[#15182B]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {currentProfile ? (
        <div 
          className={`surface-card overflow-hidden transition-all duration-200 flex flex-col relative ${
            actionState === 'like' 
              ? 'scale-[0.98] ring-2 ring-[#F20D4E]/40' 
              : actionState === 'pass' 
              ? '-translate-x-4 opacity-50' 
              : 'animate-card-entrance'
          }`}
        >
          {/* Romantic Floating Heart Particle Burst on Like */}
          {actionState === 'like' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
              <div className="relative">
                <Heart className="w-16 h-16 fill-[#F20D4E] text-[#F20D4E] animate-float-heart drop-shadow-xl" />
                <Heart className="w-10 h-10 fill-[#FF4D79] text-[#FF4D79] animate-float-heart drop-shadow-md absolute -left-8 -top-6" style={{ animationDelay: '120ms' }} />
                <Heart className="w-12 h-12 fill-[#D80B42] text-[#D80B42] animate-float-heart drop-shadow-md absolute -right-8 -top-10" style={{ animationDelay: '220ms' }} />
              </div>
            </div>
          )}

          {/* Main Photo Container */}
          <div className="relative aspect-[3/4] bg-slate-950 select-none overflow-hidden group">
            <img 
              src={currentProfile.photos[currentPhotoIdx] || currentProfile.photos[0]} 
              alt={currentProfile.name}
              className="w-full h-full object-cover transition-opacity duration-200"
            />

            {/* Photo indicators */}
            {currentProfile.photos.length > 1 && (
              <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-20" aria-label={`Photo ${currentPhotoIdx + 1} of ${currentProfile.photos.length}`}>
                {currentProfile.photos.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1 flex-1 rounded-full transition-all duration-200 ${
                      idx === currentPhotoIdx ? 'bg-white shadow-sm' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Intent Badge top left */}
            <div className="absolute top-5 left-3.5 z-20">
              <IntentBadge intent={currentProfile.intent} size="sm" />
            </div>

            {/* Verified badge & Report button top right */}
            <div className="absolute top-5 right-3.5 z-20 flex items-center gap-1.5">
              {currentProfile.verificationStatus === 'verified' && (
                <VerifiedBadge size="sm" showLabel={false} />
              )}
              <button
                onClick={() => setReportingProfile(currentProfile)}
                className="w-8 h-8 rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white/90 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                title="Report or Block Profile"
                aria-label="Report or Block Profile"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Tap Arrows */}
            {currentProfile.photos.length > 1 && (
              <>
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Controlled Vignette for Text Contrast */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none"></div>

            {/* Name, Age, Location Overlay */}
            <div className="absolute bottom-4 left-4 right-4 text-white z-10 pointer-events-none">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-2xl font-bold tracking-tight drop-shadow-sm">
                  {currentProfile.name}, {currentProfile.age}
                </h3>
                {currentProfile.verificationStatus === 'verified' && (
                  <span title="Hand-Verified Member">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#F20D4E]" />
                  <span>{currentProfile.city}</span>
                </span>
                <span>&bull;</span>
                <span>~{currentProfile.distanceKm} km away</span>
              </div>
            </div>

            {/* Like Feedback Animation Burst */}
            {actionState === 'like' && (
              <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center z-30 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-[#F20D4E] text-white flex items-center justify-center shadow-lg animate-heart-pulse">
                  <Heart className="w-8 h-8 fill-white text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Profile Metadata & Prompts */}
          <div className="p-5 space-y-4">
            {/* Bio */}
            <div>
              <p className="text-xs sm:text-sm text-[#15182B] dark:text-slate-200 leading-relaxed font-normal">
                {currentProfile.bio}
              </p>
            </div>

            {/* Work & Education */}
            {(currentProfile.occupation || currentProfile.education) && (
              <div className="flex flex-wrap gap-3 text-xs text-[#667085] dark:text-slate-400 pt-2 border-t border-[#F0E3E6] dark:border-slate-800">
                {currentProfile.occupation && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#98A2B3]" />
                    <span>{currentProfile.occupation}</span>
                  </div>
                )}
                {currentProfile.education && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#98A2B3]" />
                    <span>{currentProfile.education}</span>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Prompts */}
            {currentProfile.prompts && currentProfile.prompts.length > 0 && (
              <div className="space-y-2 pt-1">
                {currentProfile.prompts.map((p) => (
                  <div 
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700"
                  >
                    <span className="text-[10px] font-bold text-[#D80B42] dark:text-rose-400 uppercase tracking-wider block mb-1">
                      {p.question}
                    </span>
                    <p className="text-xs text-[#15182B] dark:text-slate-200 font-medium">
                      "{p.answer}"
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Interests Chips */}
            <div>
              <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-2">
                Passions & Interests
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentProfile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFF0F3] dark:bg-slate-800 text-[#D80B42] dark:text-rose-300 border border-[#F8B4C4]/50 dark:border-slate-700"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* View Full Profile link */}
            <div className="pt-1 text-center">
              <button
                onClick={() => navigateTo(`/profile/${currentProfile.id}`)}
                className="text-xs font-semibold text-[#D80B42] hover:text-[#B80936] dark:text-rose-400 transition-colors inline-flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Profile & Verification Details</span>
              </button>
            </div>
          </div>

          {/* Action Bar: Pass & Connect (Like) */}
          <div className="p-4 bg-[#FFF9F5] dark:bg-slate-900 border-t border-[#F0E3E6] dark:border-slate-800 flex items-center justify-center gap-6">
            <button
              onClick={handlePass}
              disabled={isLocked}
              className="w-13 h-13 rounded-full bg-white dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700 text-[#667085] hover:text-[#15182B] hover:border-slate-300 dark:hover:text-white flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              title={`Pass ${currentProfile.name}`}
              aria-label={`Pass ${currentProfile.name}`}
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>

            <button
              onClick={handleLike}
              disabled={isLocked}
              className="w-15 h-15 rounded-full bg-gradient-to-tr from-[#F20D4E] to-[#D80B42] hover:from-[#E00C48] hover:to-[#C40A3C] text-white flex items-center justify-center shadow-md shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 group"
              title={`Connect with ${currentProfile.name}`}
              aria-label={`Connect with ${currentProfile.name}`}
            >
              <Heart className="w-7 h-7 fill-white text-white drop-shadow-sm group-hover:animate-romantic-heartbeat" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="surface-card p-8 text-center space-y-5 animate-card-entrance">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] text-[#F20D4E] flex items-center justify-center mx-auto border border-[#F0E3E6]">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">
              {t.no_more_profiles}
            </h3>
            <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              We never populate feeds with bots or inactive accounts. As new verified members join in Chennai and campus clusters, they will appear here.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700 text-left space-y-2">
            <span className="text-xs font-semibold text-[#15182B] dark:text-slate-200 block">
              Share Koodal with campus peers & friends:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="https://koodal.dating/invite/chennai"
                className="text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-[#F0E3E6] dark:border-slate-700 text-[#667085] dark:text-slate-400 flex-1 font-mono"
              />
              <button
                onClick={() => alert('Invite link copied to clipboard!')}
                className="px-3.5 py-2 btn-primary-rose text-xs font-semibold flex items-center gap-1 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveIntentFilter('all');
            }}
            className="py-2 px-4 rounded-xl btn-secondary-surface text-xs flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters to All Intents</span>
          </button>
        </div>
      )}

      {reportingProfile && (
        <ReportBlockModal
          targetProfile={reportingProfile}
          onClose={() => setReportingProfile(null)}
        />
      )}
    </div>
  );
};
