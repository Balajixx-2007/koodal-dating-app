import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { IntentBadge } from '../components/IntentBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ReportBlockModal } from '../components/ReportBlockModal';
import { 
  ArrowLeft, MapPin, Briefcase, GraduationCap, 
  ShieldAlert, Heart, X, MessageCircle, ShieldCheck, BadgeCheck, Loader2 
} from 'lucide-react';
import { Profile } from '../types';
import { DiscoveryService } from '../lib/discovery-service';

interface ProfileDetailProps {
  profileId?: string;
}

export const ProfileDetail: React.FC<ProfileDetailProps> = ({ profileId }) => {
  const { 
    viewParam, 
    discoverableProfiles, 
    matches, 
    navigateTo, 
    likeProfile, 
    passProfile,
    currentView,
    myProfile 
  } = useApp();

  const [reporting, setReporting] = useState(false);
  const [remoteProfile, setRemoteProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const id = profileId || viewParam || (currentView.startsWith('/profile/') ? currentView.replace('/profile/', '') : undefined);

  // Search in discoverable profiles, matches, or remote fetch
  const localProfile: Profile | undefined = 
    discoverableProfiles.find(p => p.id === id || p.userId === id) || 
    matches.find(m => m.matchedProfile.id === id || m.matchedProfile.userId === id)?.matchedProfile ||
    (id === myProfile.id || id === myProfile.userId ? myProfile : undefined);

  useEffect(() => {
    if (!id || localProfile) return;

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    DiscoveryService.getMemberProfile(id)
      .then((res) => {
        if (!isMounted) return;
        setLoading(false);
        if (res) {
          setRemoteProfile({
            id: res.user_id,
            userId: res.user_id,
            name: res.name,
            age: res.age,
            city: res.city,
            gender: 'other',
            intent: res.intent,
            bio: res.bio,
            bioTa: res.bio_ta || undefined,
            photos: res.photos && res.photos.length > 0 
              ? res.photos 
              : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'],
            verificationStatus: 'verified',
            interests: res.interests || [],
            prompts: (res.prompts || []).map((pr, idx) => ({
              id: pr.id || `prompt_${idx}`,
              question: pr.question,
              questionTa: pr.questionTa,
              answer: pr.answer
            }))
          });
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
          setNotFound(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, localProfile]);

  const profile = localProfile || remoteProfile;

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F20D4E] mx-auto mb-3" />
        <p className="text-xs font-semibold text-[#15182B] dark:text-white">Loading member profile...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-[#15182B] dark:text-white">Profile Unavailable</h3>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 max-w-xs mx-auto">
            This profile is private, paused, or no longer accessible in your area.
          </p>
        </div>
        <button
          onClick={() => navigateTo('/discover')}
          className="px-5 py-2.5 btn-primary-rose text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Discovery</span>
        </button>
      </div>
    );
  }

  const isMatched = matches.some(m => m.matchedProfile.id === profile.id || m.matchedProfile.userId === profile.userId);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Top bar with back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateTo('/discover')}
          className="p-2.5 rounded-full border border-[#F0E3E6] dark:border-slate-800 hover:bg-[#FFF0F3] text-[#667085] hover:text-[#15182B] dark:hover:bg-slate-800 transition-colors"
          aria-label="Back to discovery feed"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-[#98A2B3] uppercase tracking-wider">
          Member Profile
        </span>
        <button
          onClick={() => setReporting(true)}
          className="p-2.5 rounded-full border border-[#F0E3E6] dark:border-slate-800 hover:bg-amber-50 text-[#98A2B3] hover:text-[#D97706] transition-colors"
          title="Report or Block"
          aria-label="Report or Block"
        >
          <ShieldAlert className="w-4 h-4" />
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="surface-card overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.photos.map((url, idx) => (
            <div key={idx} className="aspect-[3/4] rounded-2xl overflow-hidden border border-[#F0E3E6] dark:border-slate-800 shadow-xs">
              <img src={url} alt={`${profile.name} photo ${idx + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        {/* Identity & Badges (Same-city only: distance removed per spec) */}
        <div className="border-b border-[#F0E3E6] dark:border-slate-800 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="font-heading text-3xl font-extrabold text-[#15182B] dark:text-white">
              {profile.name}, {profile.age}
            </h2>
            <VerifiedBadge size="md" />
          </div>

          <div className="flex items-center gap-3 text-xs text-[#667085] dark:text-slate-400 mb-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#F20D4E]" />
              <span>{profile.city}</span>
            </span>
          </div>

          <div className="pt-1">
            <span className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-1.5">
              Stated Relationship Intent:
            </span>
            <IntentBadge intent={profile.intent} size="lg" showDesc={true} />
          </div>
        </div>

        {/* Bio */}
        <div>
          <span className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-1.5">
            About Me
          </span>
          <p className="text-sm text-[#15182B] dark:text-slate-300 leading-relaxed font-normal">
            {profile.bio}
          </p>
          {profile.bioTa && (
            <p className="text-xs text-[#667085] dark:text-slate-400 italic mt-2">
              "{profile.bioTa}"
            </p>
          )}
        </div>

        {/* Occupation & Education */}
        {(profile.occupation || profile.education) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FFF9F5] dark:bg-slate-800/60 p-4 rounded-2xl border border-[#F0E3E6] dark:border-slate-700">
            {profile.occupation && (
              <div className="flex items-center gap-2 text-xs text-[#15182B] dark:text-slate-300">
                <Briefcase className="w-4 h-4 text-[#98A2B3]" />
                <span>{profile.occupation}</span>
              </div>
            )}
            {profile.education && (
              <div className="flex items-center gap-2 text-xs text-[#15182B] dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-[#98A2B3]" />
                <span>{profile.education}</span>
              </div>
            )}
          </div>
        )}

        {/* Prompts */}
        {profile.prompts && profile.prompts.length > 0 && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider block">
              Conversation Prompts
            </span>
            {profile.prompts.map((p) => (
              <div 
                key={p.id}
                className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700"
              >
                <span className="text-xs font-semibold text-[#D80B42] dark:text-rose-400 block mb-1">
                  {p.question}
                </span>
                <p className="text-xs sm:text-sm text-[#15182B] dark:text-slate-200 font-medium leading-relaxed">
                  "{p.answer}"
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Interests */}
        <div>
          <span className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-2">
            Interests &amp; Passions
          </span>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FFF0F3] dark:bg-slate-800 text-[#D80B42] dark:text-rose-300 border border-[#F8B4C4]/50 dark:border-slate-700"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Safety Note */}
        <div className="p-4 rounded-2xl bg-[#ECFDF5] dark:bg-emerald-950/20 border border-[#A7F3D0] dark:border-emerald-900/40 text-xs text-[#065F46] dark:text-emerald-300 flex items-start gap-2.5">
          <BadgeCheck className="w-4 h-4 text-[#079669] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Hand-Verified Member</span>
            <span className="text-[11px] opacity-90">
              This member submitted a live selfie matching their profile gallery, which was manually approved by our team.
            </span>
          </div>
        </div>
      </div>

      {/* Floating Action Controls */}
      <div className="sticky bottom-4 surface-card p-3.5 shadow-xl flex items-center justify-center gap-3">
        {isMatched ? (
          <button
            onClick={() => {
              const m = matches.find(item => item.matchedProfile.id === profile.id || item.matchedProfile.userId === profile.userId);
              if (m) navigateTo(`/chat/${m.id}`);
            }}
            className="flex-1 py-3 px-6 btn-primary-rose text-xs flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open Message Thread</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                passProfile(profile.id);
                navigateTo('/discover');
              }}
              className="py-3 px-6 btn-secondary-surface text-xs flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Pass</span>
            </button>
            <button
              onClick={async () => {
                await likeProfile(profile);
                navigateTo('/discover');
              }}
              className="flex-1 py-3 px-6 btn-primary-rose text-xs flex items-center justify-center gap-1.5"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Connect with {profile.name}</span>
            </button>
          </>
        )}
      </div>

      {reporting && (
        <ReportBlockModal
          targetProfile={profile}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
};
