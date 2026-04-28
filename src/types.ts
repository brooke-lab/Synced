export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  status?: string;
  statusEmoji?: string;
  partnerId?: string;
  coupleId?: string;
  lastSeen?: string;
  nicknames?: Record<string, string>;
}

export interface Couple {
  id: string;
  members: string[];
  anniversary?: string;
  anniversaryMessage?: string;
  loveLetterDay?: number; // 0-6 (Sunday-Saturday)
  quoteOfTheDay?: {
    text: string;
    author: string;
  };
  theme?: string;
}

export interface MusicDedication {
  id: string;
  fromId: string;
  toId: string;
  songTitle: string;
  artist: string;
  coverUrl?: string;
  spotifyUrl?: string;
  message?: string;
  createdAt: any;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: 'shared' | 'individual';
  ownerId?: string;
  coupleId: string;
  progress: number;
  deadline?: string;
  completed: boolean;
}

export interface Plan {
  id: string;
  title: string;
  description?: string;
  date: any;
  type: 'date' | 'event' | 'occasion';
  coupleId: string;
}

export interface Reflection {
  id: string;
  authorId: string;
  coupleId: string;
  content: string;
  weekOf: string; // YYYY-WW format
  status: 'unread' | 'read' | 'responded';
  isFavorited?: boolean;
  response?: string;
  createdAt: any;
}

export interface VisionBoardPin {
  id: string;
  coupleId: string;
  ownerId: string;
  boardType: 'shared' | 'individual';
  imageUrl: string;
  note?: string;
  createdAt: any;
}

export interface Movie {
  id: string;
  title: string;
  posterUrl?: string;
  year?: string;
  coupleId: string;
  addedBy: string;
  watched: boolean;
  createdAt: any;
}

export interface WeeklyActivity {
  id: string;
  coupleId: string;
  title: string;
  completed: boolean;
  weekOf: string;
}
