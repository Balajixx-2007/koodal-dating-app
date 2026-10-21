import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, AlertTriangle, Eye, Lock, MapPin, 
  HelpCircle, PhoneCall, CheckCircle2, UserCheck, Heart, 
  BadgeCheck 
} from 'lucide-react';

export const Safety: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2.5">
        <div className="w-13 h-13 rounded-2xl bg-[#ECFDF5] text-[#079669] flex items-center justify-center mx-auto border border-[#A7F3D0]">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#15182B] dark:text-white">
          Trust & Safety Guidelines
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          Safety is built directly into Koodal's core product architecture. Here is how we protect you and what you should know before meeting matches.
        </p>
      </div>

      {/* Safety Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="surface-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#079669] flex items-center justify-center border border-[#A7F3D0]">
            <BadgeCheck className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
            100% Hand-Reviewed Selfies
          </h3>
          <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
            Every verified badge on Koodal requires a member to submit a live selfie holding a specific gesture prompt. Real moderators compare this with profile photos to verify identity before granting the badge.
          </p>
        </div>

        <div className="surface-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF0F3] dark:bg-rose-950/40 text-[#DC2626] flex items-center justify-center border border-[#F8B4C4]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
            Scam & Romance-Fraud Shield
          </h3>
          <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
            Never send money, crypto, or transfer funds to someone you have not met in person. Be cautious of anyone urging you to immediately move conversation to external platforms.
          </p>
        </div>

        <div className="surface-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] dark:bg-amber-950/40 text-[#D97706] flex items-center justify-center border border-[#FDE68A]">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
            First In-Person Meeting Advice
          </h3>
          <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
            Always meet in a well-lit public space (a known cafe, bookstore, or restaurant in Chennai). Share your plans and live location with a trusted friend, and arrange your own transportation.
          </p>
        </div>

        <div className="surface-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] dark:bg-purple-950/40 text-[#7C3AED] flex items-center justify-center border border-[#DDD6FE]">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white">
            Approximate Location Privacy
          </h3>
          <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
            We never disclose your precise coordinates. Profiles only show general city/campus areas and approximate distance (e.g. ~3 km away) to protect your home and study environment.
          </p>
        </div>
      </div>

      {/* Enforcement Policy */}
      <div className="surface-card p-6 sm:p-8 space-y-4">
        <h3 className="font-heading font-bold text-base text-[#15182B] dark:text-white">
          Enforcement Policy: 3-Tier Moderation
        </h3>
        <p className="text-xs text-[#667085] dark:text-slate-400">
          Our team reviews 100% of member reports within 24 hours. Depending on the gravity of the infraction, we enforce:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700">
            <span className="text-xs font-bold text-[#D97706] block mb-1">1. Formal Warning</span>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              For minor etiquette or intent boundary confusion, a formal warning note is issued on login.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700">
            <span className="text-xs font-bold text-[#D80B42] block mb-1">2. 7-Day Suspension</span>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              Temporary suspension and removal from discovery for harassment or inappropriate messages.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-slate-800 border border-[#F0E3E6] dark:border-slate-700">
            <span className="text-xs font-bold text-[#DC2626] block mb-1">3. Permanent Ban</span>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              Zero-tolerance permanent device and email ban for underage accounts, hate speech, or financial scams.
            </p>
          </div>
        </div>
      </div>

      {/* Grievance Redressal (IT Act India compliance) */}
      <div className="p-6 rounded-3xl bg-[#11172B] text-white space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Grievance Redressal Officer (IT Rules, India)</span>
        </div>
        <h4 className="font-heading text-base font-bold">Have an urgent trust or safety concern?</h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          Pursuant to the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, our designated Grievance Officer is available for escalated legal or safety inquiries:
        </p>
        <div className="text-xs text-slate-300 bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
          <p><span className="text-slate-400 font-medium">Officer:</span> Balaji (Grievance Officer, Koodal Technologies)</p>
          <p><span className="text-slate-400 font-medium">Email:</span> grievance@koodal.dating / balaji@koodal.dating</p>
          <p><span className="text-slate-400 font-medium">Response SLA:</span> Acknowledgement within 24 hours, resolution within 15 days.</p>
        </div>
      </div>
    </div>
  );
};
