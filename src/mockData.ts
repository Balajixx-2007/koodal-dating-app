import { Profile, Match, Message, Report, SelfieVerification, PhotoModerationItem, User, WaitlistEntry, AdmissionBatch } from './types';

export const INITIAL_USER: User = {
  id: 'usr_me_01',
  email: 'balaji.chennai@example.com',
  role: 'member',
  status: 'active',
  createdAt: '2026-09-15T10:00:00Z',
  verifiedAt: '2026-09-16T12:00:00Z',
};

export const INITIAL_MY_PROFILE: Profile = {
  id: 'prof_me_01',
  userId: 'usr_me_01',
  name: 'Balaji K.',
  age: 24,
  birthDate: '2002-04-12',
  gender: 'man',
  intent: 'long_term',
  bio: 'Product designer based in Besant Nagar, Chennai. Big on weekend coastal walks, filter coffee, and indie acoustic concerts.',
  bioTa: 'சென்னையில் உள்ள தயாரிப்பு வடிவமைப்பாளர். வடிகட்டி காபி, பெசன்ட் நகர் கடற்கரை நடைப்பயிற்சி மற்றும் இசை ஆர்வலர்.',
  city: 'Chennai (Besant Nagar)',
  distanceKm: 0,
  photos: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80'
  ],
  selfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  verificationStatus: 'verified',
  interests: ['Coffee Culture', 'Design Systems', 'Carnatic Indie Fusion', 'Coastal Cycling', 'Tamil Literature'],
  prompts: [
    {
      id: 'p1',
      question: 'A non-negotiable for me in a relationship is...',
      questionTa: 'எனது உறவில் சமரசம் செய்ய முடியாத ஒன்று...',
      answer: 'Clear communication, mutual kindness, and making time for deep Sunday conversations.'
    },
    {
      id: 'p2',
      question: 'My ideal Sunday in Chennai looks like...',
      questionTa: 'சென்னையில் எனது கனவு ஞாயிறு இப்படி இருக்கும்...',
      answer: 'Hot filter coffee at Ratna Cafe, browsing at Higginbothams, followed by a quiet evening by the sea.'
    }
  ],
  occupation: 'Lead Product Designer',
  education: 'IIT Madras Alumni',
  isPaused: false
};

