import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { Sparkles, MessageCircle, Heart, Music, Send, Target, Calendar, X, Clock, Image as ImageIcon, Film, User, Edit3, Plus, MoreHorizontal, MessageSquare, ThumbsUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot, limit, addDoc, deleteDoc, getDocs, where, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logActivity } from '../../lib/activityLogger';
import { Activity } from '../../types';

const ZODIAC_EMOJIS: Record<string, string> = {
  'Aries': '♈️', 'Taurus': '♉️', 'Gemini': '♊️', 'Cancer': '♋️', 'Leo': '♌️', 'Virgo': '♍️',
  'Libra': '♎️', 'Scorpio': '♏️', 'Sagittarius': '♐️', 'Capricorn': '♑️', 'Aquarius': '♒️', 'Pisces': '♓️'
};

const STATUS_PRESETS = [
  { label: 'Studying', emoji: '📚' },
  { label: 'Reading', emoji: '📖' },
  { label: 'Busy', emoji: '🤫' },
  { label: 'Relaxing', emoji: '☁️' },
  { label: 'Working', emoji: '💻' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Cooking', emoji: '🥗' },
  { label: 'Gym', emoji: '💪' },
];

export default function HomeScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { user, couple, partner } = useAuth();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingMission, setIsGeneratingMission] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [cosmicInsight, setCosmicInsight] = useState<string | null>(null);
  const [isSyncingCosmos, setIsSyncingCosmos] = useState(false);
  const [isPoking, setIsPoking] = useState(false);
  const [showPokeEffect, setShowPokeEffect] = useState(false);
  const [studyTimer, setStudyTimer] = useState<number>(0);
  const [isSyncingMemo, setIsSyncingMemo] = useState(false);
  const [memoText, setMemoText] = useState('');
  
  const ACTIVITIES = [
    'Watch a movie together',
    'Ask each other 5 deep questions',
    'Cook a new recipe together',
    'Go for a sunrise walk',
    'Write a letter to your future selves',
    'Digital detox for 4 hours together',
    'Recreate your first date',
    'Give each other a relaxing massage'
  ];

  useEffect(() => {
    if (!couple?.id) return;

    const q = query(
      collection(db, 'couples', couple.id, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [couple?.id]);

  useEffect(() => {
    if (!couple?.studySession?.isActive || !couple.studySession.startTime) {
      setStudyTimer(0);
      return;
    }

    const interval = setInterval(() => {
      const start = couple.studySession.startTime.toDate ? couple.studySession.startTime.toDate() : new Date(couple.studySession.startTime);
      const diff = Math.floor((new Date().getTime() - start.getTime()) / 1000);
      const remaining = (couple.studySession.duration * 60) - diff;
      
      if (remaining <= 0) {
        setStudyTimer(0);
        clearInterval(interval);
      } else {
        setStudyTimer(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [couple?.studySession]);

  useEffect(() => {
    if (!couple?.id || !user?.uid) return;
    
    const pokeQuery = query(
      collection(db, 'couples', couple.id, 'pokes'),
      where('toId', '==', user.uid),
      where('seen', '==', false),
      limit(1)
    );

    const unsubscribe = onSnapshot(pokeQuery, (snap) => {
      if (!snap.empty) {
        setShowPokeEffect(true);
        setTimeout(() => setShowPokeEffect(false), 3000);
        // Mark as seen
        snap.docs.forEach(d => updateDoc(d.ref, { seen: true }));
      }
    });

    return () => unsubscribe();
  }, [couple?.id, user?.uid]);

  const sendPoke = async () => {
    if (!user || !partner || !couple?.id) return;
    setIsPoking(true);
    try {
      await addDoc(collection(db, 'couples', couple.id, 'pokes'), {
        fromId: user.uid,
        toId: partner.uid,
        createdAt: serverTimestamp(),
        seen: false,
        type: 'neural_spark'
      });
      setTimeout(() => setIsPoking(false), 1000);
    } catch (e) {
      console.error(e);
      setIsPoking(false);
    }
  };

  const startStudySession = async (type: 'focus' | 'break', duration: number) => {
    if (!couple?.id || !user?.uid) return;
    await updateDoc(doc(db, 'couples', couple.id), {
      studySession: {
        isActive: true,
        startTime: serverTimestamp(),
        duration,
        type,
        startedBy: user.uid
      }
    });
    
    await logActivity(
      couple.id,
      user.uid,
      'status',
      `started a shared ${type === 'focus' ? 'Deep Work' : 'Refuel'} session 🧬`,
      { duration, type }
    );
  };

  const stopStudySession = async () => {
    if (!couple?.id) return;
    await updateDoc(doc(db, 'couples', couple.id), {
      'studySession.isActive': false
    });
  };

  const updateBrainBattery = async (val: number) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { brainBattery: val });
  };

  const updateMemo = async () => {
    if (!couple?.id || !user?.uid) return;
    setIsSyncingMemo(true);
    await updateDoc(doc(db, 'couples', couple.id), {
      sharedMemo: memoText,
      memoUpdatedBy: user.uid,
      memoUpdatedAt: serverTimestamp()
    });
    setIsSyncingMemo(false);
  };

  useEffect(() => {
    if (couple?.sharedMemo) {
      setMemoText(couple.sharedMemo);
    }
  }, [couple?.sharedMemo]);

  const shuffleActivity = async () => {
    if (!couple?.id) return;
    setIsGeneratingMission(true);
    try {
      const prompt = `Generate a unique, romantic mission or shared activity for a couple. 
      Focus on building connection, creating memories, and having fun together.
      Current focus state: ${user?.isFocused ? 'User is working hard' : 'User is relaxed'}.
      Partner focus state: ${partner?.isFocused ? 'Partner is working hard' : 'Partner is relaxed'}.
      Keep it short (max 12 words). Examples: "Sunset walk with hot cocoa", "Digital detox date night", "Morning message scavenger hunt".`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const mission = result.text?.trim();

      await updateDoc(doc(db, 'couples', couple.id), {
        suggestedActivity: mission
      });
    } catch (e) {
      const random = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
      await updateDoc(doc(db, 'couples', couple.id), {
        suggestedActivity: random
      });
    } finally {
      setIsGeneratingMission(false);
    }
  };

  const currentActivity = couple?.suggestedActivity || 'Ask each other 5 deep questions';

  const syncCosmos = async () => {
    if (!user?.zodiacSign || !partner?.zodiacSign) return;
    setIsSyncingCosmos(true);
    try {
      const prompt = `Act as the Digital Logic Oracle, a high-performance mentor for a visionary couple.
      User 1 Sign: ${user.zodiacSign}
      User 2 Sign: ${partner.zodiacSign}
      
      Generate a daily 'Cosmic Logic' alignment horoscope. 
      Tone: High-utility, sharp, stoic, and hyper-focused, yet with a Y2K aesthetic.
      Context: We are high-performing individuals (Life Path 7) obsessed with our shared growth and long-term evolutionary goals.
      Requirement: One specific, structured prompt covering our combined emotional/analytical state for the day.
      Length: Max 35 words. Use emojis like ✨, 🧬, 🧪, 🔮.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const insight = result.text?.trim();
      setCosmicInsight(insight);
      
      // Optionally store in the couple doc for the day
      if (couple?.id) {
        await updateDoc(doc(db, 'couples', couple.id), {
          lastCosmicInsight: insight,
          lastCosmicSync: serverTimestamp()
        });
      }
    } catch (e) {
      console.error(e);
      setCosmicInsight("The stars are currently occluded by digital static. Attempting realignment...");
    } finally {
      setIsSyncingCosmos(false);
    }
  };

  useEffect(() => {
    if (couple?.lastCosmicInsight) {
      setCosmicInsight(couple.lastCosmicInsight);
    }
  }, [couple?.lastCosmicInsight]);

  const updateStatus = async (label: string, emoji: string) => {
    if (!user || !couple?.id) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      status: label,
      statusEmoji: emoji,
      lastSeen: serverTimestamp()
    });
    
    await logActivity(
      couple.id,
      user.uid,
      'status',
      `is now ${label} ${emoji}`,
      { label, emoji }
    );

    setShowStatusPicker(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music className="w-4 h-4" />;
      case 'gallery': return <ImageIcon className="w-4 h-4" />;
      case 'goal': return <Target className="w-4 h-4" />;
      case 'plan': return <Calendar className="w-4 h-4" />;
      case 'reflection': return <Edit3 className="w-4 h-4" />;
      case 'status': return <User className="w-4 h-4" />;
      case 'movie': return <Film className="w-4 h-4" />;
      case 'nickname': return <Heart className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getActorInfo = (userId: string) => {
    if (userId === user?.uid) return { name: 'You', photo: user.photoURL };
    return { name: partner?.displayName || 'Partner', photo: partner?.photoURL };
  };

  const handleLike = async (activityId: string, likedBy: string[] = []) => {
    if (!user || !couple?.id) return;
    const activityRef = doc(db, 'couples', couple.id, 'activities', activityId);
    const isLiked = likedBy.includes(user.uid);
    
    await updateDoc(activityRef, {
      likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleReply = async (activityId: string) => {
    if (!user || !couple?.id || !replyText.trim()) return;
    const activityRef = doc(db, 'couples', couple.id, 'activities', activityId);
    
    const newReply = {
      id: Math.random().toString(36).substring(7),
      userId: user.uid,
      text: replyText,
      createdAt: new Date()
    };
    
    await updateDoc(activityRef, {
      replies: arrayUnion(newReply)
    });
    
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="min-h-screen pb-40 bg-bg-app overflow-x-hidden">
      {/* Poke Effect Overlay */}
      <AnimatePresence>
        {showPokeEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] pointer-events-none flex items-center justify-center bg-brand/5 backdrop-blur-[2px]"
          >
            <motion.div
              animate={{ 
                scale: [1, 2, 1],
                rotate: [0, 10, -10, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 0.8, repeat: 2 }}
              className="relative"
            >
              <Heart className="w-32 h-32 text-brand fill-brand glow-brand-strong" />
              <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full animate-pulse" />
            </motion.div>
            <p className="absolute bottom-1/4 text-brand font-mono font-black uppercase tracking-[0.5em] glow-brand animate-bounce">Neural_Spark_Recieved</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Top Bar */}
      <div className="sticky top-0 z-[60] py-6 px-6 md:px-10 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
          <h1 className="text-3xl md:text-4xl font-display font-black text-text-main uppercase tracking-[-0.05em] cursor-default transition-all group-hover:glow-text-white">Synced</h1>
          <p className="text-[10px] font-mono font-bold text-brand uppercase tracking-[0.4em] opacity-60">Connected // Resonance_Active</p>
        </div>
        <div className="flex items-center space-x-4 md:space-x-6 pointer-events-auto">
          <button onClick={() => onNavigate('plans')} className="p-3 bg-black/5 rounded-2xl hover:bg-black/10 transition-all active:scale-95 group">
            <Calendar className="w-5 h-5 text-text-main/40 group-hover:text-brand transition-colors" />
          </button>
          <button onClick={() => onNavigate('profile')} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand to-blue-500 rounded-full opacity-20 group-hover:opacity-40 blur transition-opacity" />
            <div className="relative p-0.5 bg-white rounded-full">
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
              ) : (
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/5 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="px-6 md:px-8 space-y-12 max-w-2xl mx-auto">
        {/* Stories / Presence Bar - Re-imagined as "Hyper-Presence" */}
        <div className="flex items-center space-x-10 px-2">
          <StoryCircle 
            name={user?.displayName?.split(' ')[0] || 'You'} 
            emoji={user?.statusEmoji || '✨'} 
            photo={user?.photoURL} 
            active={true}
            onClick={() => setShowStatusPicker(true)}
            status={user?.status}
            lastSeen={user?.lastSeen}
            isMe={true}
            isFocused={user?.isFocused}
          />
          
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-black/5 to-transparent" />
          
          <StoryCircle 
            name={partner?.displayName?.split(' ')[0] || 'Partner'} 
            emoji={partner?.statusEmoji || '🌙'} 
            photo={partner?.photoURL} 
            active={!!partner}
            status={partner?.status}
            lastSeen={partner?.lastSeen}
            isFocused={partner?.isFocused}
          />

          <div className="flex-1 flex flex-col items-end justify-center space-y-2 pr-2">
            <button
              onClick={async () => {
                if (!user) return;
                const newStatus = !(user?.isFocused);
                await updateDoc(doc(db, 'users', user.uid), { 
                  isFocused: newStatus,
                  status: newStatus ? 'Deep Work' : (user.status === 'Deep Work' ? 'Available' : user.status),
                  statusEmoji: newStatus ? '🧠' : (user.statusEmoji === '🧠' ? '✨' : user.statusEmoji)
                });
                if (couple?.id) {
                  await logActivity(couple.id, user.uid, 'status', newStatus ? 'entered Deep Work mode 🧠' : 'is now available', { isFocused: newStatus });
                }
              }}
              className={`px-5 py-2.5 rounded-2xl text-[9px] font-mono font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                user?.isFocused ? 'bg-green-400 text-white shadow-lg shadow-green-400/20 shadow-inner' : 'bg-black/5 text-text-main/40 hover:bg-brand/10 hover:text-brand'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${user?.isFocused ? 'bg-white animate-pulse' : 'bg-current opacity-40'}`} />
              <span>{user?.isFocused ? 'Focus_Active' : 'Trigger_Focus'}</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={sendPoke}
                disabled={isPoking}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-brand/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isPoking ? 'opacity-100 animate-ping' : ''}`} />
                <div className="relative p-2 bg-white/5 rounded-xl border border-white/10 hover:border-brand/40 transition-colors">
                  <Heart className={`w-3 h-3 ${isPoking ? 'text-brand fill-brand scale-125' : 'text-white/20 group-hover:text-brand'} transition-all`} />
                </div>
              </button>
              <div className="flex items-center space-x-2 opacity-20">
                <span className="text-[8px] font-mono font-black uppercase text-text-main">
                  {user?.isFocused && partner?.isFocused ? 'Hyper_Sync' : 'Neural_Link'}
                </span>
                <div className={`w-1 h-1 rounded-full ${user?.isFocused && partner?.isFocused ? 'bg-green-400 animate-ping' : 'bg-brand'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Home Feed */}
        <div className="space-y-10">
          {/* Study Session Widget */}
          <AnimatePresence>
            {couple?.studySession?.isActive && (
              <motion.section
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card-neo !p-6 bg-green-400/[0.03] border-green-400/20 shadow-xl shadow-green-400/5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-400 blur-md opacity-20 animate-pulse" />
                      <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center text-green-400 font-mono font-black relative z-10 border border-green-400/20">
                        {Math.floor(studyTimer / 60)}:{(studyTimer % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-mono font-black uppercase text-green-400 tracking-[0.3em] glow-brand">
                        {couple.studySession.type === 'focus' ? 'Deep_Logic_State' : 'Neural_Recovery'}
                      </h4>
                      <p className="text-[9px] font-mono text-white/40 uppercase mt-0.5">
                        Started by {couple.studySession.startedBy === user?.uid ? 'You' : (partner?.displayName || 'Partner')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-end space-y-1 px-4 border-r border-white/10">
                       <span className="text-[8px] font-mono text-white/20 uppercase">Global_Sync</span>
                       <div className="flex -space-x-2">
                         {user?.photoURL && <img src={user.photoURL} className="w-6 h-6 rounded-lg border border-white/20" />}
                         {partner?.photoURL && <img src={partner.photoURL} className="w-6 h-6 rounded-lg border border-white/20" />}
                       </div>
                    </div>
                    <button 
                      onClick={stopStudySession}
                      className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30 hover:bg-red-500/30 transition-all font-mono font-black text-[10px] uppercase tracking-widest"
                    >
                      ABORT
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Daily Directive Card */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-brand/10 to-transparent blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="card-neo relative overflow-hidden bg-white/[0.02] border border-brand/20 shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-[1px] overflow-hidden opacity-50">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-brand to-transparent animate-shimmer" />
              </div>
              
              <div className="space-y-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 bg-brand animate-pulse rounded-full glow-brand-strong" />
                    <span className="text-[11px] font-mono uppercase tracking-[0.5em] text-brand font-black glow-brand">Couple_Mission</span>
                  </div>
                  <button 
                    onClick={shuffleActivity} 
                    disabled={isGeneratingMission}
                    className="p-4 bg-brand/20 hover:bg-brand/30 rounded-3xl transition-all disabled:opacity-50 border border-brand/30 glow-brand"
                  >
                    {isGeneratingMission ? (
                      <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-brand glow-brand-strong" />
                    )}
                  </button>
                </div>
                <h2 className="text-5xl font-serif italic text-text-main font-medium tracking-[-0.03em] leading-[1.05] pr-6 glow-text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  “{currentActivity}”
                </h2>
                <div className="flex items-center justify-between pt-6 border-t border-white/[0.03]">
                  <div className="flex items-center space-x-6">
                    <div className="h-[1px] w-12 bg-brand/30" />
                    <p className="text-[10px] font-mono font-bold uppercase text-brand/40 tracking-[0.4em]">Resonance_Module</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Neural Memo Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center space-x-4 px-2 opacity-40">
              <span className="w-8 h-[1.5px] bg-text-main" />
              <h3 className="text-[9px] font-mono font-black uppercase tracking-[0.6em] text-text-main">Neural_Memo</h3>
            </div>
            
            <div className="card-neo !p-8 relative group overflow-hidden bg-white/[0.01]">
              <div className="relative z-10 flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-4 text-[10px] font-mono text-white/30 font-bold uppercase tracking-[0.4em]">
                     <Edit3 className="w-3 h-3" />
                     <span>Shared_Thoughts</span>
                   </div>
                   <button 
                     onClick={updateMemo}
                     disabled={isSyncingMemo}
                     className="px-4 py-2 bg-brand/20 text-brand rounded-xl text-[9px] font-mono font-black uppercase tracking-widest border border-brand/30 glow-brand active:scale-95 transition-all"
                   >
                     {isSyncingMemo ? 'Syncing...' : 'Broadcast'}
                   </button>
                </div>
                <textarea 
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  placeholder="Drop a quick note, reminder, or love message for your partner..."
                  className="w-full bg-transparent border-none outline-none text-sm font-display text-text-main placeholder:text-white/10 resize-none h-24 italic leading-relaxed"
                />
                {couple?.memoUpdatedAt && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-white/5 opacity-30">
                    <Clock className="w-3 h-3" />
                    <span className="text-[8px] font-mono uppercase font-black">
                      Last update by {couple.memoUpdatedBy === user?.uid ? 'System' : 'Partner'} // {new Date(couple.memoUpdatedAt?.toDate ? couple.memoUpdatedAt.toDate() : couple.memoUpdatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* Cosmic Alignment Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center space-x-4 px-2 opacity-40">
              <span className="w-8 h-[1.5px] bg-text-main" />
              <h3 className="text-[9px] font-mono font-black uppercase tracking-[0.6em] text-text-main">Cosmic_Alignment</h3>
            </div>

            <div className="card-neo !p-10 space-y-8 bg-white/[0.01] border-brand/20 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(193,18,31,0.03),transparent)] opacity-50" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex -space-x-4">
                  <div className="w-14 h-14 bg-white/[0.03] backdrop-blur-xl rounded-[20px] flex items-center justify-center text-3xl shadow-xl z-20 border border-white/10 transition-transform duration-500">
                    <span className="opacity-80">
                      {ZODIAC_EMOJIS[user?.zodiacSign || ''] || '✨'}
                    </span>
                  </div>
                  <div className="w-14 h-14 bg-white/[0.03] backdrop-blur-xl rounded-[20px] flex items-center justify-center text-3xl shadow-xl z-10 border border-white/10 transition-transform duration-500">
                    <span className="opacity-80">
                      {ZODIAC_EMOJIS[partner?.zodiacSign || ''] || '🌙'}
                    </span>
                  </div>
                </div>
                {user?.zodiacSign && partner?.zodiacSign ? (
                  <button 
                    onClick={syncCosmos}
                    disabled={isSyncingCosmos}
                    className="p-4 bg-brand text-white rounded-[24px] shadow-lg shadow-brand/20 active:scale-95 hover:scale-105 transition-all disabled:opacity-50 border border-white/10"
                  >
                    {isSyncingCosmos ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-6 h-6 opacity-80" />
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={() => onNavigate('profile')}
                    className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-brand bg-brand/5 px-6 py-3 rounded-xl border border-brand/20 hover:bg-brand/10 transition-all"
                  >
                    Calibrate_Sign
                  </button>
                ) }
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-px bg-brand/40" />
                  <span className="text-[9px] font-mono font-bold text-brand/60 uppercase tracking-[0.5em]">Cosmic_Drift // Insight</span>
                </div>
                {cosmicInsight ? (
                  <p className="text-2xl font-serif italic text-text-main/90 leading-relaxed pr-8 selection:bg-brand selection:text-white">
                    “{cosmicInsight}”
                  </p>
                ) : (
                  <div className="space-y-4 opacity-[0.03]">
                    <div className="h-5 w-full bg-white rounded-full animate-pulse" />
                    <div className="h-5 w-3/4 bg-white rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* Social Feed Items */}
          <div className="space-y-12">
            <AnimatePresence>
              {activities.map((activity, i) => {
                const actor = getActorInfo(activity.userId);
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="group"
                  >
                    <div className="flex items-start space-x-6">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-black/5 shadow-2xl transition-transform group-hover:scale-110">
                          {actor.photo ? (
                            <img src={actor.photo} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all" />
                          ) : (
                            <div className="w-full h-full bg-black/5 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="w-px flex-1 bg-gradient-to-b from-black/5 via-black/[0.02] to-transparent" />
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-mono font-black uppercase text-brand tracking-widest">
                              {actor.name} // {activity.type}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-text-main/20 uppercase">
                              {activity.createdAt?.toDate ? new Date(activity.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Realtime'}
                            </span>
                          </div>
                          <div className="p-2.5 bg-black/[0.03] rounded-xl text-text-main/30 group-hover:text-brand transition-colors">
                            {getActivityIcon(activity.type)}
                          </div>
                        </div>

                        <div className="card-neo border-transparent hover:border-black/[0.05] !p-0 overflow-hidden bg-white/50">
                          <div className="p-8 space-y-6">
                            <p className="text-xl font-display font-medium text-text-main/80 leading-relaxed">
                              {activity.content}
                            </p>

                            {/* Rich Content Previews */}
                            {activity.type === 'music' && activity.metadata?.coverUrl && (
                              <div className="flex items-center space-x-6 p-6 bg-black/[0.02] rounded-[32px] border border-black/[0.03] group/music cursor-pointer hover:bg-black/[0.05] transition-all">
                                <div className="relative">
                                  {activity.metadata?.coverUrl && <img src={activity.metadata.coverUrl} className="w-20 h-20 rounded-2xl object-cover shadow-2xl transition-transform group-hover/music:scale-105" />}
                                  <div className="absolute inset-0 bg-brand/10 rounded-2xl mix-blend-overlay" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-text-main truncate">{activity.metadata.songTitle}</p>
                                  <p className="text-[10px] font-mono font-bold text-text-main/40 uppercase truncate mt-1">{activity.metadata.artist}</p>
                                  <div className="mt-4 flex items-center space-x-2">
                                    <div className="flex space-x-0.5">
                                      {[1, 2, 3].map(j => <div key={j} className="w-1 h-3 bg-brand/40 rounded-full animate-pulse" style={{ animationDelay: `${j * 0.2}s` }} />)}
                                    </div>
                                    <span className="text-[8px] font-mono font-black uppercase tracking-widest text-brand/60">Frequency Syncing</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {activity.type === 'gallery' && activity.metadata?.url && (
                              <div className="rounded-[40px] overflow-hidden aspect-[4/5] bg-black/5 relative group/media">
                                {activity.metadata.type === 'image' ? (
                                  activity.metadata.url && <img src={activity.metadata.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover/media:scale-110" />
                                ) : (
                                  activity.metadata.url && <video src={activity.metadata.url} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/media:opacity-100 transition-all duration-500" />
                                <div className="absolute bottom-6 left-6 opacity-0 group-hover/media:opacity-100 transition-all translate-y-4 group-hover/media:translate-y-0 delay-100">
                                  <span className="text-[10px] font-mono font-black uppercase text-white tracking-[0.3em]">Moment Captured</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="px-8 py-6 bg-black/[0.02] border-t border-black/[0.03] flex items-center space-x-10">
                            <button 
                              onClick={() => handleLike(activity.id, activity.likedBy)}
                              className="flex items-center space-x-2 group/btn"
                            >
                              <Heart className={`w-5 h-5 transition-all active:scale-150 ${activity.likedBy?.includes(user?.uid || '') ? 'text-brand fill-brand' : 'text-text-main/20 group-hover/btn:text-brand'}`} />
                              <span className="text-[10px] font-mono font-black uppercase text-text-main/40 group-hover/btn:text-text-main">
                                {activity.likedBy?.length || 0}
                              </span>
                            </button>
                            <button 
                              onClick={() => setReplyingTo(replyingTo === activity.id ? null : activity.id)}
                              className="flex items-center space-x-2 group/btn"
                            >
                              <MessageSquare className="w-5 h-5 text-text-main/20 group-hover/btn:text-text-main transition-colors" />
                              <span className="text-[10px] font-mono font-black uppercase text-text-main/40 group-hover/btn:text-text-main">
                                {activity.replies?.length || 0}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Replies List */}
                        <AnimatePresence>
                          {activity.replies && activity.replies.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="space-y-4 pl-4 border-l-[1.5px] border-black/[0.03] pt-2"
                            >
                              {activity.replies.map((reply) => {
                                const replier = getActorInfo(reply.userId);
                                return (
                                  <div key={reply.id} className="flex items-start space-x-4">
                                    {replier.photo ? (
                                      <img src={replier.photo} className="w-7 h-7 rounded-lg object-cover grayscale-[0.4]" />
                                    ) : (
                                      <div className="w-7 h-7 rounded-lg bg-black/5 flex items-center justify-center">
                                        <User className="w-4 h-4 text-gray-300" />
                                      </div>
                                    )}
                                    <div className="flex-1 glass px-5 py-3 rounded-2xl">
                                      <p className="text-[10px] font-mono font-black text-brand uppercase tracking-tighter">{replier.name}</p>
                                      <p className="text-sm text-text-main/70 mt-1">{reply.text}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Reply Input */}
                        {replyingTo === activity.id && (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="pt-2 flex items-center space-x-3 pl-4"
                          >
                            <div className="flex-1 relative">
                              <input 
                                autoFocus
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Transmit response..."
                                className="w-full bg-white/50 border border-black/5 rounded-2xl px-6 py-3 text-xs outline-none focus:border-brand/40 focus:bg-white transition-all font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && handleReply(activity.id)}
                              />
                            </div>
                            <button 
                              onClick={() => handleReply(activity.id)}
                              className="p-3 bg-brand text-white rounded-2xl shadow-xl shadow-brand/20 active:scale-95 transition-all"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {activities.length === 0 && !loading && (
              <div className="py-32 text-center space-y-6">
                <div className="w-20 h-20 bg-brand/5 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Heart className="w-8 h-8 text-brand/40" />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-mono font-black uppercase tracking-[0.5em] text-text-main opacity-20">No data streams found</p>
                  <p className="text-xs font-serif italic text-text-main opacity-40">Collaborate to generate shared history.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Picker Modal */}
      <AnimatePresence>
        {showStatusPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-md" onClick={() => setShowStatusPicker(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm glass rounded-[32px] md:rounded-[48px] p-6 md:p-10 space-y-8 md:space-y-10 border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-display font-black uppercase tracking-tight">Status Update</h3>
                  <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.4em] font-black text-brand">Status_Config // Active</p>
                </div>
                <button 
                  onClick={() => setShowStatusPicker(false)} 
                  className="p-3 bg-black/5 rounded-2xl text-text-main/20 hover:text-text-main transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 md:gap-6">
                {STATUS_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => updateStatus(p.label, p.emoji)}
                    className="flex flex-col items-center space-y-2 md:space-y-4 p-2.5 md:p-4 hover:bg-brand/10 rounded-2xl md:rounded-[32px] transition-all border border-transparent hover:border-brand/20 group"
                  >
                    <span className="text-2xl md:text-4xl group-hover:scale-125 transition-transform duration-500">{p.emoji}</span>
                    <span className="text-[7px] md:text-[8px] font-mono uppercase tracking-[0.1em] font-black text-text-main opacity-30 group-hover:opacity-100">{p.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center px-2">
                  <p className="text-[9px] md:text-[10px] font-mono font-black uppercase tracking-[0.4em] text-brand">Brain_Battery</p>
                  <span className="text-[9px] md:text-[10px] font-mono font-black text-text-main/40">{user?.brainBattery || 100}%</span>
                </div>
                <div className="px-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={user?.brainBattery || 100}
                    onChange={(e) => updateBrainBattery(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand"
                  />
                  <div className="flex justify-between mt-2 opacity-20 text-[7px] md:text-[8px] font-mono uppercase font-black">
                    <span>Critical</span>
                    <span>Optimized</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <p className="text-[9px] md:text-[10px] font-mono font-black uppercase tracking-[0.4em] text-text-main/40 px-2">Shared_Sessions</p>
                <div className="grid grid-cols-2 gap-3 md:gap-4 px-1">
                  <button 
                    onClick={() => { startStudySession('focus', 25); setShowStatusPicker(false); }}
                    className="p-3 md:p-4 bg-green-400/10 border border-green-400/20 text-green-400 rounded-2xl md:rounded-3xl text-[9px] md:text-[10px] font-mono font-black uppercase tracking-widest hover:bg-green-400/20 transition-all"
                  >
                    Focus
                  </button>
                  <button 
                    onClick={() => { startStudySession('break', 5); setShowStatusPicker(false); }}
                    className="p-3 md:p-4 bg-brand/10 border border-brand/20 text-brand rounded-2xl md:rounded-3xl text-[9px] md:text-[10px] font-mono font-black uppercase tracking-widest hover:bg-brand/20 transition-all"
                  >
                    Break
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StoryCircle({ name, emoji, photo, active, onClick, status, lastSeen, isMe, isFocused }: any) {
  const timeAgo = (date: any) => {
    if (!date) return null;
    const seconds = Math.floor((new Date().getTime() - date.toDate().getTime()) / 1000);
    if (seconds < 60) return 'NOW';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}M`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}H`;
    return null;
  };

  const activityTime = timeAgo(lastSeen);

  return (
    <div className="flex flex-col items-center space-y-4 shrink-0 group">
      <motion.div 
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className="relative"
      >
        <div className={`p-1.5 rounded-[28px] border-2 transition-all duration-700 ${isFocused ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)] scale-110' : active ? 'border-brand shadow-2xl shadow-brand/20 scale-110' : 'border-black/5 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}>
          <div className="w-18 h-18 rounded-[22px] overflow-hidden bg-white border border-black/5 relative group shrink-0 shadow-inner">
            {photo ? (
              <img src={photo} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-mono opacity-20 uppercase font-black">{name[0]}</div>
            )}
            <div className={`absolute inset-0 flex items-center justify-center ${isFocused ? 'bg-green-400/20' : 'bg-brand/20'} opacity-0 group-hover:opacity-100 transition-opacity`}>
              <span className="text-2xl drop-shadow-2xl">{isFocused ? '🧠' : emoji}</span>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {(status || isFocused) && (
            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`absolute -bottom-1 -right-1 w-9 h-9 bg-white rounded-2xl flex items-center justify-center shadow-2xl text-xl z-10 border border-black/5 ${isFocused ? 'ring-2 ring-green-400' : ''}`}
            >
              {isFocused ? '🧠' : emoji}
            </motion.div>
          )}
        </AnimatePresence>
        
        {isMe && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand text-white rounded-lg flex items-center justify-center shadow-lg z-10">
            <Plus className="w-3 h-3" />
          </div>
        )}
      </motion.div>
      <div className="flex flex-col items-center space-y-0.5">
        <span className="text-[10px] font-mono font-black uppercase tracking-tighter text-text-main group-hover:text-brand transition-colors">{name}</span>
        {activityTime && (
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 rounded-full bg-brand animate-pulse" />
            <span className="text-[8px] font-mono font-black text-text-main/40">{activityTime}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
