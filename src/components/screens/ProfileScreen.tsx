import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, LogOut, Link2, Ghost, Sparkles, Heart, Copy, Check } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { signOut, db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, getDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function ProfileScreen() {
  const { user, couple, partner } = useAuth();
  const [linkCode, setLinkCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    // In a real app, we'd store this pending code in a "links" collection
    // For now, let's just use the UID as the code for simplicity/demo
    setGeneratedCode(user?.uid?.substring(0, 6).toUpperCase() || '');
  };

  const coupleLink = async () => {
    if (!linkCode || !user) return;
    setError('');
    // For this demo, let's assume the user enters the partner's truncated UID
    // In production, you'd query a 'pending_links' collection
    try {
      // Find user with this code (simulated)
      // We will look for a user where UID starts with this code
      // This is a simplification
      const coupleId = `couple_${user.uid.substring(0,4)}_${linkCode}`;
      
      const coupleRef = doc(db, 'couples', coupleId);
      await setDoc(coupleRef, {
        members: [user.uid, 'PARTNER_PLACEHOLDER'], // In real app, find actual partner UID
        createdAt: serverTimestamp(),
        theme: 'default',
        quoteOfTheDay: {
          text: "Love is composed of a single soul inhabiting two bodies.",
          author: "Aristotle"
        }
      });

      await updateDoc(doc(db, 'users', user.uid), {
        coupleId: coupleId
      });

      alert("Demo: Couple linked! (In a real app, this would verify the partner's code)");
    } catch (e) {
      setError("Linking failed. Check the code.");
    }
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif font-bold text-[#4A4440]">Profile</h1>
        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl flex items-center justify-center p-1 border-4 border-white">
          <img src={user?.photoURL || ''} className="w-full h-full rounded-[28px] object-cover" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{user?.displayName}</h2>
          <p className="text-xs opacity-40 uppercase tracking-widest font-black leading-relaxed">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        {couple ? (
          <div className="glass p-8 rounded-[40px] space-y-6">
            <div className="flex items-center space-x-3 text-pink-500">
              <Heart className="w-6 h-6 fill-pink-500" />
              <h3 className="text-lg font-serif">Linked with partner</h3>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-white/40 rounded-3xl">
              <img src={partner?.photoURL || ''} className="w-12 h-12 rounded-2xl object-cover" />
              <div>
                <p className="text-sm font-bold">{partner?.displayName || 'Your Love'}</p>
                <p className="text-xs opacity-50 italic">Together since {couple?.createdAt?.toDate().toLocaleDateString() || 'today'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-[40px] space-y-8">
            <div className="flex items-center space-x-3 text-yellow-500">
              <Link2 className="w-6 h-6" />
              <h3 className="text-lg font-serif">Link your space</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm opacity-60">Share your invitation code with your partner to sync your spaces.</p>
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-3xl">
                <code className="text-lg font-black tracking-widest text-pink-500">
                  {user?.uid?.substring(0, 6).toUpperCase()}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user?.uid?.substring(0, 6).toUpperCase() || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 bg-pink-50 rounded-xl text-pink-400"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-black/5">
              <p className="text-sm opacity-60">Have a code from your partner?</p>
              <div className="flex space-x-2">
                <input
                  value={linkCode}
                  onChange={e => setLinkCode(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 p-4 bg-white/60 rounded-3xl outline-none text-sm font-bold tracking-widest text-[#4A4440]"
                />
                <button
                  onClick={coupleLink}
                  className="px-6 bg-[#4A4440] text-white rounded-3xl text-sm font-bold shadow-lg"
                >
                  Join
                </button>
              </div>
              {error && <p className="text-[10px] text-red-400 font-bold px-2">{error}</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
           <MenuBtn label="Daily Notifications" active={true} />
           <MenuBtn label="Dark Mode" active={false} />
           <MenuBtn label="Privacy Policy" active={false} />
        </div>
      </div>
    </div>
  );
}

function MenuBtn({ label, active }: any) {
  return (
    <div className="flex items-center justify-between p-5 glass rounded-[24px]">
      <span className="text-sm font-medium opacity-70">{label}</span>
      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${active ? 'bg-pink-300' : 'bg-gray-200'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-4' : ''}`} />
      </div>
    </div>
  );
}
