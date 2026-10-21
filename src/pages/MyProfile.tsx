import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RelationshipIntent } from '../types';
import { IntentBadge } from '../components/IntentBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { 
  BadgeCheck, Check, Edit2, MapPin, Heart 
} from 'lucide-react';

export const MyProfile: React.FC = () => {
  const { t, myProfile, updateMyProfile } = useApp();
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [name, setName] = useState(myProfile.name);
  const [bio, setBio] = useState(myProfile.bio);
  const [city, setCity] = useState(myProfile.city);
  const [intent, setIntent] = useState<RelationshipIntent>(myProfile.intent);
  const [occupation, setOccupation] = useState(myProfile.occupation || '');
  const [education, setEducation] = useState(myProfile.education || '');
  const [prompt1, setPrompt1] = useState(myProfile.prompts[0]?.answer || '');
  const [prompt2, setPrompt2] = useState(myProfile.prompts[1]?.answer || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMyProfile({
      name,
      bio,
      city,
      intent,
      occupation,
      education,
      prompts: [
        {
          id: 'p1',
          question: 'A non-negotiable for me in a relationship is...',
          answer: prompt1
        },
        {
          id: 'p2',
          question: 'My ideal Sunday in Chennai looks like...',
          answer: prompt2
        }
      ]
    });
    setEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const intents: RelationshipIntent[] = ['casual', 'long_term', 'marriage', 'friendship'];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#15182B] dark:text-white">
            {t.nav_profile}
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Your personal credentials, intent, and verified status.
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 rounded-xl btn-secondary-surface text-xs font-semibold flex items-center gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5 text-[#F20D4E]" />
          <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] rounded-2xl text-xs font-semibold flex items-center gap-2 animate-card-entrance shadow-xs">
          <Check className="w-4 h-4 text-[#079669]" />
          <span>Your profile updates have been saved successfully!</span>
        </div>
      )}

      {/* Main Profile View / Edit */}
      {!editing ? (
        <div className="surface-card overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Photos Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {myProfile.photos.map((url, idx) => (
              <div key={idx} className="aspect-[3/4] rounded-2xl overflow-hidden border border-[#F0E3E6] dark:border-slate-800 shadow-xs relative group">
                <img src={url} alt={`Profile photo ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-[#11172B]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Verification Status Card */}
          <div className="p-4 bg-[#ECFDF5] dark:bg-emerald-950/20 border border-[#A7F3D0] dark:border-emerald-900/40 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#079669] text-white flex items-center justify-center shadow-xs">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-[#065F46] dark:text-emerald-200 block">
                  Status: Hand-Verified Member
                </span>
                <span className="text-[11px] text-[#047857] dark:text-emerald-400 font-medium">
                  Selfie proof confirmed by admin team.
                </span>
              </div>
            </div>
            <VerifiedBadge size="sm" />
          </div>

          {/* Name & Stated Intent */}
          <div className="border-b border-[#F0E3E6] dark:border-slate-800 pb-5">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-2xl font-bold text-[#15182B] dark:text-white">
                {myProfile.name}, {myProfile.age}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#667085] mt-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#F20D4E]" />
              <span>{myProfile.city}</span>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-1.5">
                Your Stated Relationship Intent:
              </span>
              <IntentBadge intent={myProfile.intent} size="md" showDesc={true} />
            </div>
          </div>

          {/* Bio */}
          <div>
            <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-1">
              About Me
            </span>
            <p className="text-xs sm:text-sm text-[#15182B] dark:text-slate-200 leading-relaxed font-normal">
              {myProfile.bio}
            </p>
          </div>

          {/* Prompts */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider block">
              Your Prompts
            </span>
            {myProfile.prompts.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700">
                <span className="text-[11px] font-semibold text-[#D80B42] dark:text-rose-400 block mb-1">
                  {p.question}
                </span>
                <p className="text-xs text-[#15182B] dark:text-slate-200 italic font-medium">
                  "{p.answer}"
                </p>
              </div>
            ))}
          </div>

          {/* Interests */}
          <div>
            <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-2">
              Interests & Passions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {myProfile.interests.map((i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-[#FFF0F3] dark:bg-slate-800 text-[#D80B42] dark:text-rose-200 border border-[#F8B4C4]/50 dark:border-slate-700">
                  {i}
                </span>
              ))}
            </div>
          </div>

          {/* Relationship & Love Values */}
          <div>
            <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider block mb-2">
              Love Values & Dynamics
            </span>
            <div className="flex flex-wrap gap-2">
              {['Quality Time', 'Thoughtful Gestures', 'Deep Conversations', 'Sunset Beach Walks', 'Honest Intentions'].map((val) => (
                <span
                  key={val}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF0F3] dark:bg-rose-950/30 text-[#D80B42] dark:text-rose-300 border border-[#F8B4C4] inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Heart className="w-3 h-3 fill-[#F20D4E] text-[#F20D4E]" />
                  <span>{val}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode Form */
        <form onSubmit={handleSave} className="surface-card p-6 sm:p-8 space-y-5 animate-card-entrance">
          <div>
            <label className="block text-xs font-bold text-[#15182B] dark:text-slate-200 uppercase tracking-wider mb-2">
              Your Stated Relationship Intent
            </label>
            <div className="grid grid-cols-2 gap-2">
              {intents.map((iKey) => (
                <button
                  type="button"
                  key={iKey}
                  onClick={() => setIntent(iKey)}
                  className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                    intent === iKey
                      ? 'border-[#F20D4E] bg-[#FFF0F3] text-[#D80B42] shadow-xs ring-1 ring-[#F20D4E]'
                      : 'border-[#F0E3E6] text-[#667085] hover:border-[#F8B4C4]'
                  }`}
                >
                  <IntentBadge intent={iKey} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs p-3.5 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
              City / Campus Location
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs p-3.5 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full text-xs p-3.5 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                Occupation
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                Education
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
              Prompt 1: "A non-negotiable for me in a relationship is..."
            </label>
            <input
              type="text"
              value={prompt1}
              onChange={(e) => setPrompt1(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
              Prompt 2: "My ideal Sunday in Chennai looks like..."
            </label>
            <input
              type="text"
              value={prompt2}
              onChange={(e) => setPrompt2(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
            />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 py-3 px-4 rounded-xl btn-secondary-surface text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl btn-primary-rose text-xs font-semibold"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
