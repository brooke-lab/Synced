import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './lib/AuthContext';
import { Home, Music, Calendar, Target, Heart, User, Sparkles, Image, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WelcomeScreen from './components/WelcomeScreen';
import HomeScreen from './components/screens/HomeScreen';
import MusicScreen from './components/screens/MusicScreen';
import PlansScreen from './components/screens/PlansScreen';
import GoalsScreen from './components/screens/GoalsScreen';
import ReflectionScreen from './components/screens/ReflectionScreen';
import ProfileScreen from './components/screens/ProfileScreen';
import GalleryScreen from './components/screens/GalleryScreen';
import { THEMES } from './constants';

export default function App() {
  const { user, loading, couple } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  const navigate = (tab: string) => setActiveTab(tab);

  useEffect(() => {
    const selectedTheme = THEMES.find(t => t.id === couple?.theme) || THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--brand-color', selectedTheme.brand);
    root.style.setProperty('--brand-soft', selectedTheme.soft);
    root.style.setProperty('--bg-color', selectedTheme.bg);
    root.style.setProperty('--text-color', selectedTheme.text);
    root.style.setProperty('--bg-gradient', selectedTheme.gradient);
    root.setAttribute('data-theme', selectedTheme.id);
  }, [couple?.theme]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1], 
            rotate: [0, 10, -10, 0],
            filter: ["blur(0px)", "blur(10px)", "blur(0px)"]
          }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="relative"
        >
          <div className="absolute inset-0 bg-brand/20 blur-3xl animate-pulse" />
          <Heart className="text-brand fill-brand w-20 h-20 glow-brand-strong relative z-10" />
        </motion.div>
        <p className="mt-8 text-[10px] font-mono font-black text-brand uppercase tracking-[0.5em] animate-pulse">Syncing_Neural_Cores...</p>
      </div>
    );
  }

  if (!user) {
    return <WelcomeScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen onNavigate={navigate} />;
      case 'space': return <SpaceHub onNavigate={navigate} />;
      case 'music': return <MusicScreen />;
      case 'plans': return <PlansScreen />;
      case 'goals': return <GoalsScreen />;
      case 'reflection': return <ReflectionScreen />;
      case 'gallery': return <GalleryScreen />;
      case 'profile': return <ProfileScreen />;
      default: return <HomeScreen onNavigate={navigate} />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-app font-sans selection:bg-brand selection:text-white relative overflow-hidden">
      <div className="noise-overlay" />
      <FloatingNeonHearts />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand/5 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#3A86FF]/5 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      <main className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full overflow-y-auto lofi-gradient"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 h-16 md:h-20 px-4 md:px-8 glass rounded-2xl md:rounded-full flex items-center justify-center space-x-4 sm:space-x-8 md:space-x-12 z-50 border border-white/20 shadow-2xl backdrop-blur-2xl w-[90%] max-w-sm md:max-w-none md:w-auto">
        <NavButton icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="CORE" />
        <NavButton icon={LayoutGrid} active={activeTab === 'space' || ['plans', 'music', 'goals'].includes(activeTab)} onClick={() => setActiveTab('space')} label="LINK" />
        
        <div className="relative">
          <button 
            onClick={() => setActiveTab('gallery')}
            className="w-12 h-12 md:w-14 md:h-14 bg-brand rounded-2xl md:rounded-3xl shadow-2xl shadow-brand/40 flex items-center justify-center text-white active:scale-90 transition-all hover:rotate-6 group"
          >
            <Image className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-white/20 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <NavButton icon={Heart} active={activeTab === 'reflection'} onClick={() => setActiveTab('reflection')} label="VAULT" />
        <NavButton icon={User} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="SELF" />
      </nav>
    </div>
  );
}

function FloatingNeonHearts() {
  const hearts = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    size: Math.random() * 24 + 12,
    left: `${Math.random() * 100}%`,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 10,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 0, y: "110vh" }}
          animate={{ 
            opacity: [0, 0.4, 0],
            y: "-10vh",
            x: [0, Math.sin(h.id) * 100],
            rotate: [0, 360]
          }}
          transition={{
            duration: h.duration,
            repeat: Infinity,
            delay: h.delay,
            ease: "linear"
          }}
          className="absolute"
          style={{ left: h.left }}
        >
          <Heart 
            size={h.size} 
            className="text-brand opacity-[0.05] fill-brand" 
          />
        </motion.div>
      ))}
    </div>
  );
}

function SpaceHub({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <div className="p-8 pt-16 space-y-12 min-h-screen pb-40">
      <div className="space-y-4">
        <h1 className="text-4xl font-display font-black text-text-main uppercase tracking-tighter">The Space</h1>
        <div className="flex items-center space-x-3 text-brand/60">
          <div className="w-1.5 h-1.5 bg-brand rounded-full" />
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] font-bold">Collaborative_Modules // Active</p>
        </div>
      </div>

      <div className="grid gap-6">
        {[
          { id: 'plans', title: 'Planning & Events', icon: Calendar, desc: 'Schedule shared moments', color: 'bg-white/5' },
          { id: 'goals', title: 'Shared Vision', icon: Target, desc: 'Objectives & growth', color: 'bg-white/5' },
          { id: 'music', title: 'Harmonic Sync', icon: Music, desc: 'Shared frequencies', color: 'bg-white/5' },
        ].map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            onClick={() => onNavigate(item.id)}
            className={`w-full p-8 rounded-[32px] ${item.color} flex items-center space-x-6 border border-white/[0.05] shadow-xl text-left group active:scale-[0.98] transition-all hover:bg-white/[0.08] hover:border-white/10`}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-brand transition-all duration-500 shadow-inner">
              <item.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-display font-black uppercase tracking-tight text-text-main group-hover:text-white transition-all">{item.title}</h3>
              <p className="text-[9px] font-mono text-white/30 uppercase mt-2 tracking-widest font-bold">{item.desc}</p>
            </div>
            <Sparkles className="w-4 h-4 text-brand opacity-0 group-hover:opacity-40 transition-all duration-500" />
          </motion.button>
        ))}
      </div>

      <div className="card-neo !p-10 border-dashed border-white/5 flex flex-col items-center text-center space-y-6 opacity-40">
        <div className="w-12 h-px bg-brand/20 rounded-full" />
        <p className="text-[9px] font-mono text-white/40 uppercase leading-relaxed font-bold tracking-[0.5em]">
          Resonating core frequencies...
        </p>
      </div>
    </div>
  );
}

function NavButton({ icon: Icon, active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center space-y-1.5 transition-all duration-300 ${active ? 'text-brand' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-brand/10' : 'bg-transparent'}`}>
        <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
      </div>
      <span className={`text-[9px] font-mono uppercase tracking-tighter transition-opacity ${active ? 'font-bold opacity-100' : 'opacity-40 font-bold'}`}>
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="active-nav-dot"
          className="absolute -bottom-1 w-1 h-1 bg-brand rounded-full"
        />
      )}
    </button>
  );
}
