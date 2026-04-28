import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { Sparkles, MessageCircle, Heart, Music, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logActivity } from '../../lib/activityLogger';

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

export default function HomeScreen() {
  const { user, couple, partner } = useAuth();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [currentActivity, setCurrentActivity] = useState('Ask each other 5 deep questions');

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

  const shuffleActivity = () => {
    const random = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
    setCurrentActivity(random);
  };

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

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen dotted-grid scanline">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-black text-[#4A4440] uppercase tracking-tighter">Synced</h1>
          <div className="flex items-center space-x-2 text-[10px] font-mono opacity-30">
            <span className="w-2 h-2 bg-brand animate-pulse" />
            <span className="uppercase">Operational_v2.0</span>
          </div>
        </div>
        <div className="flex -space-x-3">
          <Avatar url={user?.photoURL} name="You" size="w-12 h-12 ring-4 ring-[#FAF7F2]" />
          <Avatar url={partner?.photoURL} name={partner?.displayName} size="w-12 h-12 ring-4 ring-[#FAF7F2]" />
        </div>
      </div>

      {/* Live Status Board */}
      {!couple && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-[32px] border border-brand/20 bg-brand/5 flex items-center justify-between tech-border scanline"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-display font-bold uppercase tracking-tight text-brand">Solo_Mode Active</h3>
            <p className="text-[10px] font-mono opacity-60 uppercase tracking-tighter">Pair with partner to unlock shared core</p>
          </div>
          <Heart className="w-5 h-5 text-brand animate-pulse" />
        </motion.div>
      )}

      <section className="grid grid-cols-2 gap-4">
        <StatusCard
          isPartner={false}
          name="You"
          status={user?.status || 'Active'}
          emoji={user?.statusEmoji || '✨'}
          onClick={() => setShowStatusPicker(true)}
        />
        <StatusCard
          isPartner={true}
          name={partner?.displayName || 'Partner'}
          status={partner?.status || 'Offline'}
          emoji={partner?.statusEmoji || '🌙'}
        />
      </section>

      {/* Quote of the Day */}
      <section className="glass p-8 rounded-[40px] relative overflow-hidden group tech-border">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <Sparkles className="w-20 h-20" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="w-1 h-3 bg-brand" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Core_Directive // Daily</span>
          </div>
          <p className="text-2xl font-serif leading-tight italic text-[#5D544F] font-medium tracking-tight">
            "{couple?.quoteOfTheDay?.text || 'Happiness is only real when shared.'}"
          </p>
          <div className="flex items-center space-x-2 text-xs font-mono opacity-50">
            <span>[ SOURCE ]:</span>
            <span className="uppercase">{couple?.quoteOfTheDay?.author || 'Synced_System'}</span>
          </div>
        </div>
      </section>

      {/* Weekly Activity Shuffle */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-brand/5 space-y-6 tech-border">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-brand">
              <Send className="w-4 h-4 rotate-45" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em]">Mission_Direct</h3>
            </div>
            <p className="text-[10px] opacity-30 font-mono">STATUS: PENDING_EXECUTION</p>
          </div>
          <button
            onClick={shuffleActivity}
            className="btn-primary text-[10px] font-mono font-black uppercase tracking-widest text-brand bg-brand/5 hover:bg-brand/10 px-4 py-2 rounded-xl transition-all border border-brand/10"
          >
            [ RE-ROUTE ]
          </button>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentActivity}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 bg-bg-app rounded-3xl border border-black/5 relative group cursor-pointer"
          >
            <div className="absolute top-2 left-2 w-1 h-1 bg-brand opacity-20" />
            <div className="absolute bottom-2 right-2 w-1 h-1 bg-brand opacity-20" />
            <p className="text-lg font-serif font-medium text-center italic leading-tight">
              "{currentActivity}"
            </p>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Quick Interacts */}
      <div className="grid grid-cols-2 gap-4">
        <Box title="Our Music" icon={Music} count="24 Songs" color="bg-brand-soft" />
        <Box title="Messages" icon={MessageCircle} count="2 Private" color="bg-blue-50" />
      </div>

      {/* Status Picker Modal */}
      {showStatusPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-6 bg-black/20 backdrop-blur-sm">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="w-full max-w-sm glass rounded-[40px] p-6 space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-serif">What are you up to?</h3>
              <button onClick={() => setShowStatusPicker(false)} className="text-xs opacity-50">Close</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {STATUS_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => updateStatus(p.label, p.emoji)}
                  className="flex flex-col items-center space-y-2 p-3 hover:bg-white/50 rounded-2xl transition-colors"
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-[10px] font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatusCard({ isPartner, name, status, emoji, onClick }: any) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`p-5 rounded-[32px] flex flex-col space-y-4 cursor-pointer transition-all ${isPartner ? 'glass tech-border' : 'bg-white shadow-sm border border-brand/5'}`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">{name}</span>
          <div className="flex items-center space-x-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isPartner ? 'bg-green-400 animate-pulse' : 'bg-brand shadow-[0_0_8px_rgba(244,114,182,0.5)]'}`} />
            <span className="text-[8px] font-mono opacity-40 uppercase">{isPartner ? 'UPLINK_ON' : 'LOCAL_ON'}</span>
          </div>
        </div>
        <span className="p-2.5 bg-bg-app rounded-2xl text-xl shadow-inner uppercase font-black">{emoji}</span>
      </div>
      <div className="space-y-1">
        <p className="text-base font-display font-bold tracking-tight text-[#4A4440]">{status}</p>
        <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full ${isPartner ? 'bg-green-400' : 'bg-brand'}`} 
          />
        </div>
      </div>
    </motion.div>
  );
}

function Avatar({ url, name, size }: any) {
  return (
    <div className={`${size} rounded-full overflow-hidden bg-gray-200`}>
      {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{name?.[0]}</div>}
    </div>
  );
}

function Box({ title, icon: Icon, count, color }: any) {
  return (
    <div className={`p-6 rounded-[32px] ${color} space-y-4 border border-white/40 shadow-sm group cursor-pointer hover:scale-[1.02] transition-all active:scale-[0.98]`}>
      <div className="w-10 h-10 rounded-2xl bg-white/50 flex items-center justify-center text-text-main group-hover:text-brand transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4A4440]">{title}</h4>
        <div className="flex items-center space-x-2">
          <span className="text-lg font-display font-bold tracking-tight">{count.split(' ')[0]}</span>
          <span className="text-[10px] opacity-40 font-mono uppercase tracking-tighter">{count.split(' ')[1]}</span>
        </div>
      </div>
    </div>
  );
}