export const SEED_PROFILES: Profile[] = [
  {
    id: 'prof_01',
    userId: 'usr_01',
    name: 'Ananya Raman',
    age: 23,
    gender: 'woman',
    intent: 'long_term',
    bio: 'Software engineer at a climate tech startup. Weekend potter, carnatic vocalist, and passionate explorer of south Indian culinary heritage.',
    bioTa: 'மென்பொருள் பொறியாளர் & பாடகி. மண்பாண்டக் கலை மற்றும் பாரம்பரிய உணவு முறைகளில் மிகுந்த ஆர்வம்.',
    city: 'Chennai (Adyar)',
    distanceKm: 3.2,
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
    ],
    selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    verificationStatus: 'verified',
    interests: ['Carnatic Music', 'Climate Tech', 'Pottery', 'Filter Coffee', 'Filter Books'],
    prompts: [
      {
        id: 'p_an_1',
        question: 'Together we could...',
        questionTa: 'நாம் ஒன்றாக...',
        answer: 'Cook an authentic chettinad feast from scratch while listening to MS Subbulakshmi.'
      },
      {
        id: 'p_an_2',
        question: 'The key to my heart is...',
        questionTa: 'என் மனதை வெல்லும் வழி...',
        answer: 'Thoughtful discussions about books, empathy towards stray animals, and good dry humor.'
      }
    ],
    occupation: 'Backend Engineer',
    education: 'Anna University'
  },
  {
    id: 'prof_02',
    userId: 'usr_02',
    name: 'Karthik Subramanian',
    age: 27,
    gender: 'man',
    intent: 'marriage',
    bio: 'Biomedical researcher looking for a meaningful life partnership built on trust, intellectual compatibility, and shared values.',
    bioTa: 'உயிரி மருத்துவ ஆராய்ச்சியாளர். பரஸ்பர நம்பிக்கை மற்றும் குடும்ப மதிப்புகளைக் கொண்ட இல்லறத் துணையைத் தேடுகிறேன்.',
    city: 'Chennai (Mylapore)',
    distanceKm: 5.8,
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
    ],
    selfieUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    verificationStatus: 'verified',
    interests: ['Biotech', 'Classical Violin', 'Temple Architecture', 'Trekking', 'Reading'],
    prompts: [
      {
        id: 'p_k_1',
        question: 'What I value most in marriage...',
        questionTa: 'திருமண உறவில் நான் பெரிதும் மதிப்பவை...',
        answer: 'Being true best friends first, encouraging each other’s aspirations, and honoring our parents with love.'
      }
    ],
    occupation: 'Senior Scientist',
    education: 'Ph.D. Madras University'
  },
  {
    id: 'prof_03',
    userId: 'usr_03',
    name: 'Pooja Venkatesh',
    age: 22,
    gender: 'woman',
    intent: 'friendship',
    bio: 'Architecture student at SRM campus. Looking for tennis buddies, cafe study companions, and art gallery hopping friends!',
    bioTa: 'கட்டடக் கலை மாணவி. டென்னிஸ் விளையாடவும், அருங்காட்சியகம் செல்லவும் நல்ல நண்பர்களை தேடுகிறேன்.',
    city: 'Chennai (Kattankulathur Campus)',
    distanceKm: 14.5,
    photos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
    ],
    selfieUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
    verificationStatus: 'verified',
    interests: ['Architecture', 'Lawn Tennis', 'Street Photography', 'Indie Films', 'Sketching'],
    prompts: [
      {
        id: 'p_p_1',
        question: 'Best way to spend a Saturday...',
        questionTa: 'சனிக்கிழமையை கழிக்க சிறந்த வழி...',
        answer: 'Sketching old buildings in George Town followed by hot samosas and bad jokes.'
      }
    ],
    occupation: 'Architecture Student',
    education: 'SRM University'
  },
  {
    id: 'prof_04',
    userId: 'usr_04',
    name: 'Naveen Kumar',
    age: 25,
    gender: 'man',
    intent: 'casual',
    bio: 'Cinematographer and foodie. Enjoy spontaneous drives down ECR, beach sunsets, and trying every parotta stall in town.',
    bioTa: 'ஒளிப்பதிவாளர். கிழக்கு கடற்கரை சாலையில் நீண்ட பயணம், கடற்கரை மாலைப் பொழுது மற்றும் உணவுப் பிரியர்.',
    city: 'Chennai (Thiruvanmiyur)',
    distanceKm: 2.1,
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=800&q=80'
    ],
    selfieUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    verificationStatus: 'verified',
    interests: ['Cinema', 'Night Drives', 'ECR Cafes', 'Street Food', 'Docuseries'],
    prompts: [
      {
        id: 'p_n_1',
        question: 'Dating me is like...',
        questionTa: 'என்னுடன் பழகுவது...',
        answer: 'A playlist you didn’t know you needed, accompanied by crisp beach breeze and zero pretense.'
      }
    ],
    occupation: 'Freelance Cinematographer',
    education: 'LV Prasad Film Academy'
  },
  {
    id: 'prof_05',
    userId: 'usr_05',
    name: 'Divya Sundaram',
    age: 26,
    gender: 'woman',
    intent: 'long_term',
    bio: 'Product marketing manager and theatre artist. Love deep conversations about psychology, heritage handlooms, and spicy Andhra meals.',
    bioTa: 'தயாரிப்பு சந்தைப்படுத்துதல் மேலாளர் & நாடக கலைஞர். ஆழமான உரையாடல்கள் மற்றும் புத்தக வாசிப்பில் ஆர்வம்.',
    city: 'Chennai (Nungambakkam)',
    distanceKm: 6.0,
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
    ],
    selfieUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    verificationStatus: 'verified',
    interests: ['Theatre', 'Public Speaking', 'Coffee', 'Handloom Saree', 'Psychology'],
    prompts: [
      {
        id: 'p_d_1',
        question: 'Two truths and a lie...',
        questionTa: 'இரண்டு உண்மை, ஒரு பொய்...',
        answer: 'I have performed at Alliance Française, I drink 4 espressos a day, and I’ve never seen a Rajinikanth FDFO.'
      }
    ],
    occupation: 'PMM at SaaS Corp',
    education: 'Loyola College'
  },
  {
    id: 'prof_06',
    userId: 'usr_06',
    name: 'Siddharth V.',
    age: 28,
    gender: 'man',
    intent: 'marriage',
    bio: 'Chartered Accountant with family values. Calm demeanor, love badminton, home gardening, and quiet temple visits.',
    bioTa: 'பட்டய கணக்காளர். அமைதியான குணம், தோட்டக்கலை மற்றும் எளிய குடும்ப மதிப்புகளைப் போற்றுபவர்.',
    city: 'Chennai (T. Nagar)',
    distanceKm: 4.8,
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
    ],
    selfieUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    verificationStatus: 'verified',
    interests: ['Finance', 'Badminton', 'Gardening', 'Filter Coffee', 'Spirituality'],
    prompts: [
      {
        id: 'p_s_1',
        question: 'What happiness means to me...',
        questionTa: 'எனக்கு மகிழ்ச்சி என்றால்...',
        answer: 'Sunday lunch with family, peaceful evenings, and growing older with the same best friend.'
      }
    ],
    occupation: 'Senior Associate CA',
    education: 'ICAI Member'
  }
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'match_01',
    userA: 'usr_me_01',
    userB: 'usr_01',
    createdAt: '2026-10-20T14:30:00Z',
    matchedProfile: SEED_PROFILES[0],
    lastMessage: 'I completely agree about Ratna Cafe! Have you tried their sambar idlis recently?',
    lastMessageTime: '10m ago',
    unreadCount: 1
  },
  {
    id: 'match_02',
    userA: 'usr_me_01',
    userB: 'usr_05',
    createdAt: '2026-10-19T09:15:00Z',
    matchedProfile: SEED_PROFILES[4],
    lastMessage: 'Alliance Française is such a great venue. What play were you directing?',
    lastMessageTime: 'Yesterday',
    unreadCount: 0
  }
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  match_01: [
    {
      id: 'm1',
      matchId: 'match_01',
      senderId: 'usr_me_01',
      body: 'Hi Ananya! Loved your answer about cooking Chettinad food while listening to MS Subbulakshmi.',
      sentAt: '2026-10-20T14:32:00Z'
    },
    {
      id: 'm2',
      matchId: 'match_01',
      senderId: 'usr_01',
      body: 'Haha thanks Balaji! It really is my favorite therapy after a long sprint week. Do you cook too?',
      sentAt: '2026-10-20T14:45:00Z'
    },
    {
      id: 'm3',
      matchId: 'match_01',
      senderId: 'usr_me_01',
      body: 'I do! Mostly simple south Indian comfort food and lots of good coffee experiments.',
      sentAt: '2026-10-20T15:02:00Z'
    },
    {
      id: 'm4',
      matchId: 'match_01',
      senderId: 'usr_01',
      body: 'I completely agree about Ratna Cafe! Have you tried their sambar idlis recently?',
      sentAt: '2026-10-21T11:35:00Z'
    }
  ],
  match_02: [
    {
      id: 'm_d1',
      matchId: 'match_02',
      senderId: 'usr_05',
      body: 'Hey Balaji! Great to connect. Always nice meeting another Besant Nagar local who values long-term commitments.',
      sentAt: '2026-10-19T10:00:00Z'
    },
    {
      id: 'm_d2',
      matchId: 'match_02',
      senderId: 'usr_me_01',
      body: 'Alliance Française is such a great venue. What play were you directing?',
      sentAt: '2026-10-19T11:20:00Z'
    }
  ]
};

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep_01',
    reporterId: 'usr_01',
    targetId: 'usr_suspect_99',
    targetName: 'Vijay "Crypto" R.',
    targetPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    reason: 'scam',
    details: 'Asked for Telegram handle within 2 messages and pitched a WhatsApp trading scheme.',
    status: 'pending',
    createdAt: '2026-10-21T08:12:00Z'
  },
  {
    id: 'rep_02',
    reporterId: 'usr_05',
    targetId: 'usr_suspect_88',
    targetName: 'Anonymous Guy',
    targetPhoto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    reason: 'intent_mismatch',
    details: 'Set profile to Marriage intent but continuously made aggressive and vulgar casual advances.',
    status: 'pending',
    createdAt: '2026-10-20T22:45:00Z'
  }
];

