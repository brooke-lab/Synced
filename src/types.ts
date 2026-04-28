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
}

export interface Couple {
  id: string;
  members: string[];
  anniversary?: string;
  anniversaryMessage?: string;
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
  status: 'unread' | 'read' | 'responded';
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

export interface WeeklyActivity {
  id: string;
  coupleId: string;
  title: string;
  completed: boolean;
  weekOf: string;
}
