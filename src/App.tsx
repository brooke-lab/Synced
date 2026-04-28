import { useState, useEffect } from 'react';
import { useAuth } from './lib/AuthContext';
import { Home, Music, Calendar, Target, Heart, User, Sparkles, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WelcomeScreen from './components/WelcomeScreen';
import HomeScreen from './components/screens/HomeScreen';
import MusicScreen from './components/screens/MusicScreen';
import PlansScreen from './components/screens/PlansScreen';
import GoalsScreen from './components/screens/GoalsScreen';
import ReflectionScreen from './components/screens/ReflectionScreen';
import ProfileScreen from './components/screens/ProfileScreen';
import GalleryScreen from './components/screens/GalleryScreen';
import ActivityScreen from './components/screens/ActivityScreen';
import { THEMES } from './constants';
import { Clock } from 'lucide-react';

export default function App() {
  const { user, loading, couple } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (couple?.theme) {
      const selectedTheme = THEMES.find(t => t.id === couple.theme) || THEMES[0];
      const root = document.documentElement;
      root.style.setProperty('--brand-color', selectedTheme.brand);
      root.style.setProperty('--brand-soft', selectedTheme.soft);
      root.style.setProperty('--bg-color', selectedTheme.bg);
      root.style.setProperty('--text-color', selectedTheme.text);
      root.style.setProperty('--bg-gradient', selectedTheme.gradient);
      root.setAttribute('data-theme', selectedTheme.id);
    }
  }, [couple?.theme]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-app">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Heart className="text-brand fill-brand w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <WelcomeScreen />;
  }

  // If user is logged in but not linked to a couple, show a linking screen (via Profile)
  if (!couple && activeTab !== 'profile') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="p-6 glass rounded-3xl space-y-4">
          <Sparkles className="w-12 h-12 text-yellow-400 mx-auto" />
          <h1 className="text-2xl font-serif">Welcome to Synced</h1>
          <p className="text-sm opacity-70">To begin your journey, link with your partner in the profile section.</p>
          <button
            onClick={() => setActiveTab('profile')}
            className="btn-primary w-full py-3 bg-brand-soft text-brand rounded-2xl hover:bg-opacity-80 transition-colors font-medium border border-brand/10"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen />;
      case 'music': return <MusicScreen />;
      case 'plans': return <PlansScreen />;
      case 'goals': return <GoalsScreen />;
      case 'reflection': return <ReflectionScreen />;
      case 'gallery': return <GalleryScreen />;
      case 'profile': return <ProfileScreen />;
      case 'activity': return <ActivityScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col lofi-gradient">
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-18 glass rounded-full flex items-center justify-around px-2 z-50">
        <NavButton icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Home" />
        <NavButton icon={Clock} active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} label="Activity" />
        <div className="relative -top-3">
          <button 
            onClick={() => setActiveTab('gallery')}
            className="w-14 h-14 bg-brand rounded-2xl shadow-xl shadow-brand/20 flex items-center justify-center text-white active:scale-95 transition-all border-4 border-[#FAF7F2]"
          >
            <Image className="w-6 h-6" />
          </button>
        </div>
        <NavButton icon={Heart} active={activeTab === 'reflection'} onClick={() => setActiveTab('reflection')} label="Feelings" />
        <NavButton icon={User} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Profile" />
      </nav>
    </div>
  );
}

function NavButton({ icon: Icon, active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center space-y-1.5 transition-all duration-300 ${active ? 'text-brand' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-brand/10 shadow-inner' : 'bg-transparent'}`}>
        <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
      </div>
      {active && (
        <motion.div
          layoutId="active-indicator"
          className="absolute -bottom-1 w-4 h-0.5 bg-brand rounded-full"
        />
      )}
      <span className={`text-[9px] font-mono uppercase tracking-tighter hidden xs:block ${active ? 'font-bold opacity-100' : 'opacity-40'}`}>
        {label}
      </span>
    </button>
  );
}
