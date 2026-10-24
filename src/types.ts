export type RelationshipIntent = 
  | 'casual' 
  | 'long_term' 
  | 'marriage' 
  | 'friendship';

export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'banned';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  email: string;
  role: 'member' | 'admin';
  status: UserStatus;
  createdAt: string;
  verifiedAt?: string;
}

export interface ProfilePrompt {
  id: string;
  question: string;
  questionTa?: string;
  answer: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  age: number;
  birthDate?: string;
  gender: 'woman' | 'man' | 'non_binary' | 'other';
  intent: RelationshipIntent;
  bio: string;
  bioTa?: string;
  city: string;
  distanceKm?: number;
  photos: string[];
  selfieUrl?: string;
  verificationStatus: VerificationStatus;
  interests: string[];
  prompts: ProfilePrompt[];
  occupation?: string;
  education?: string;
  isPaused?: boolean;
}

export interface Preferences {
  userId: string;
  interestedIn: ('woman' | 'man' | 'non_binary' | 'everyone')[];
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  intentFilter: RelationshipIntent[];
}

export interface Like {
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

export interface Match {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
  matchedProfile: Profile;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  sentAt: string;
  readAt?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetName: string;
  targetPhoto: string;
  reason: 'inappropriate_content' | 'fake_profile' | 'underage' | 'harassment' | 'scam' | 'intent_mismatch' | 'other';
  details: string;
  status: 'pending' | 'reviewed_warned' | 'reviewed_suspended' | 'reviewed_banned' | 'dismissed';
  createdAt: string;
  reviewedBy?: string;
}

export interface SelfieVerification {
  id: string;
  userId: string;
  userName: string;
  profilePhoto: string;
  selfieUrl: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
}

export interface PhotoModerationItem {
  id: string;
  userId: string;
  userName: string;
  photoUrl: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface WaitlistEntry {
  id: string;
  email: string;
  city: 'Chennai' | 'Bangalore' | string;
  gender: 'woman' | 'man' | 'non_binary' | 'other';
  intent: RelationshipIntent;
  lane: 'women_and_others' | 'men';
  score: number;
  status: 'waiting' | 'admitted' | 'expired';
  referredBy?: string;
  referralCount: number;
  hasSelfieApproved: boolean;
  hasProfileComplete: boolean;
  daysOnList: number;
  createdAt: string;
  admittedAt?: string;
}

export interface AdmissionBatch {
  id: string;
  city: string;
  date: string;
  womenAdmitted: number;
  menAdmitted: number;
  ratioBefore: number;
  ratioAfter: number;
}

