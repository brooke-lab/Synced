import { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import { Home, Music, Calendar, Target, Heart, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WelcomeScreen from './components/WelcomeScreen';
import HomeScreen from './components/screens/HomeScreen';
import MusicScreen from './components/screens/MusicScreen';
import PlansScreen from './components/screens/PlansScreen';
import GoalsScreen from './components/screens/GoalsScreen';
import ReflectionScreen from './components/screens/ReflectionScreen';
import ProfileScreen from './components/screens/ProfileScreen';

export default function App() {
  const { user, loading, couple } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAF7F2]">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Heart className="text-pink-300 fill-pink-300 w-12 h-12" />
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
            className="w-full py-3 bg-pink-100 text-pink-600 rounded-2xl hover:bg-pink-200 transition-colors font-medium"
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
      case 'profile': return <ProfileScreen />;
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

      <nav className="fixed bottom-6 left-6 right-6 h-18 glass rounded-full flex items-center justify-around px-4 z-50">
        <NavButton icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Home" />
        <NavButton icon={Music} active={activeTab === 'music'} onClick={() => setActiveTab('music')} label="Music" />
        <NavButton icon={Calendar} active={activeTab === 'plans'} onClick={() => setActiveTab('plans')} label="Plans" />
        <NavButton icon={Target} active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} label="Goals" />
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
      className={`relative flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${active ? 'text-pink-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <Icon className="w-5 h-5" />
      {active && (
        <motion.div
          layoutId="active-indicator"
          className="absolute -top-1 w-1 h-1 bg-pink-500 rounded-full"
        />
      )}
      <span className="text-[10px] font-medium hidden xs:block">{label}</span>
    </button>
  );
}
