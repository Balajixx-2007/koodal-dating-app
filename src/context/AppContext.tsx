import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, Profile, RelationshipIntent, Match, Message, Report, 
  SelfieVerification, PhotoModerationItem, WaitlistEntry, AdmissionBatch 
} from '../types';
import { 
  INITIAL_USER, INITIAL_MY_PROFILE, SEED_PROFILES, 
  INITIAL_MATCHES, INITIAL_MESSAGES, INITIAL_REPORTS, 
  INITIAL_SELFIES, INITIAL_PHOTOS_MODERATION,
  INITIAL_WAITLIST_ENTRIES, INITIAL_BATCHES
} from '../mockData';
import { Language, translations } from '../translations';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { resolveUserRole } from '../lib/auth-service';
import { DiscoveryService } from '../lib/discovery-service';
import { ChatService, FetchMessagesOptions } from '../lib/chat-service';
import { ModerationService } from '../lib/moderation-service';
import { WaitlistService } from '../lib/waitlist-service';
import { ProfileService } from '../lib/profile-service';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
  
  // Navigation & Role
  currentView: string;
  navigateTo: (view: string, param?: string) => void;
  viewParam?: string;
  activeRole: 'member' | 'admin' | 'visitor';
  setActiveRole: (role: 'member' | 'admin' | 'visitor') => void;
  
  // User & Profile
  currentUser: User | null;
  myProfile: Profile;
  updateMyProfile: (updated: Partial<Profile>) => Promise<void> | void;
  deleteAccount: () => Promise<void> | void;
  
  // Discovery & Matching
  discoverableProfiles: Profile[];
  isLoadingDiscovery: boolean;
  discoveryError: string | null;
  refreshDiscovery: () => Promise<void>;
  likeLimitNotice: boolean;
  clearLikeLimitNotice: () => void;
  activeIntentFilter: RelationshipIntent | 'all';
  setActiveIntentFilter: (filter: RelationshipIntent | 'all') => void;
  likeProfile: (profile: Profile) => Promise<void>;
  passProfile: (profileId: string) => void;
  matchMoment: Profile | null;
  setMatchMoment: (profile: Profile | null) => void;
  
  // Matches & Chat
  matches: Match[];
  messages: Record<string, Message[]>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  sendMessage: (matchId: string, body: string) => Promise<boolean> | void;
  retrySendMessage: (matchId: string, failedMessageId: string) => Promise<boolean>;
  isLoadingMatches: boolean;
  matchesError: string | null;
  refreshMatches: () => Promise<void>;
  fetchMessagesForMatch: (matchId: string, options?: FetchMessagesOptions) => Promise<{ success: boolean; hasMore?: boolean }>;
  markMatchAsRead: (matchId: string) => Promise<void>;
  
  // Safety & Moderation
  blockedUsers: string[];
  blockUser: (userId: string) => Promise<void> | void;
  reports: Report[];
  submitReport: (targetId: string, targetName: string, targetPhoto: string, reason: Report['reason'], details: string) => Promise<void> | void;
  
  // Admin queues
  selfieVerifications: SelfieVerification[];
  photoModerations: PhotoModerationItem[];
  allUsers: User[];
  reviewReport: (reportId: string, action: 'warn' | 'suspend' | 'ban' | 'dismiss') => Promise<void> | void;
  reviewSelfie: (selfieId: string, approved: boolean) => Promise<void> | void;
  reviewPhoto: (photoId: string, approved: boolean) => Promise<void> | void;
  toggleUserBan: (userId: string) => Promise<void> | void;

  // Waitlist & Ratio Control
  waitlistEntries: WaitlistEntry[];
  admissionBatches: AdmissionBatch[];
  userWaitlistStatus: WaitlistEntry | null;
  joinWaitlist: (data: { email: string; city: string; gender: 'woman' | 'man' | 'non_binary' | 'other'; intent: RelationshipIntent; referralCode?: string }) => Promise<WaitlistEntry> | WaitlistEntry;
  boostWaitlistEntry: (entryId: string, task: 'selfie' | 'profile' | 'referral') => void;
  runBatchAdmission: (city: string, womenToAdmit: number, menToAdmit: number) => Promise<{ womenAdmitted: number; menAdmitted: number; newRatio: number }> | { womenAdmitted: number; menAdmitted: number; newRatio: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('koodal_lang') as Language) || 'en';
  });

  const getInitialView = () => {
    if (typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== '') {
      return window.location.pathname;
    }
    return '/';
  };

  const getInitialParam = () => {
    if (typeof window !== 'undefined' && window.location.pathname) {
      const parts = window.location.pathname.split('/');
      if (parts[1] === 'chat' || parts[1] === 'profile') {
        return parts[2];
      }
    }
    return undefined;
  };

  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [viewParam, setViewParam] = useState<string | undefined>(getInitialParam);
  const [activeRole, setActiveRole] = useState<'member' | 'admin' | 'visitor'>('member');

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentView(path);
      const parts = path.split('/');
      if (parts[1] === 'chat' || parts[1] === 'profile') {
        setViewParam(parts[2]);
      } else {
        setViewParam(undefined);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const userId = session.user.id;
          const serverRole = await resolveUserRole(userId);
          setActiveRole(serverRole);
          setCurrentUser({
            id: userId,
            email: session.user.email || '',
            role: serverRole,
            status: 'active',
            createdAt: session.user.created_at || new Date().toISOString()
          });

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (profile && isMounted) {
            setMyProfile(prev => ({
              ...prev,
              userId: profile.user_id,
              name: profile.name,
              birthDate: profile.birth_date,
              gender: profile.gender,
              intent: profile.intent,
              city: profile.city,
              bio: profile.bio,
              interests: profile.interests || [],
              prompts: (profile.prompts as any) || [],
              isPaused: profile.is_paused
            }));
          }
        }
      } catch {
        // Fallback for tests or unauthenticated session
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        const userId = session.user.id;
        const serverRole = await resolveUserRole(userId);
        setActiveRole(serverRole);
        setCurrentUser({
          id: userId,
          email: session.user.email || '',
          role: serverRole,
          status: 'active',
          createdAt: session.user.created_at || new Date().toISOString()
        });

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile && isMounted) {
          setMyProfile(prev => ({
            ...prev,
            userId: profile.user_id,
            name: profile.name,
            birthDate: profile.birth_date,
            gender: profile.gender,
            intent: profile.intent,
            city: profile.city,
            bio: profile.bio,
            interests: profile.interests || [],
            prompts: (profile.prompts as any) || [],
            isPaused: profile.is_paused
          }));
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setActiveRole('visitor');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USER);
  const [myProfile, setMyProfile] = useState<Profile>(() => {
    const saved = localStorage.getItem('koodal_my_profile');
    return saved ? JSON.parse(saved) : INITIAL_MY_PROFILE;
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('koodal_profiles');
    return saved ? JSON.parse(saved) : SEED_PROFILES;
  });

  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [activeIntentFilter, setActiveIntentFilter] = useState<RelationshipIntent | 'all'>('all');
  const [matchMoment, setMatchMoment] = useState<Profile | null>(null);

  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [likeLimitNotice, setLikeLimitNotice] = useState(false);
  const clearLikeLimitNotice = () => setLikeLimitNotice(false);

  const refreshDiscovery = useCallback(async () => {
    setIsLoadingDiscovery(true);
    setDiscoveryError(null);
    try {
      const result = await DiscoveryService.fetchFeed();
      if (!result.success) {
        if (result.offline) {
          setDiscoveryError('You are offline. Showing cached discovery candidates.');
        } else {
          setDiscoveryError(result.error || 'Failed to refresh discovery feed.');
        }
        setIsLoadingDiscovery(false);
        return;
      }

      if (result.profiles.length > 0) {
        const mapped: Profile[] = result.profiles.map(p => ({
          id: p.user_id,
          userId: p.user_id,
          name: p.name,
          age: p.age,
          city: p.city,
          gender: 'other',
          intent: p.intent,
          bio: p.bio,
          bioTa: p.bio_ta || undefined,
          photos: p.photos.length > 0 ? p.photos : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'],
          verificationStatus: 'verified',
          interests: p.interests,
          prompts: (p.prompts || []).map((pr, idx) => ({
            id: pr.id || `prompt_${idx}`,
            question: pr.question,
            questionTa: pr.questionTa,
            answer: pr.answer
          }))
        }));
        setProfiles(mapped);
      }
    } catch (err: any) {
      setDiscoveryError(err.message || 'Error loading discovery candidates.');
    } finally {
      setIsLoadingDiscovery(false);
    }
  }, []);

  useEffect(() => {
    refreshDiscovery();
  }, [refreshDiscovery]);

  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('koodal_matches');
    return saved ? JSON.parse(saved) : INITIAL_MATCHES;
  });

  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const formatMessageTime = (dateStr: string | null): string => {
    if (!dateStr) return 'New';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const refreshMatches = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingMatches(true);
    setMatchesError(null);
    try {
      const res = await ChatService.fetchMatchesList();
      if (res.success) {
        const mappedMatches: Match[] = res.matches.map(m => ({
          id: m.match_id,
          userA: currentUser.id,
          userB: m.matched_user_id,
          createdAt: m.last_message_sent_at || new Date().toISOString(),
          matchedProfile: {
            id: m.matched_user_id,
            userId: m.matched_user_id,
            name: m.name,
            age: m.age,
            city: m.city,
            gender: 'other',
            intent: m.intent,
            bio: '',
            photos: m.avatar_url ? [m.avatar_url] : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'],
            verificationStatus: 'verified',
            interests: [],
            prompts: []
          },
          lastMessage: m.last_message_body || 'Connected! Start talking.',
          lastMessageTime: formatMessageTime(m.last_message_sent_at),
          unreadCount: m.unread_count || 0
        }));
        setMatches(mappedMatches);
      } else {
        if (res.offline) {
          setMatchesError('You are offline. Showing cached matches.');
        } else {
          setMatchesError(res.error || 'Failed to load matches.');
        }
      }
    } catch (err: any) {
      setMatchesError(err.message || 'Error loading matches.');
    } finally {
      setIsLoadingMatches(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      refreshMatches();
    }
  }, [currentUser?.id, refreshMatches]);

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('koodal_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const fetchMessagesForMatch = useCallback(async (matchId: string, options?: FetchMessagesOptions) => {
    if (!matchId) return { success: false, hasMore: false };
    const res = await ChatService.fetchMessages(matchId, undefined, options);
    if (res.success) {
      const mapped: Message[] = res.messages.map(m => ({
        id: m.id,
        matchId: m.match_id,
        senderId: m.sender_id,
        body: m.body,
        sentAt: m.sent_at,
        readAt: m.read_at || undefined,
        status: 'sent'
      }));
      setMessages(prev => {
        const existing = prev[matchId] || [];
        if (options?.offset && options.offset > 0) {
          const existingIds = new Set(existing.map(m => m.id));
          const newOlder = mapped.filter(m => !existingIds.has(m.id));
          return {
            ...prev,
            [matchId]: [...newOlder, ...existing]
          };
        } else {
          const idMap = new Map<string, Message>();
          mapped.forEach(m => idMap.set(m.id, m));
          existing.forEach(m => {
            if (m.status === 'sending' || m.status === 'failed') {
              idMap.set(m.id, m);
            } else if (!idMap.has(m.id)) {
              idMap.set(m.id, m);
            }
          });
          const sorted = Array.from(idMap.values()).sort(
            (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          );
          return {
            ...prev,
            [matchId]: sorted
          };
        }
      });
      return { success: true, hasMore: res.hasMore };
    }
    return { success: false, hasMore: false };
  }, []);

  const markMatchAsRead = useCallback(async (matchId: string) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, unreadCount: 0 } : m));
    if (currentUser?.id) {
      await ChatService.markMessagesRead(matchId);
    }
  }, [currentUser?.id]);

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('koodal_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [selfieVerifications, setSelfieVerifications] = useState<SelfieVerification[]>(() => {
    const saved = localStorage.getItem('koodal_selfies');
    return saved ? JSON.parse(saved) : INITIAL_SELFIES;
  });

  const [photoModerations, setPhotoModerations] = useState<PhotoModerationItem[]>(() => {
    const saved = localStorage.getItem('koodal_photos');
    return saved ? JSON.parse(saved) : INITIAL_PHOTOS_MODERATION;
  });

  const [allUsers, setAllUsers] = useState<User[]>([
    INITIAL_USER,
    { id: 'usr_01', email: 'ananya.r@example.com', role: 'member', status: 'active', createdAt: '2026-09-01T00:00:00Z', verifiedAt: '2026-09-02T00:00:00Z' },
    { id: 'usr_02', email: 'karthik.s@example.com', role: 'member', status: 'active', createdAt: '2026-09-03T00:00:00Z', verifiedAt: '2026-09-04T00:00:00Z' },
    { id: 'usr_03', email: 'pooja.v@example.com', role: 'member', status: 'active', createdAt: '2026-09-05T00:00:00Z', verifiedAt: '2026-09-06T00:00:00Z' },
    { id: 'usr_04', email: 'naveen.k@example.com', role: 'member', status: 'active', createdAt: '2026-09-07T00:00:00Z', verifiedAt: '2026-09-08T00:00:00Z' },
    { id: 'usr_05', email: 'divya.s@example.com', role: 'member', status: 'active', createdAt: '2026-09-09T00:00:00Z', verifiedAt: '2026-09-10T00:00:00Z' },
    { id: 'usr_suspect_99', email: 'vijay.trade@shady.com', role: 'member', status: 'suspended', createdAt: '2026-10-18T00:00:00Z' }
  ]);

  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>(() => {
    const saved = localStorage.getItem('koodal_waitlist');
    return saved ? JSON.parse(saved) : INITIAL_WAITLIST_ENTRIES;
  });

  const [admissionBatches, setAdmissionBatches] = useState<AdmissionBatch[]>(() => {
    const saved = localStorage.getItem('koodal_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [userWaitlistStatus, setUserWaitlistStatus] = useState<WaitlistEntry | null>(() => {
    const savedId = localStorage.getItem('koodal_my_waitlist_id');
    if (savedId) {
      const found = INITIAL_WAITLIST_ENTRIES.find(w => w.id === savedId);
      if (found) return found;
    }
    return {
      id: 'wl_demo_me',
      email: 'balaji.waitlist@example.com',
      city: 'Chennai',
      gender: 'man',
      intent: 'long_term',
      lane: 'men',
      score: 52,
      status: 'waiting',
      referralCount: 0,
      hasSelfieApproved: false,
      hasProfileComplete: true,
      daysOnList: 12,
      createdAt: '2026-10-10T12:00:00Z'
    };
  });

  useEffect(() => {
    localStorage.setItem('koodal_waitlist', JSON.stringify(waitlistEntries));
  }, [waitlistEntries]);

  useEffect(() => {
    localStorage.setItem('koodal_batches', JSON.stringify(admissionBatches));
  }, [admissionBatches]);

  useEffect(() => {
    localStorage.setItem('koodal_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('koodal_my_profile', JSON.stringify(myProfile));
  }, [myProfile]);

  useEffect(() => {
    localStorage.setItem('koodal_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('koodal_messages', JSON.stringify(messages));
  }, [messages]);

  const navigateTo = (view: string, param?: string) => {
    setCurrentView(view);
    setViewParam(param);
    try {
      const targetUrl = param && (view === '/chat' || view === '/profile') 
        ? `${view}/${param}` 
        : view;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateMyProfile = async (updated: Partial<Profile>) => {
    setMyProfile(prev => ({ ...prev, ...updated }));
    if (currentUser?.id) {
      await ProfileService.updateProfile(currentUser.id, updated);
    }
  };

  const deleteAccount = async () => {
    try {
      await ProfileService.deleteAccount();
    } catch {
      // ignore
    }
    localStorage.clear();
    setCurrentUser(null);
    setMyProfile(INITIAL_MY_PROFILE);
    setMatches([]);
    setMessages({});
    setActiveRole('visitor');
    navigateTo('/');
  };

  // Filter profiles for discovery
  const discoverableProfiles = profiles.filter(p => {
    if (p.userId === currentUser?.id) return false;
    if (passedIds.includes(p.id)) return false;
    if (likedIds.includes(p.id)) return false;
    if (blockedUsers.includes(p.userId)) return false;
    if (p.isPaused) return false;
    if (activeIntentFilter !== 'all' && p.intent !== activeIntentFilter) return false;
    return true;
  });

  const likeProfile = async (profile: Profile) => {
    if (currentUser?.id) {
      const result = await DiscoveryService.likeProfile(currentUser.id, profile.userId);
      if (!result.success && result.limitReached) {
        setLikeLimitNotice(true);
        return;
      }

      setLikedIds(prev => [...prev, profile.id]);

      if (result.isMatch) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        const newMatch: Match = {
          id: result.match?.id || `match_${Date.now()}`,
          userA: currentUser.id,
          userB: profile.userId,
          createdAt: result.match?.created_at || new Date().toISOString(),
          matchedProfile: profile,
          lastMessage: 'You matched! Say hello.',
          lastMessageTime: 'Just now',
          unreadCount: 0
        };

        setMatches(prev => [newMatch, ...prev]);
        setMatchMoment(profile);
      }
    } else {
      setLikedIds(prev => [...prev, profile.id]);
      const isCompatible = profile.intent === myProfile.intent || activeIntentFilter === 'all';
      if (isCompatible) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        const newMatch: Match = {
          id: `match_${Date.now()}`,
          userA: 'usr_me_01',
          userB: profile.userId,
          createdAt: new Date().toISOString(),
          matchedProfile: profile,
          lastMessage: 'You matched! Say hello.',
          lastMessageTime: 'Just now',
          unreadCount: 0
        };
        setMatches(prev => [newMatch, ...prev]);
        setMatchMoment(profile);
      }
    }
  };

  const passProfile = (profileId: string) => {
    setPassedIds(prev => [...prev, profileId]);
    const target = profiles.find(p => p.id === profileId);
    if (currentUser?.id && target) {
      DiscoveryService.passProfile(currentUser.id, target.userId).catch(() => {});
    }
  };

  const sendMessage = async (matchId: string, body: string): Promise<boolean> => {
    if (!body.trim()) return false;
    const trimmed = body.trim();
    const senderId = currentUser?.id;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Optimistically insert message into UI thread immediately with sending status
    const optimisticMsg: Message = {
      id: tempId,
      matchId,
      senderId: senderId || 'usr_me_01',
      body: trimmed,
      sentAt: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), optimisticMsg]
    }));

    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          lastMessage: trimmed,
          lastMessageTime: 'Just now'
        };
      }
      return m;
    }));

    if (senderId) {
      const res = await ChatService.sendMessage(matchId, senderId, trimmed);
      if (res.success && res.message) {
        const confirmedMsg: Message = {
          id: res.message.id,
          matchId: res.message.match_id,
          senderId: res.message.sender_id,
          body: res.message.body,
          sentAt: res.message.sent_at,
          readAt: res.message.read_at || undefined,
          status: 'sent'
        };

        setMessages(prev => {
          const list = prev[matchId] || [];
          return {
            ...prev,
            [matchId]: list.map(m => (m.id === tempId ? confirmedMsg : m))
          };
        });

        return true;
      } else {
        setMessages(prev => {
          const list = prev[matchId] || [];
          return {
            ...prev,
            [matchId]: list.map(m =>
              m.id === tempId
                ? { ...m, status: 'failed', error: res.error || 'Failed to send' }
                : m
            )
          };
        });
        return false;
      }
    } else {
      setTimeout(() => {
        setMessages(prev => {
          const list = prev[matchId] || [];
          return {
            ...prev,
            [matchId]: list.map(m => (m.id === tempId ? { ...m, status: 'sent' } : m))
          };
        });
      }, 300);

      return true;
    }
  };

  const retrySendMessage = async (matchId: string, failedMessageId: string): Promise<boolean> => {
    const list = messages[matchId] || [];
    const failedMsg = list.find(m => m.id === failedMessageId);
    if (!failedMsg) return false;

    // Reset status to sending
    setMessages(prev => ({
      ...prev,
      [matchId]: (prev[matchId] || []).map(m =>
        m.id === failedMessageId ? { ...m, status: 'sending', error: undefined } : m
      )
    }));

    const senderId = currentUser?.id;
    if (senderId) {
      const res = await ChatService.sendMessage(matchId, senderId, failedMsg.body);
      if (res.success && res.message) {
        const confirmedMsg: Message = {
          id: res.message.id,
          matchId: res.message.match_id,
          senderId: res.message.sender_id,
          body: res.message.body,
          sentAt: res.message.sent_at,
          readAt: res.message.read_at || undefined,
          status: 'sent'
        };

        setMessages(prev => ({
          ...prev,
          [matchId]: (prev[matchId] || []).map(m =>
            m.id === failedMessageId ? confirmedMsg : m
          )
        }));
        return true;
      } else {
        setMessages(prev => ({
          ...prev,
          [matchId]: (prev[matchId] || []).map(m =>
            m.id === failedMessageId
              ? { ...m, status: 'failed', error: res.error || 'Failed to send' }
              : m
          )
        }));
        return false;
      }
    } else {
      setTimeout(() => {
        setMessages(prev => ({
          ...prev,
          [matchId]: (prev[matchId] || []).map(m =>
            m.id === failedMessageId ? { ...m, status: 'sent' } : m
          )
        }));
      }, 300);
      return true;
    }
  };

  const blockUser = async (userId: string) => {
    setBlockedUsers(prev => [...prev, userId]);
    // Remove from matches and discovery immediately
    setMatches(prev => prev.filter(m => m.matchedProfile.userId !== userId && m.matchedProfile.id !== userId));
    setProfiles(prev => prev.filter(p => p.userId !== userId && p.id !== userId));

    if (currentUser?.id) {
      await ModerationService.blockUser(currentUser.id, userId);
    }
  };

  const submitReport = async (
    targetId: string, 
    targetName: string, 
    targetPhoto: string, 
    reason: Report['reason'], 
    details: string
  ) => {
    const newReport: Report = {
      id: `rep_${Date.now()}`,
      reporterId: currentUser?.id || 'usr_me_01',
      targetId,
      targetName,
      targetPhoto,
      reason,
      details,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);

    if (currentUser?.id) {
      await ModerationService.submitReport(currentUser.id, targetId, reason, details);
    }
    await blockUser(targetId);
  };

  const reviewReport = async (reportId: string, action: 'warn' | 'suspend' | 'ban' | 'dismiss') => {
    const targetReport = reports.find(r => r.id === reportId);
    const targetUserId = targetReport?.targetId;

    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        const statusMap = {
          warn: 'reviewed_warned' as const,
          suspend: 'reviewed_suspended' as const,
          ban: 'reviewed_banned' as const,
          dismiss: 'dismissed' as const,
        };
        return {
          ...r,
          status: statusMap[action],
          reviewedBy: currentUser?.email || 'Admin'
        };
      }
      return r;
    }));

    if (currentUser?.id) {
      await ModerationService.reviewReport(reportId, action, currentUser.id, supabase, targetUserId);
    }
  };

  const reviewSelfie = async (selfieId: string, approved: boolean) => {
    setSelfieVerifications(prev => prev.map(s => {
      if (s.id === selfieId) {
        return {
          ...s,
          status: approved ? 'approved' : 'rejected',
          reviewedBy: currentUser?.email || 'Admin'
        };
      }
      return s;
    }));

    // If approved, update user's profile to verified
    const selfieItem = selfieVerifications.find(s => s.id === selfieId);
    if (selfieItem && approved) {
      setProfiles(prev => prev.map(p => {
        if (p.userId === selfieItem.userId) {
          return { ...p, verificationStatus: 'verified' };
        }
        return p;
      }));
    }

    if (currentUser?.id) {
      await ModerationService.reviewSelfie(selfieId, approved, currentUser.id);
    }
  };

  const reviewPhoto = async (photoId: string, approved: boolean) => {
    setPhotoModerations(prev => prev.map(ph => {
      if (ph.id === photoId) {
        return {
          ...ph,
          status: approved ? 'approved' : 'rejected'
        };
      }
      return ph;
    }));

    if (currentUser?.id) {
      await ModerationService.reviewPhoto(photoId, approved, currentUser.id);
    }
  };

  const toggleUserBan = async (userId: string) => {
    const targetUser = allUsers.find(u => u.id === userId);
    const newStatus = targetUser?.status === 'banned' ? 'active' : 'banned';

    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: newStatus
        };
      }
      return u;
    }));

    if (currentUser?.id) {
      await ModerationService.toggleUserStatus(userId, newStatus, currentUser.id);
    }
  };

  const joinWaitlist = async (data: {
    email: string;
    city: string;
    gender: 'woman' | 'man' | 'non_binary' | 'other';
    intent: RelationshipIntent;
    referralCode?: string;
  }): Promise<WaitlistEntry> => {
    const isLaunchCity = data.city.toLowerCase().includes('chennai') || data.city.toLowerCase().includes('bangalore');
    const lane = (data.gender === 'woman' || data.gender === 'non_binary' || data.gender === 'other')
      ? 'women_and_others'
      : 'men';
    
    // Initial priority score per Section 13:
    // Email verified (Required), Launch city (+20), Referral (+10), Day 1 (+1)
    let initialScore = 1;
    if (isLaunchCity) initialScore += 20;
    if (data.referralCode) initialScore += 10;

    let createdId = `wl_${Date.now()}`;

    if (currentUser?.id) {
      const res = await WaitlistService.joinWaitlist({
        userId: currentUser.id,
        email: data.email,
        city: data.city,
        gender: data.gender,
        intent: data.intent,
        referredBy: data.referralCode
      });
      if (res.success && res.entry?.id) {
        createdId = res.entry.id;
        initialScore = res.entry.score || initialScore;
      }
    }

    const newEntry: WaitlistEntry = {
      id: createdId,
      email: data.email,
      city: data.city,
      gender: data.gender,
      intent: data.intent,
      lane,
      score: initialScore,
      status: 'waiting',
      referredBy: data.referralCode ? 'Verified Member' : undefined,
      referralCount: 0,
      hasSelfieApproved: false,
      hasProfileComplete: false,
      daysOnList: 1,
      createdAt: new Date().toISOString()
    };

    setWaitlistEntries(prev => [newEntry, ...prev]);
    setUserWaitlistStatus(newEntry);
    localStorage.setItem('koodal_my_waitlist_id', newEntry.id);
    return newEntry;
  };

  const boostWaitlistEntry = (entryId: string, task: 'selfie' | 'profile' | 'referral') => {
    setWaitlistEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      let newScore = entry.score;
      let selfie = entry.hasSelfieApproved;
      let profile = entry.hasProfileComplete;
      let refs = entry.referralCount;

      if (task === 'selfie' && !selfie) {
        selfie = true;
        newScore += 30;
      } else if (task === 'profile' && !profile) {
        profile = true;
        newScore += 20;
      } else if (task === 'referral') {
        refs += 1;
        newScore += 10;
      }

      const updated: WaitlistEntry = {
        ...entry,
        score: newScore,
        hasSelfieApproved: selfie,
        hasProfileComplete: profile,
        referralCount: refs
      };
      if (userWaitlistStatus?.id === entryId) {
        setUserWaitlistStatus(updated);
      }
      return updated;
    }));
  };

  const runBatchAdmission = async (city: string, womenToAdmit: number, menToAdmit: number) => {
    let activeWomen = waitlistEntries.filter(w => w.city.toLowerCase().includes(city.toLowerCase()) && w.lane === 'women_and_others' && w.status === 'admitted').length;
    let activeMen = waitlistEntries.filter(w => w.city.toLowerCase().includes(city.toLowerCase()) && w.lane === 'men' && w.status === 'admitted').length;

    let actualWomen = womenToAdmit;
    let actualMen = menToAdmit;

    if (currentUser?.id) {
      const res = await WaitlistService.executeBatchAdmission(city, womenToAdmit, menToAdmit);
      if (res.success) {
        actualWomen = res.admittedWomen ?? womenToAdmit;
        actualMen = res.admittedMen ?? menToAdmit;
        if (res.activeWomen !== undefined) activeWomen = res.activeWomen;
        if (res.activeMen !== undefined) activeMen = res.activeMen;
      }
    }

    const eligibleWomen = waitlistEntries
      .filter(w => w.city.toLowerCase().includes(city.toLowerCase()) && w.lane === 'women_and_others' && w.status === 'waiting')
      .sort((a, b) => b.score - a.score)
      .slice(0, actualWomen);

    const eligibleMen = waitlistEntries
      .filter(w => w.city.toLowerCase().includes(city.toLowerCase()) && w.lane === 'men' && w.status === 'waiting')
      .sort((a, b) => b.score - a.score)
      .slice(0, actualMen);

    const admittedIds = new Set([...eligibleWomen.map(w => w.id), ...eligibleMen.map(m => m.id)]);

    setWaitlistEntries(prev => prev.map(w => {
      if (admittedIds.has(w.id)) {
        return {
          ...w,
          status: 'admitted',
          admittedAt: new Date().toISOString()
        };
      }
      return w;
    }));

    const ratioBefore = Number((activeMen / Math.max(1, activeWomen)).toFixed(2));
    const newActiveWomen = activeWomen + actualWomen;
    const newActiveMen = activeMen + actualMen;
    const ratioAfter = Number((newActiveMen / Math.max(1, newActiveWomen)).toFixed(2));

    const newBatch: AdmissionBatch = {
      id: `batch_${Date.now()}`,
      city,
      date: new Date().toISOString().split('T')[0],
      womenAdmitted: actualWomen,
      menAdmitted: actualMen,
      ratioBefore,
      ratioAfter
    };

    setAdmissionBatches(prev => [newBatch, ...prev]);

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });

    return {
      womenAdmitted: actualWomen,
      menAdmitted: actualMen,
      newRatio: ratioAfter
    };
  };

  const t = translations[language];

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currentView,
        navigateTo,
        viewParam,
        activeRole,
        setActiveRole,
        currentUser,
        myProfile,
        updateMyProfile,
        deleteAccount,
        discoverableProfiles,
        isLoadingDiscovery,
        discoveryError,
        refreshDiscovery,
        likeLimitNotice,
        clearLikeLimitNotice,
        activeIntentFilter,
        setActiveIntentFilter,
        likeProfile,
        passProfile,
        matchMoment,
        setMatchMoment,
        matches,
        messages,
        setMessages,
        sendMessage,
        retrySendMessage,
        isLoadingMatches,
        matchesError,
        refreshMatches,
        fetchMessagesForMatch,
        markMatchAsRead,
        blockedUsers,
        blockUser,
        reports,
        submitReport,
        selfieVerifications,
        photoModerations,
        allUsers,
        reviewReport,
        reviewSelfie,
        reviewPhoto,
        toggleUserBan,
        waitlistEntries,
        admissionBatches,
        userWaitlistStatus,
        joinWaitlist,
        boostWaitlistEntry,
        runBatchAdmission
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