export const INITIAL_SELFIES: SelfieVerification[] = [
  {
    id: 'slf_01',
    userId: 'usr_applicant_1',
    userName: 'Meera Krishnan',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    selfieUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    submittedAt: '2026-10-21T09:30:00Z',
    status: 'pending'
  },
  {
    id: 'slf_02',
    userId: 'usr_applicant_2',
    userName: 'Tarun Prasanna',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    selfieUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    submittedAt: '2026-10-21T10:15:00Z',
    status: 'pending'
  }
];

export const INITIAL_PHOTOS_MODERATION: PhotoModerationItem[] = [
  {
    id: 'ph_01',
    userId: 'usr_03',
    userName: 'Pooja Venkatesh',
    photoUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80',
    submittedAt: '2026-10-21T11:00:00Z',
    status: 'pending'
  },
  {
    id: 'ph_02',
    userId: 'usr_04',
    userName: 'Naveen Kumar',
    photoUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=600&q=80',
    submittedAt: '2026-10-21T11:10:00Z',
    status: 'pending'
  }
];

export const INITIAL_WAITLIST_ENTRIES: WaitlistEntry[] = [
  // Lane 1: Women & Other Genders
  {
    id: 'wl_w_01',
    email: 'kavitha.m@chennai.edu',
    city: 'Chennai',
    gender: 'woman',
    intent: 'long_term',
    lane: 'women_and_others',
    score: 82, // 30 (selfie) + 20 (profile) + 20 (city) + 12 (days)
    status: 'waiting',
    referralCount: 1,
    hasSelfieApproved: true,
    hasProfileComplete: true,
    daysOnList: 12,
    createdAt: '2026-10-10T08:00:00Z'
  },
  {
    id: 'wl_w_02',
    email: 'sneha.blore@biotech.org',
    city: 'Bangalore',
    gender: 'woman',
    intent: 'marriage',
    lane: 'women_and_others',
    score: 75, // 30 (selfie) + 20 (profile) + 20 (city) + 5 (days)
    status: 'waiting',
    referralCount: 0,
    hasSelfieApproved: true,
    hasProfileComplete: true,
    daysOnList: 5,
    createdAt: '2026-10-17T09:30:00Z'
  },
  {
    id: 'wl_w_03',
    email: 'dhivya.ux@chennai.design',
    city: 'Chennai',
    gender: 'non_binary',
    intent: 'friendship',
    lane: 'women_and_others',
    score: 68, // 30 (selfie) + 20 (city) + 18 (days)
    status: 'waiting',
    referralCount: 0,
    hasSelfieApproved: true,
    hasProfileComplete: false,
    daysOnList: 18,
    createdAt: '2026-10-04T14:20:00Z'
  },
  {
    id: 'wl_w_04',
    email: 'meera.s@health.in',
    city: 'Chennai',
    gender: 'woman',
    intent: 'casual',
    lane: 'women_and_others',
    score: 44, // 20 (profile) + 20 (city) + 4 (days)
    status: 'waiting',
    referralCount: 0,
    hasSelfieApproved: false,
    hasProfileComplete: true,
    daysOnList: 4,
    createdAt: '2026-10-18T16:00:00Z'
  },

  // Lane 2: Men
  {
    id: 'wl_m_01',
    email: 'aravind.subramanian@gmail.com',
    city: 'Chennai',
    gender: 'man',
    intent: 'long_term',
    lane: 'men',
    score: 86, // 30 (selfie) + 20 (profile) + 20 (city) + 10 (referral) + 6 (days)
    status: 'waiting',
    referredBy: 'Balaji K.',
    referralCount: 1,
    hasSelfieApproved: true,
    hasProfileComplete: true,
    daysOnList: 6,
    createdAt: '2026-10-16T11:00:00Z'
  },
  {
    id: 'wl_m_02',
    email: 'karthik.b@techlabs.io',
    city: 'Bangalore',
    gender: 'man',
    intent: 'casual',
    lane: 'men',
    score: 84, // 30 (selfie) + 20 (profile) + 20 (city) + 14 (days)
    status: 'waiting',
    referralCount: 0,
    hasSelfieApproved: true,
    hasProfileComplete: true,
    daysOnList: 14,
    createdAt: '2026-10-08T10:15:00Z'
  },
  {
    id: 'wl_m_03',
    email: 'vignesh.r@iitm.ac.in',
    city: 'Chennai',
    gender: 'man',
    intent: 'marriage',
    lane: 'men',
    score: 72, // 30 (selfie) + 20 (city) + 20 (days limit) + 2
    status: 'waiting',
    referralCount: 0,
    hasSelfieApproved: true,
    hasProfileComplete: false,
    daysOnList: 22,
    createdAt: '2026-09-30T17:45:00Z'
  },
  {
    id: 'wl_m_04',
    email: 'siddharth.m@startup.co',
    city: 'Bangalore',
    gender: 'man',
    intent: 'friendship',
    lane: 'men',
    score: 43, // 20 (city) + 20 (profile) + 3 (days)
    status: 'waiting',
    referralCount: 0,
    hasSelfieApproved: false,
    hasProfileComplete: true,
    daysOnList: 3,
    createdAt: '2026-10-19T13:20:00Z'
  },
  {
    id: 'wl_m_05',
    email: 'pradeep.kumar@chennai.co',
    city: 'Chennai',
    gender: 'man',
    intent: 'long_term',
    lane: 'men',
    score: 28, // 20 (city) + 8 (days)
    status: 'waiting',
    referralCount: 0,
    hasSelfieApproved: false,
    hasProfileComplete: false,
    daysOnList: 8,
    createdAt: '2026-10-14T09:00:00Z'
  }
];

export const INITIAL_BATCHES: AdmissionBatch[] = [
  {
    id: 'batch_01',
    city: 'Chennai',
    date: '2026-10-15',
    womenAdmitted: 15,
    menAdmitted: 18,
    ratioBefore: 1.45,
    ratioAfter: 1.25
  },
  {
    id: 'batch_02',
    city: 'Bangalore',
    date: '2026-10-18',
    womenAdmitted: 12,
    menAdmitted: 14,
    ratioBefore: 1.38,
    ratioAfter: 1.18
  }
];

