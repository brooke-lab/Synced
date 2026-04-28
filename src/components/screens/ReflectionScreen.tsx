import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Send, Ghost, Check, MessageSquareHeart, Eye, Lock, Unlock, Clock, X, Music, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, where } from 'firebase/firestore';
import { logActivity } from '../../lib/activityLogger';

const INSTRUMENTALS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
];

const LETTER_THEMES = [
  { id: 'vintage', bg: 'bg-[#FDF6E3]', border: 'border-[#E6D2B5]', text: 'text-[#5C4033]', font: 'font-serif' },
  { id: 'rose', bg: 'bg-[#FFF0F5]', border: 'border-[#FFC0CB]', text: 'text-[#D02090]', font: 'font-sans' },
  { id: 'classic', bg: 'bg-[#FFFFFF]', border: 'border-brand/10', text: 'text-text-main', font: 'font-serif' },
];

export default function ReflectionScreen() {
  const { user, couple, partner } = useAuth();
  const [reflections, setReflections] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getWeekId = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  };

  const currentWeek = getWeekId();
  const revealDay = couple?.loveLetterDay ?? 0;
  const today = new Date().getDay();
  const isRevealDay = today === revealDay;

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(
      collection(db, 'couples', couple.id, 'reflections'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setReflections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [couple?.id]);

  useEffect(() => {
    if (selectedLetter && !isMuted) {
      const idx = reflections.indexOf(selectedLetter) % INSTRUMENTALS.length;
      audioRef.current = new Audio(INSTRUMENTALS[idx]);
      audioRef.current.loop = true;
      audioRef.current.play().catch(e => console.log("Audio play blocked"));
    } else {
      audioRef.current?.pause();
      audioRef.current = null;
    }
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [selectedLetter, isMuted, reflections]);

  const sendReflection = async () => {
    if (!content.trim() || !couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'reflections'), {
      coupleId: couple.id,
      authorId: user?.uid,
      content,
      weekOf: currentWeek,
      status: 'unread',
      createdAt: serverTimestamp()
    });

    await logActivity(
      couple.id,
      user?.uid || '',
      'reflection',
      `sealed a new love letter for ${currentWeek}`,
      { currentWeek }
    );

    setContent('');
    setIsTyping(false);
  };

  const markRead = async (r: any) => {
    if (r.authorId === user?.uid || r.status !== 'unread' || !couple?.id) return;
    await updateDoc(doc(db, 'couples', couple.id, 'reflections', r.id), {
      status: 'read'
    });
  };

  const toggleFavorite = async (r: any, e?: any) => {
    if (e) e.stopPropagation();
    if (!couple?.id) return;
    await updateDoc(doc(db, 'couples', couple.id, 'reflections', r.id), {
      isFavorited: !r.isFavorited
    });
    if (selectedLetter?.id === r.id) {
      setSelectedLetter({ ...selectedLetter, isFavorited: !r.isFavorited });
    }
  };

  const userHasWrittenThisWeek = reflections.some(r => r.authorId === user?.uid && r.weekOf === currentWeek);
  const filteredReflections = reflections.filter(r => filter === 'all' || r.isFavorited);
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const partnerName = user?.nicknames?.[partner?.uid || ''] || partner?.displayName || 'My Love';

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-text-main">Love Letters</h1>
          <p className="text-sm opacity-50 italic">Revealed every {DAYS[revealDay]}.</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl glass transition-all ${isMuted ? 'text-gray-400' : 'text-brand'}`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className={`p-2 rounded-xl glass ${isRevealDay ? 'text-brand animate-float' : 'text-gray-300'}`}>
            {isRevealDay ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {!userHasWrittenThisWeek ? (
        !isTyping ? (
          <button
            onClick={() => setIsTyping(true)}
            className="w-full p-8 glass rounded-[40px] flex flex-col items-center justify-center space-y-4 border-dashed border-2 border-brand/20 transition-all hover:border-brand/40 active:scale-95"
          >
            <div className="p-4 bg-brand-soft rounded-full">
              <Heart className="w-10 h-10 text-brand fill-brand/20" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-bold">Write your letter for {currentWeek}</p>
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">Sealed until {DAYS[revealDay]}</p>
            </div>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-6 rounded-[40px] space-y-4 shadow-xl shadow-brand/10"
          >
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Deep breaths. Write from the heart..."
              className="w-full p-4 bg-white/40 rounded-3xl text-sm outline-none resize-none h-48 placeholder:italic font-serif"
            />
            <div className="flex gap-3">
              <button onClick={() => setIsTyping(false)} className="flex-1 py-3 text-sm opacity-50 uppercase tracking-widest font-black">Cancel</button>
              <button
                onClick={sendReflection}
                disabled={!content.trim()}
                className="flex-1 py-3 bg-brand text-white rounded-[24px] text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-brand/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span className="uppercase tracking-widest">Seal Letter</span>
              </button>
            </div>
          </motion.div>
        )
      ) : (
        <div className="glass p-8 rounded-[40px] flex flex-col items-center justify-center text-center space-y-3 opacity-60">
          <Check className="w-8 h-8 text-green-500" />
          <p className="text-sm font-medium">Your letter for this week is sealed.</p>
          <p className="text-[10px] uppercase font-black tracking-tighter opacity-40">Ready for {DAYS[revealDay]}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 mt-8">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold opacity-30">
              <MessageSquareHeart className="w-4 h-4" />
              <span>{filter === 'all' ? 'Shared Journey' : 'Treasured Memories'}</span>
            </div>
            <div className="flex space-x-4 mt-2">
              <button 
                onClick={() => setFilter('all')}
                className={`text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'text-brand' : 'opacity-20'}`}
              >
                Collection
              </button>
              <button 
                onClick={() => setFilter('favorites')}
                className={`text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'favorites' ? 'text-brand' : 'opacity-20'}`}
              >
                Favorites
              </button>
            </div>
          </div>
          {!isRevealDay && filter === 'all' && (
            <div className="flex items-center space-x-1 text-[9px] font-bold text-brand/60 uppercase">
              <Clock className="w-3 h-3" />
              <span>Revealing soon</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {filteredReflections.map((r, i) => {
            const isFromUser = r.authorId === user?.uid;
            const isHistorical = r.weekOf !== currentWeek;
            const canRead = isRevealDay || isHistorical || isFromUser;
            const theme = LETTER_THEMES[i % LETTER_THEMES.length];

            return (
              <motion.div
                layoutId={r.id}
                key={r.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  if (canRead) {
                    setSelectedLetter(r);
                    markRead(r);
                  }
                }}
                className={`relative group cursor-pointer transition-all active:scale-95 ${isFromUser ? 'ml-12' : 'mr-12'}`}
              >
                <div className={`p-8 rounded-[40px] shadow-lg relative overflow-hidden flex flex-col items-center justify-center space-y-3 border-2 ${theme.bg} ${theme.border} min-h-[160px]`}>
                  <div className="absolute top-0 left-0 w-full h-[55%] bg-white/20 backdrop-blur-[1px] rounded-b-[50%] origin-top z-10" />
                  
                  <div className="z-20 flex flex-col items-center">
                    <div className={`p-3 rounded-full mb-2 ${isFromUser ? 'bg-brand/10' : 'bg-blue-100/50'}`}>
                      <Heart className={`w-6 h-6 ${isFromUser ? 'text-brand fill-brand/20' : 'text-blue-400'}`} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      {r.weekOf}
                    </p>
                    <p className="text-xs font-serif italic mt-1 opacity-60">
                      {isFromUser ? 'Shared by You' : `From ${partnerName}`}
                    </p>
                  </div>

                  {r.isFavorited && (
                    <div className="absolute bottom-6 right-8">
                      <Heart className="w-4 h-4 text-brand fill-brand" />
                    </div>
                  )}

                  {!canRead && (
                    <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-sm z-30">
                      <div className="p-3 bg-white/80 rounded-full shadow-sm">
                        <Lock className="w-5 h-5 text-brand/30" />
                      </div>
                    </div>
                  )}

                  {r.status === 'unread' && !isFromUser && canRead && (
                    <div className="absolute top-6 right-6 w-3 h-3 bg-brand rounded-full animate-pulse shadow-sm shadow-brand/50 z-40" />
                  )}
                </div>
              </motion.div>
            );
          })}
          
          {reflections.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center opacity-10 space-y-4 grayscale">
              <Ghost className="w-20 h-20" />
              <p className="font-serif italic text-lg">The story begins with a word.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedLetter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-app/90 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setSelectedLetter(null)}
          >
            <motion.div
              layoutId={selectedLetter.id}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-12 rounded-[50px] shadow-2xl relative overflow-hidden flex flex-col transition-all duration-700 ${LETTER_THEMES[reflections.indexOf(selectedLetter) % LETTER_THEMES.length].bg} ${LETTER_THEMES[reflections.indexOf(selectedLetter) % LETTER_THEMES.length].text}`}
            >
              <div className="absolute -right-8 -top-8 opacity-5 rotate-12">
                <Heart className="w-48 h-48 fill-current" />
              </div>
              
              <button 
                onClick={() => setSelectedLetter(null)}
                className="absolute top-8 right-8 p-3 rounded-full hover:bg-black/5 transition-colors z-20"
              >
                <X className="w-6 h-6 opacity-30" />
              </button>

              <button 
                onClick={() => toggleFavorite(selectedLetter)}
                className="absolute top-8 left-8 p-3 rounded-full hover:bg-black/5 transition-colors z-20"
              >
                <Heart className={`w-6 h-6 ${selectedLetter.isFavorited ? 'text-brand fill-brand' : 'opacity-30'}`} />
              </button>

              <div className="flex flex-col items-center text-center space-y-2 mb-10">
                <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40">
                  {selectedLetter.weekOf}
                </p>
                <div className="w-12 h-px bg-current opacity-20" />
                <p className="text-xl font-serif font-bold">
                  {selectedLetter.authorId === user?.uid ? `To ${partnerName}` : `From ${partnerName}`}
                </p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className={`flex-1 text-lg leading-relaxed italic whitespace-pre-wrap ${LETTER_THEMES[reflections.indexOf(selectedLetter) % LETTER_THEMES.length].font}`}
              >
                {selectedLetter.content}
              </motion.div>

              <div className="mt-12 pt-10 border-t border-current/10 text-center opacity-40">
                <p className="text-[9px] uppercase font-black tracking-widest">
                  Forever • {new Date(selectedLetter.createdAt?.toDate()).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

