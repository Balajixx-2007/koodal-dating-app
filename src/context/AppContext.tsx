import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Profile, RelationshipIntent, Match, Message, Report, 
  SelfieVerification, PhotoModerationItem 
} from '../types';
import { 
  INITIAL_USER, INITIAL_MY_PROFILE, SEED_PROFILES, 
  INITIAL_MATCHES, INITIAL_MESSAGES, INITIAL_REPORTS, 
  INITIAL_SELFIES, INITIAL_PHOTOS_MODERATION 
} from '../mockData';
import { Language, translations } from '../translations';
import confetti from 'canvas-confetti';

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
  updateMyProfile: (updated: Partial<Profile>) => void;
  deleteAccount: () => void;
  
  // Discovery & Matching
  discoverableProfiles: Profile[];
  activeIntentFilter: RelationshipIntent | 'all';
  setActiveIntentFilter: (filter: RelationshipIntent | 'all') => void;
  likeProfile: (profile: Profile) => void;
  passProfile: (profileId: string) => void;
  matchMoment: Profile | null;
  setMatchMoment: (profile: Profile | null) => void;
  
  // Matches & Chat
  matches: Match[];
  messages: Record<string, Message[]>;
  sendMessage: (matchId: string, body: string) => void;
  
  // Safety & Moderation
  blockedUsers: string[];
  blockUser: (userId: string) => void;
  reports: Report[];
  submitReport: (targetId: string, targetName: string, targetPhoto: string, reason: Report['reason'], details: string) => void;
  
  // Admin queues
  selfieVerifications: SelfieVerification[];
  photoModerations: PhotoModerationItem[];
  allUsers: User[];
  reviewReport: (reportId: string, action: 'warn' | 'suspend' | 'ban' | 'dismiss') => void;
  reviewSelfie: (selfieId: string, approved: boolean) => void;
  reviewPhoto: (photoId: string, approved: boolean) => void;
  toggleUserBan: (userId: string) => void;
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

  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('koodal_matches');
    return saved ? JSON.parse(saved) : INITIAL_MATCHES;
  });

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('koodal_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

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

  const updateMyProfile = (updated: Partial<Profile>) => {
    setMyProfile(prev => ({ ...prev, ...updated }));
  };

  const deleteAccount = () => {
    localStorage.clear();
    setCurrentUser(null);
    setMyProfile(INITIAL_MY_PROFILE);
    setMatches([]);
    setMessages({});
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

  const likeProfile = (profile: Profile) => {
    setLikedIds(prev => [...prev, profile.id]);

    // Check mutual match condition: if intents are compatible, celebrate match!
    const isCompatible = profile.intent === myProfile.intent || activeIntentFilter === 'all';
    if (isCompatible) {
      // Trigger confetti celebration!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      const newMatch: Match = {
        id: `match_${Date.now()}`,
        userA: currentUser?.id || 'usr_me_01',
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
  };

  const passProfile = (profileId: string) => {
    setPassedIds(prev => [...prev, profileId]);
  };

  const sendMessage = (matchId: string, body: string) => {
    if (!body.trim()) return;
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      matchId,
      senderId: currentUser?.id || 'usr_me_01',
      body,
      sentAt: new Date().toISOString()
    };

    setMessages(prev => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), newMsg]
    }));

    // Update match preview
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          lastMessage: body,
          lastMessageTime: 'Just now'
        };
      }
      return m;
    }));

    // Automated thoughtful reply simulation after 2.5s for realism!
    setTimeout(() => {
      const match = matches.find(m => m.id === matchId);
      if (match) {
        const replyResponses = [
          `That really resonates with me! I feel the exact same way.`,
          `Haha, that's such a great answer. What else do you like doing around ${match.matchedProfile.city}?`,
          `I love that you mentioned this. It's so rare to find someone who is so upfront about what they want!`,
          `Totally agree! Would love to know more about your favorite spots in Chennai.`
        ];
        const randomReply = replyResponses[Math.floor(Math.random() * replyResponses.length)];
        
        const incomingMsg: Message = {
          id: `msg_in_${Date.now()}`,
          matchId,
          senderId: match.matchedProfile.userId,
          body: randomReply,
          sentAt: new Date().toISOString()
        };

        setMessages(prev => ({
          ...prev,
          [matchId]: [...(prev[matchId] || []), incomingMsg]
        }));

        setMatches(prev => prev.map(m => {
          if (m.id === matchId) {
            return {
              ...m,
              lastMessage: randomReply,
              lastMessageTime: 'Just now',
              unreadCount: (m.unreadCount || 0) + 1
            };
          }
          return m;
        }));
      }
    }, 2200);
  };

  const blockUser = (userId: string) => {
    setBlockedUsers(prev => [...prev, userId]);
    // Remove from matches if exists
    setMatches(prev => prev.filter(m => m.matchedProfile.userId !== userId));
  };

  const submitReport = (
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
    blockUser(targetId);
  };

  const reviewReport = (reportId: string, action: 'warn' | 'suspend' | 'ban' | 'dismiss') => {
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
          reviewedBy: 'Admin Balaji'
        };
      }
      return r;
    }));
  };

  const reviewSelfie = (selfieId: string, approved: boolean) => {
    setSelfieVerifications(prev => prev.map(s => {
      if (s.id === selfieId) {
        return {
          ...s,
          status: approved ? 'approved' : 'rejected',
          reviewedBy: 'Admin Balaji'
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
  };

  const reviewPhoto = (photoId: string, approved: boolean) => {
    setPhotoModerations(prev => prev.map(ph => {
      if (ph.id === photoId) {
        return {
          ...ph,
          status: approved ? 'approved' : 'rejected'
        };
      }
      return ph;
    }));
  };

  const toggleUserBan = (userId: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: u.status === 'banned' ? 'active' : 'banned'
        };
      }
      return u;
    }));
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
        activeIntentFilter,
        setActiveIntentFilter,
        likeProfile,
        passProfile,
        matchMoment,
        setMatchMoment,
        matches,
        messages,
        sendMessage,
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
        toggleUserBan
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
