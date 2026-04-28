import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { Sparkles, MessageCircle, Heart, Music, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      status: label,
      statusEmoji: emoji,
      lastSeen: serverTimestamp()
    });
    setShowStatusPicker(false);
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-[#4A4440]">Synced</h1>
        <div className="flex -space-x-2">
          <Avatar url={user?.photoURL} name="You" size="w-10 h-10" />
          <Avatar url={partner?.photoURL} name={partner?.displayName} size="w-10 h-10 border-2 border-[#FAF7F2]" />
        </div>
      </div>

      {/* Live Status Board */}
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
      <section className="glass p-8 rounded-[40px] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles className="w-16 h-16" />
        </div>
        <div className="space-y-4">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold opacity-50">Quote of the Day</span>
          <p className="text-xl font-serif leading-relaxed italic text-[#5D544F]">
            "{couple?.quoteOfTheDay?.text || 'Happiness is only real when shared.'}"
          </p>
          <p className="text-sm font-medium opacity-60">— {couple?.quoteOfTheDay?.author || 'Synced'}</p>
        </div>
      </section>

      {/* Weekly Activity Shuffle */}
      <section className="bg-white p-6 rounded-[40px] shadow-sm border border-brand-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Send className="w-4 h-4 text-brand rotate-45" />
            <h3 className="text-sm font-bold">Weekly Activity</h3>
          </div>
          <button
            onClick={shuffleActivity}
            className="text-[10px] font-black uppercase tracking-widest text-brand bg-brand-soft px-3 py-1 rounded-full"
          >
            Shuffle
          </button>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentActivity}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 bg-bg-app rounded-3xl border border-brand/10"
          >
            <p className="text-sm font-medium text-center italic">"{currentActivity}"</p>
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
      className={`p-4 rounded-3xl flex flex-col space-y-3 cursor-pointer transition-all ${isPartner ? 'glass' : 'bg-white shadow-sm border border-brand-soft'}`}
    >
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-wider font-bold opacity-40">{name}</span>
        <span className="p-2 bg-bg-app rounded-xl text-lg">{emoji}</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight">{status}</p>
        <div className="flex items-center space-x-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isPartner ? 'bg-green-400 animate-pulse' : 'bg-brand'}`} />
          <span className="text-[10px] opacity-40">{isPartner ? 'Live' : 'Active now'}</span>
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
    <div className={`p-6 rounded-[32px] ${color} space-y-3 border border-white/20`}>
      <Icon className="w-6 h-6 opacity-60" />
      <div>
        <h4 className="text-sm font-bold text-[#4A4440]">{title}</h4>
        <p className="text-[10px] opacity-60 uppercase tracking-widest">{count}</p>
      </div>
    </div>
  );
}
