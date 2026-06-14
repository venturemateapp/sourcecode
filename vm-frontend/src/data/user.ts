// User & Current User Data
import type { User } from '../types/venturemate';

export const currentUser: User = {
  id: 'usr_001',
  email: 'alex@techfounder.com',
  password: 'password',
  firstName: 'Alex',
  lastName: 'Chen',
  avatar: 'https://i.pravatar.cc/150?u=alex',
  role: 'founder',
  bio: 'Serial entrepreneur with 2 exits. Building the future of AI-powered productivity. Ex-Google PM, MIT grad.',
  location: 'San Francisco, CA',
  skills: ['Product Strategy', 'AI/ML', 'Fundraising', 'Team Building', 'Growth Marketing'],
  experience: [
    {
      id: 'exp_001',
      company: 'Google',
      role: 'Senior Product Manager',
      duration: '2018 - 2022',
      description: 'Led AI products team, launched 3 major features with 10M+ users'
    },
    {
      id: 'exp_002',
      company: 'TechStartup Inc',
      role: 'Co-founder & CTO',
      duration: '2015 - 2018',
      description: 'Built and sold SaaS platform for $45M'
    }
  ],
  linkedIn: 'https://linkedin.com/in/alexchen',
  twitter: '@alexchen',
  createdAt: '2024-01-15T00:00:00Z',
  lastActive: '2024-04-04T06:30:00Z'
};

export const adminUser: User = {
  id: 'usr_admin',
  email: 'admin@venturemate.io',
  password: 'admin123',
  firstName: 'Admin',
  lastName: 'User',
  avatar: 'https://i.pravatar.cc/150?u=admin',
  role: 'founder',
  bio: 'VentureMate administrator account.',
  location: 'San Francisco, CA',
  skills: ['Administration', 'Operations'],
  experience: [],
  createdAt: '2024-01-01T00:00:00Z',
  lastActive: '2024-04-04T06:30:00Z',
};

// Additional dummy users for testing
export const demoUsers: User[] = [
  {
    id: 'usr_002',
    email: 'sarah@designstudio.com',
    password: 'password',
    firstName: 'Sarah',
    lastName: 'Johnson',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    role: 'founder',
    bio: 'Design-focused founder building tools for creative professionals. Former Airbnb design lead.',
    location: 'New York, NY',
    skills: ['UX/UI Design', 'Branding', 'Product Management', 'User Research'],
    experience: [
      {
        id: 'exp_003',
        company: 'Airbnb',
        role: 'Senior Design Lead',
        duration: '2019 - 2023',
        description: 'Led design system team and host experience redesign'
      }
    ],
    linkedIn: 'https://linkedin.com/in/sarahjohnson',
    createdAt: '2024-02-10T00:00:00Z',
    lastActive: '2024-04-03T10:00:00Z'
  },
  {
    id: 'usr_003',
    email: 'michael@fintech.io',
    password: 'password',
    firstName: 'Michael',
    lastName: 'Roberts',
    avatar: 'https://i.pravatar.cc/150?u=michael',
    role: 'founder',
    bio: 'Ex-Wall Street building the future of decentralized finance. Series A founder.',
    location: 'Miami, FL',
    skills: ['Finance', 'Blockchain', 'Strategy', 'Compliance', 'Partnerships'],
    experience: [
      {
        id: 'exp_004',
        company: 'Goldman Sachs',
        role: 'VP, Technology Investment Banking',
        duration: '2016 - 2022',
        description: 'Advised on $5B+ in tech M&A and financing transactions'
      }
    ],
    linkedIn: 'https://linkedin.com/in/michaelroberts',
    createdAt: '2024-02-20T00:00:00Z',
    lastActive: '2024-04-02T15:30:00Z'
  },
  {
    id: 'usr_004',
    email: 'emma@healthtech.com',
    password: 'password',
    firstName: 'Emma',
    lastName: 'Wilson',
    avatar: 'https://i.pravatar.cc/150?u=emma',
    role: 'founder',
    bio: 'MD turned entrepreneur. Building AI-powered diagnostics for underserved communities.',
    location: 'Boston, MA',
    skills: ['Healthcare', 'AI/ML', 'Regulatory Affairs', 'Clinical Research'],
    experience: [
      {
        id: 'exp_005',
        company: 'Mass General Hospital',
        role: 'Resident Physician',
        duration: '2018 - 2022',
        description: 'Internal medicine residency with focus on digital health'
      }
    ],
    linkedIn: 'https://linkedin.com/in/emmawilson',
    createdAt: '2024-03-05T00:00:00Z',
    lastActive: '2024-04-01T09:00:00Z'
  },
  {
    id: 'usr_005',
    email: 'david@ecommerce.co',
    password: 'password',
    firstName: 'David',
    lastName: 'Kim',
    avatar: 'https://i.pravatar.cc/150?u=david',
    role: 'founder',
    bio: '3x founder with 2 exits. Building the Shopify for emerging markets.',
    location: 'Austin, TX',
    skills: ['E-commerce', 'Growth Marketing', 'Supply Chain', 'International Expansion'],
    experience: [
      {
        id: 'exp_006',
        company: 'Shopify',
        role: 'Head of International Growth',
        duration: '2017 - 2021',
        description: 'Scaled Shopify to 15 new markets'
      },
      {
        id: 'exp_007',
        company: 'FirstStartup',
        role: 'Founder & CEO',
        duration: '2015 - 2017',
        description: 'Acquired by major retail conglomerate'
      }
    ],
    linkedIn: 'https://linkedin.com/in/davidkim',
    twitter: '@davidkim',
    createdAt: '2024-03-15T00:00:00Z',
    lastActive: '2024-03-30T14:00:00Z'
  }
];

// Registered users for authentication
export const users: User[] = [currentUser, adminUser, ...demoUsers];

// Helper to get user by email
export const getUserByEmail = (email: string): User | undefined => {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

// Helper to check if email exists
export const emailExists = (email: string): boolean => {
  return users.some(u => u.email.toLowerCase() === email.toLowerCase());
};

// Register a new user
export const registerUser = (userData: Omit<User, 'id' | 'createdAt' | 'lastActive'>): User => {
  const newUser: User = {
    ...userData,
    id: `usr_${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  users.push(newUser);
  return newUser;
};

// Update user profile
export const updateUser = (userId: string, updates: Partial<User>): User | undefined => {
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return undefined;
  
  users[index] = { ...users[index], ...updates, lastActive: new Date().toISOString() };
  return users[index];
};

// Pre-onboarded users (skip onboarding)
export const PRE_ONBOARDED_USERS = [
  'alex@techfounder.com',
  'admin@venturemate.io',
  'sarah@designstudio.com',
  'michael@fintech.io',
  'emma@healthtech.com',
  'david@ecommerce.co',
];
