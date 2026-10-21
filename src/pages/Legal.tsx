import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, FileText, Lock, Users } from 'lucide-react';

interface LegalProps {
  initialTab?: 'terms' | 'privacy' | 'guidelines';
}

export const Legal: React.FC<LegalProps> = ({ initialTab = 'terms' }) => {
  const { currentView } = useApp();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'guidelines'>(() => {
    if (currentView === '/privacy') return 'privacy';
    if (currentView === '/guidelines') return 'guidelines';
    return 'terms';
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#15182B] dark:text-white">
          Legal & Compliance Framework
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Compliant with the Digital Personal Data Protection (DPDP) Act, 2023 and the Information Technology Act, 2000 (India).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#F0E3E6] dark:border-slate-800 text-xs font-semibold gap-6" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'terms'}
          onClick={() => setActiveTab('terms')}
          className={`pb-3 flex items-center gap-1.5 transition-all border-b-2 ${
            activeTab === 'terms'
              ? 'border-[#F20D4E] text-[#F20D4E] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Terms of Service</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'privacy'}
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 flex items-center gap-1.5 transition-all border-b-2 ${
            activeTab === 'privacy'
              ? 'border-[#F20D4E] text-[#F20D4E] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Privacy Policy (DPDP 2023)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'guidelines'}
          onClick={() => setActiveTab('guidelines')}
          className={`pb-3 flex items-center gap-1.5 transition-all border-b-2 ${
            activeTab === 'guidelines'
              ? 'border-[#F20D4E] text-[#F20D4E] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#15182B] dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Community Guidelines</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="surface-card p-6 sm:p-8 text-xs text-[#15182B] dark:text-slate-300 leading-relaxed space-y-6">
        {activeTab === 'terms' && (
          <div className="space-y-4">
            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              1. Eligibility & 18+ Age Gate
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              By accessing Koodal ("the Service"), you warrant and represent that you are at least 18 years of age. Under-18 usage is strictly prohibited. If we receive a report or suspect that an account belongs to a minor, the account will be immediately terminated, and its verification data purged.
            </p>

            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              2. Stated Relationship Intent
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              Koodal operates as an intent-first connection platform. Members must represent their intent honestly (Casual Dating, Long-term Relationship, Marriage, or Friendship). Repeatedly misleading other members or using benign intent tags as a pretense for solicitation or unwanted sexual advances constitutes a material breach of these Terms.
            </p>

            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              3. Verification & Identity Policy
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              Verification selfies submitted for the "Verified Member" badge are collected solely to corroborate identity. Creating accounts on behalf of other individuals, impersonating real persons, or using synthetic AI-generated avatars is cause for permanent suspension.
            </p>

            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              4. Code of Conduct & Intermediary Status
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              In accordance with Rule 3(1)(b) of the IT Rules, 2021, users are prohibited from hosting, displaying, or sharing content that is defamatory, obscene, harassing, promoting money laundering, or violating applicable Indian laws.
            </p>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#ECFDF5] text-[#065F46] rounded-xl border border-[#A7F3D0] font-medium">
              Notice: Our privacy practices strictly adhere to the Digital Personal Data Protection Act, 2023 (DPDP Act).
            </div>

            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              1. Data We Collect and Why (Purpose Limitation)
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              We only collect data necessary to facilitate intent-compatible connections:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#667085] dark:text-slate-300">
              <li><strong>Profile Information:</strong> Name, age, gender, intent, city, interests, and profile photos.</li>
              <li><strong>Sensitive Biometric / Selfie Data:</strong> Verification selfies are stored in segregated private object storage, reviewed exclusively by authorized moderators, and deleted once the badge status is settled.</li>
              <li><strong>Approximate Location:</strong> We do not track or expose GPS coordinates. Profiles reflect only declared city/campus cluster and approximate distance.</li>
            </ul>

            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              2. Your Right to Erasure & Account Deletion
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              Under Section 12 of the DPDP Act, you have the absolute right to demand the erasure of your personal data. When you initiate account deletion from Settings, your photos, chat history, mutual matches, and verification artifacts are permanently wiped from production databases.
            </p>

            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              3. Grievance Officer Contact
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              For privacy requests, breach notifications, or consent withdrawal, contact: <br />
              <strong>Balaji</strong>, Grievance Officer, Koodal Technologies, Chennai, India. <br />
              Email: <code className="bg-[#FFF9F5] px-1 py-0.5 rounded border border-[#F0E3E6] text-[#D80B42]">grievance@koodal.dating</code>
            </p>
          </div>
        )}

        {activeTab === 'guidelines' && (
          <div className="space-y-4">
            <h2 className="font-heading text-base font-bold text-[#15182B] dark:text-white">
              Our Promise: Mutual Kindness & Clear Intentions
            </h2>
            <p className="text-[#667085] dark:text-slate-300">
              Koodal was founded to eliminate the cynicism and game-playing of modern dating apps. We hold our community to high standards of warmth, honesty, and respect.
            </p>

            <div className="space-y-2">
              <h3 className="font-bold text-[#15182B] dark:text-white">Zero Tolerance Violations:</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[#667085] dark:text-slate-300">
                <li><strong>Harassment & Threats:</strong> Unsolicited explicit imagery, stalking, or abusive speech will lead to instant termination.</li>
                <li><strong>Financial Scams & Solicitations:</strong> Any requests for money, investment schemes, or commercial services will result in immediate ban and report to cyber authorities.</li>
                <li><strong>Underage Accounts:</strong> Accounts found to be created by or depicting persons under 18 will be permanently blocked.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
