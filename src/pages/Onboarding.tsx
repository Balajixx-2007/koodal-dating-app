import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RelationshipIntent } from '../types';
import { IntentBadge } from '../components/IntentBadge';
import { 
  Camera, ArrowRight, ArrowLeft, 
  Check, Upload, MapPin, BadgeCheck 
} from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { t, myProfile, updateMyProfile, navigateTo } = useApp();
  const [step, setStep] = useState(1);

  // Form states
  const [intent, setIntent] = useState<RelationshipIntent>(myProfile.intent);
  const [name, setName] = useState(myProfile.name);
  const [birthDate, setBirthDate] = useState(myProfile.birthDate || '2002-04-12');
  const [gender, setGender] = useState(myProfile.gender);
  const [city, setCity] = useState(myProfile.city);
  const [bio, setBio] = useState(myProfile.bio);
  const [photos] = useState<string[]>(myProfile.photos);
  const [selfieUrl, setSelfieUrl] = useState<string>(myProfile.selfieUrl || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(myProfile.interests);
  const [promptAnswer1, setPromptAnswer1] = useState(myProfile.prompts[0]?.answer || '');
  const [promptAnswer2, setPromptAnswer2] = useState(myProfile.prompts[1]?.answer || '');
  const [selfieTaken, setSelfieTaken] = useState(!!myProfile.selfieUrl);

  const availableInterests = [
    'Filter Coffee', 'Coastal Walks', 'Carnatic Music', 'Indie Rock',
    'Tamil Cinema', 'Pottery', 'Trekking', 'Reading & Books',
    'Tech & Startups', 'Badminton', 'Street Food', 'Theatre & Arts',
    'Architecture', 'Board Games', 'Yoga & Wellness'
  ];

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Save all profile data
      updateMyProfile({
        name,
        birthDate,
        gender: gender as any,
        intent,
        city,
        bio,
        photos,
        selfieUrl,
        interests: selectedInterests,
        prompts: [
          {
            id: 'p1',
            question: 'A non-negotiable for me in a relationship is...',
            questionTa: 'எனது உறவில் சமரசம் செய்ய முடியாத ஒன்று...',
            answer: promptAnswer1 || 'Clear honest communication.'
          },
          {
            id: 'p2',
            question: 'My ideal Sunday in Chennai looks like...',
            questionTa: 'சென்னையில் எனது கனவு ஞாயிறு இப்படி இருக்கும்...',
            answer: promptAnswer2 || 'Filter coffee by the beach.'
          }
        ],
        verificationStatus: selfieUrl ? 'pending' : 'unverified'
      });
      navigateTo('/discover');
    }
  };

  const handleInterestToggle = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      if (selectedInterests.length < 6) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const handleMockSelfie = () => {
    // Simulate real webcam/selfie capture with trusted test avatar
    const sampleSelfie = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
    setSelfieUrl(sampleSelfie);
    setSelfieTaken(true);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-[#667085] mb-2">
          <span>Step {step} of 5</span>
          <span>{Math.round((step / 5) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-[#F0E3E6] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-[#F20D4E] h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="surface-card p-6 sm:p-8">
        {/* Step 1: Relationship Intent */}
        {step === 1 && (
          <div className="space-y-6 animate-card-entrance">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D80B42]">
                Core Philosophy
              </span>
              <h2 className="font-heading text-2xl font-bold text-[#15182B] dark:text-white mt-1">
                {t.onboarding_step_intent}
              </h2>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
                {t.onboarding_step_intent_sub}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(['casual', 'long_term', 'marriage', 'friendship'] as RelationshipIntent[]).map((iKey) => (
                <div
                  key={iKey}
                  onClick={() => setIntent(iKey)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    intent === iKey
                      ? 'border-[#F20D4E] bg-[#FFF0F3] shadow-xs ring-1 ring-[#F20D4E]'
                      : 'border-[#F0E3E6] dark:border-slate-800 hover:border-[#F8B4C4]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <IntentBadge intent={iKey} size="md" />
                    {intent === iKey && (
                      <div className="w-5 h-5 rounded-full bg-[#F20D4E] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#667085] dark:text-slate-400 mt-2">
                    {t[`intent_${iKey}_desc` as keyof typeof t]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="space-y-5 animate-card-entrance">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#15182B] dark:text-white">
                {t.onboarding_step_basic}
              </h2>
              <p className="text-xs text-[#667085] mt-1">
                Tell potential matches who you are.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                {t.name_label}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Balaji K."
                className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                  {t.birthdate_label}
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                  {t.gender_label}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
                >
                  <option value="man">Man</option>
                  <option value="woman">Woman</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Prefer to self-describe</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                {t.city_label}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Chennai (Besant Nagar) or IIT Madras Campus"
                  className="w-full text-xs pl-9 pr-3 py-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1">
                {t.bio_label}
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What makes you feel alive? Hobbies, passions, weekend rituals..."
                className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
              />
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div className="space-y-5 animate-card-entrance">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#15182B] dark:text-white">
                {t.onboarding_step_photos}
              </h2>
              <p className="text-xs text-[#667085] mt-1">
                Add clear photos. In-browser optimization keeps your data lightweight and private.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {photos.map((url, idx) => (
                <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[#F0E3E6] shadow-xs group">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 bg-[#11172B]/85 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Cover
                    </span>
                  )}
                </div>
              ))}
              {photos.length < 4 && (
                <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#F0E3E6] dark:border-slate-700 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-[#F8B4C4]">
                  <Upload className="w-5 h-5 text-[#98A2B3] mb-1" />
                  <span className="text-[11px] font-medium text-[#667085]">Add Photo</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#FFF9F5] dark:bg-slate-800 rounded-xl text-xs text-[#667085] flex items-start gap-2 border border-[#F0E3E6]">
              <BadgeCheck className="w-4 h-4 text-[#079669] shrink-0 mt-0.5" />
              <span>
                All new profile photos undergo human moderation to safeguard the community against explicit or inappropriate imagery.
              </span>
            </div>
          </div>
        )}

        {/* Step 4: Selfie Verification */}
        {step === 4 && (
          <div className="space-y-6 animate-card-entrance">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-xs font-semibold mb-2">
                <BadgeCheck className="w-4 h-4 text-[#079669]" />
                <span>Zero Catfish Guarantee</span>
              </div>
              <h2 className="font-heading text-2xl font-bold text-[#15182B] dark:text-white">
                {t.onboarding_step_selfie}
              </h2>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
                To earn the Verified Member shield, take a quick selfie matching the pose below. Our moderation team reviews this by hand within 24 hours.
              </p>
            </div>

            <div className="p-6 bg-[#FFF9F5] dark:bg-slate-800/60 rounded-3xl border border-[#F0E3E6] dark:border-slate-700 text-center">
              <div className="w-32 h-32 rounded-3xl mx-auto overflow-hidden border-2 border-emerald-500 shadow-xs mb-4 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                {selfieUrl ? (
                  <img src={selfieUrl} alt="Selfie proof" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div className="max-w-xs mx-auto mb-4">
                <p className="text-xs font-semibold text-[#15182B] dark:text-slate-200">
                  Pose Prompt: Two-finger gesture verification next to your chin
                </p>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  This proves your photo is live and matches your profile gallery.
                </p>
              </div>

              {!selfieTaken ? (
                <button
                  type="button"
                  onClick={handleMockSelfie}
                  className="px-5 py-2.5 rounded-xl bg-[#079669] hover:bg-[#065F46] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Verification Selfie</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#065F46] bg-[#ECFDF5] px-3 py-1.5 rounded-full border border-[#A7F3D0]">
                  <Check className="w-4 h-4 text-[#079669]" />
                  <span>Selfie Captured & Ready for Admin Review</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#98A2B3]">
              * In compliance with DPDP 2023, verification selfies are stored in private encrypted storage and never shown to other members.
            </p>
          </div>
        )}

        {/* Step 5: Interests & Prompts */}
        {step === 5 && (
          <div className="space-y-6 animate-card-entrance">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#15182B] dark:text-white">
                {t.onboarding_step_prompts}
              </h2>
              <p className="text-xs text-[#667085] mt-1">
                Conversation starters eliminate blank chat boxes and awkward "heys".
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-2">
                {t.interests_label} ({selectedInterests.length}/6 selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      type="button"
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isSelected
                          ? 'border-[#F20D4E] bg-[#FFF0F3] text-[#D80B42] shadow-xs'
                          : 'border-[#F0E3E6] dark:border-slate-700 text-[#667085] dark:text-slate-300 hover:border-[#F8B4C4]'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#15182B] dark:text-white mb-1">
                  Prompt 1: "A non-negotiable for me in a relationship is..."
                </label>
                <input
                  type="text"
                  value={promptAnswer1}
                  onChange={(e) => setPromptAnswer1(e.target.value)}
                  placeholder="e.g. Honest communication and deep Sunday chats..."
                  className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#15182B] dark:text-white mb-1">
                  Prompt 2: "My ideal Sunday in Chennai looks like..."
                </label>
                <input
                  type="text"
                  value={promptAnswer2}
                  onChange={(e) => setPromptAnswer2(e.target.value)}
                  placeholder="e.g. Filter coffee at Ratna Cafe followed by a quiet beach walk..."
                  className="w-full text-xs p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[#F0E3E6] dark:border-slate-800 mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="py-2.5 px-4 rounded-xl btn-secondary-surface text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="py-2.5 px-6 btn-primary-rose text-xs font-semibold flex items-center gap-2"
          >
            <span>{step === 5 ? 'Finish & Start Matching' : 'Continue'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
