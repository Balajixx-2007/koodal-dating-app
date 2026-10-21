import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { IntentBadge } from '../components/IntentBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ReportBlockModal } from '../components/ReportBlockModal';
import { 
  ArrowLeft, MapPin, Briefcase, GraduationCap, 
  ShieldAlert, Heart, X, MessageCircle, ShieldCheck, BadgeCheck 
} from 'lucide-react';
import { Profile } from '../types';

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

  const id = profileId || viewParam || (currentView.startsWith('/profile/') ? currentView.replace('/profile/', '') : undefined);

  // Search in discoverable profiles or matches
  const profile: Profile | undefined = 
    discoverableProfiles.find(p => p.id === id) || 
    matches.find(m => m.matchedProfile.id === id)?.matchedProfile ||
    (id === myProfile.id ? myProfile : discoverableProfiles[0]);

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-sm text-[#667085]">Profile not found.</p>
        <button
          onClick={() => navigateTo('/discover')}
          className="mt-4 px-4 py-2 btn-primary-rose text-xs"
        >
          Return to Discovery
        </button>
      </div>
    );
  }

  const isMatched = matches.some(m => m.matchedProfile.id === profile.id);

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
            <div key={idx} className="aspect-[3/4] rounded-2xl overflow-hidden border border-[#F0E3E6] shadow-xs">
              <img src={url} alt={`${profile.name} photo ${idx + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        {/* Identity & Badges */}
        <div className="border-b border-[#F0E3E6] dark:border-slate-800 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="font-heading text-3xl font-extrabold text-[#15182B] dark:text-white">
              {profile.name}, {profile.age}
            </h2>
            <VerifiedBadge size="md" />
          </div>

          <div className="flex items-center gap-3 text-xs text-[#667085] mb-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#F20D4E]" />
              <span>{profile.city}</span>
            </span>
            <span>&bull;</span>
            <span>~{profile.distanceKm} km away (approximate)</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FFF9F5] dark:bg-slate-800/60 p-4 rounded-2xl border border-[#F0E3E6] dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-[#15182B] dark:text-slate-300">
            <Briefcase className="w-4 h-4 text-[#98A2B3]" />
            <span>{profile.occupation || 'Professional'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#15182B] dark:text-slate-300">
            <GraduationCap className="w-4 h-4 text-[#98A2B3]" />
            <span>{profile.education || 'University Graduate'}</span>
          </div>
        </div>

        {/* Prompts */}
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

        {/* Interests */}
        <div>
          <span className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-2">
            Interests & Passions
          </span>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FFF0F3] dark:bg-slate-800 text-[#D80B42] dark:text-rose-300 border border-[#F8B4C4]/50"
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
              const m = matches.find(item => item.matchedProfile.id === profile.id);
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
              onClick={() => {
                likeProfile(profile);
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
