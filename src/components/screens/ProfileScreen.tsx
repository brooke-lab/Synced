import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, LogOut, Link2, Ghost, Sparkles, Heart, Copy, Check, Palette, ShieldAlert, Trash2, Edit3, Save } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { signOut, db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, getDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { THEMES } from '../../constants';

export default function ProfileScreen() {
  const { user, couple, partner } = useAuth();
  const [linkCode, setLinkCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState(user?.photoURL || '');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  useEffect(() => {
    if (user?.displayName) setNewName(user.displayName);
    if (user?.photoURL) setNewPhotoUrl(user.photoURL);
    if (partner?.uid && user?.nicknames?.[partner.uid]) {
      setNewNickname(user.nicknames[partner.uid]);
    }
  }, [user, partner]);

  const updateProfile = async (field: 'displayName' | 'photoURL', value: string) => {
    if (!user || !value.trim()) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [field]: value
      });
      if (field === 'displayName') setIsEditingName(false);
      if (field === 'photoURL') setIsEditingPhoto(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updatePartnerNickname = async () => {
    if (!user || !partner || !newNickname.trim()) return;
    try {
      const updatedNicknames = { ...user.nicknames, [partner.uid]: newNickname };
      await updateDoc(doc(db, 'users', user.uid), {
        nicknames: updatedNicknames
      });
      setIsEditingNickname(false);
    } catch (e) {
      console.error(e);
    }
  };

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    setGeneratedCode(user?.uid?.substring(0, 6).toUpperCase() || '');
  };

  const coupleLink = async () => {
    if (!linkCode || !user) return;
    setError('');
    try {
      const coupleId = `couple_${user.uid.substring(0,4)}_${linkCode}`;
      
      const coupleRef = doc(db, 'couples', coupleId);
      await setDoc(coupleRef, {
        members: [user.uid, 'PARTNER_PLACEHOLDER'],
        createdAt: serverTimestamp(),
        theme: 'default',
        loveLetterDay: 0,
        quoteOfTheDay: {
          text: "Love is composed of a single soul inhabiting two bodies.",
          author: "Aristotle"
        }
      });

      await updateDoc(doc(db, 'users', user.uid), {
        coupleId: coupleId
      });
    } catch (e) {
      setError("Linking failed. Check the code.");
    }
  };

  const unlinkSpace = async () => {
    if (!user || !couple) return;
    if (confirm("Unlink from your partner? You will lose access to shared memories.")) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { coupleId: null });
        window.location.reload(); // Refresh to clear state
      } catch (e) {
        console.error(e);
      }
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    if (confirm("PERMANENTLY DELETE ACCOUNT? This action cannot be undone. All your letters and shared data will be lost for you.")) {
      try {
        // Remove from couple members list if exists
        if (couple?.id) {
          await updateDoc(doc(db, 'couples', couple.id), {
            members: couple.members.filter((m: string) => m !== user.uid)
          });
        }
        // Delete user profile
        await deleteDoc(doc(db, 'users', user.uid));
        // Sign out
        await signOut();
      } catch (e) {
        alert("Sensitive action. Please sign out and sign back in before deleting.");
      }
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
        <div 
          onClick={() => setIsEditingPhoto(true)}
          className="w-24 h-24 rounded-[32px] bg-white shadow-xl flex items-center justify-center p-1 border-4 border-white cursor-pointer group relative overflow-hidden"
        >
          <img src={user?.photoURL || ''} className="w-full h-full rounded-[28px] object-cover transition-all group-hover:opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
            <Edit3 className="w-6 h-6 text-brand" />
          </div>
        </div>

        {isEditingPhoto && (
          <div className="flex items-center space-x-2 bg-white shadow-sm rounded-2xl p-2 px-3 border border-brand/10 w-full max-w-xs transition-all animate-in slide-in-from-top-4">
            <input
              autoFocus
              value={newPhotoUrl}
              onChange={e => setNewPhotoUrl(e.target.value)}
              placeholder="Enter photo URL..."
              className="bg-transparent outline-none text-[10px] font-mono flex-1"
            />
            <button onClick={() => updateProfile('photoURL', newPhotoUrl)} className="text-brand">
              <Save className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="text-center w-full max-w-[200px]">
          {isEditingName ? (
            <div className="flex items-center space-x-2 bg-white/60 rounded-2xl p-2 px-3">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold flex-1"
              />
              <button onClick={() => updateProfile('displayName', newName)} className="text-brand">
                <Save className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 group">
              <h2 className="text-xl font-bold">{user?.displayName}</h2>
              <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-40 transition-opacity">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs opacity-40 uppercase tracking-widest font-black leading-relaxed mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        {couple ? (
          <div className="glass p-8 rounded-[40px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-brand">
                <Heart className="w-6 h-6 fill-brand" />
                <h3 className="text-lg font-serif">Linked Space</h3>
              </div>
              <span className="text-[10px] font-black opacity-20 uppercase">Est. {couple?.createdAt?.toDate().toLocaleDateString()}</span>
            </div>
            <div className="flex flex-col space-y-4">
               <div className="flex items-center space-x-4 p-4 bg-white/40 rounded-3xl relative group">
                <img src={partner?.photoURL || ''} className="w-12 h-12 rounded-2xl object-cover" />
                <div className="flex-1">
                  {isEditingNickname ? (
                    <div className="flex items-center space-x-2">
                       <input
                        autoFocus
                        value={newNickname}
                        onChange={e => setNewNickname(e.target.value)}
                        placeholder="Pet name..."
                        className="bg-white/60 rounded-xl px-3 py-1 text-sm font-bold flex-1 outline-none"
                      />
                      <button onClick={updatePartnerNickname} className="text-brand">
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-bold">
                        {user?.nicknames?.[partner?.uid || ''] || partner?.displayName || 'Your Love'}
                      </p>
                      <button onClick={() => setIsEditingNickname(true)} className="opacity-0 group-hover:opacity-40 transition-opacity">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] opacity-40 uppercase tracking-tighter font-black">
                    {partner?.displayName || 'Partner'}
                  </p>
                </div>
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
                <code className="text-lg font-black tracking-widest text-brand">
                  {user?.uid?.substring(0, 6).toUpperCase()}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user?.uid?.substring(0, 6).toUpperCase() || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 bg-brand-soft rounded-xl text-brand"
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

        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-black opacity-30 px-2 mt-4">Ritual Settings</h3>
          <div className="glass p-5 rounded-[32px] space-y-4">
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium">Letter Reveal Day</span>
               <select 
                 value={couple?.loveLetterDay ?? 0}
                 onChange={(e) => {
                   if (couple?.id) {
                     updateDoc(doc(db, 'couples', couple.id), { loveLetterDay: parseInt(e.target.value) });
                   }
                 }}
                 className="bg-bg-app px-4 py-2 rounded-xl text-xs font-bold outline-none"
               >
                 {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                   <option key={i} value={i}>{day}</option>
                 ))}
               </select>
             </div>
             <p className="text-[10px] opacity-40 leading-relaxed italic">The day of the week both of your letters are unsealed and shared. 💌</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-black opacity-30 px-2 mt-4">Personalize Space</h3>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (couple?.id) {
                    updateDoc(doc(db, 'couples', couple.id), { theme: t.id });
                  }
                }}
                className={`flex items-center space-x-3 p-3 glass rounded-2xl transition-all ${couple?.theme === t.id ? 'ring-2 ring-brand' : ''}`}
              >
                <div className="w-8 h-8 rounded-xl shadow-inner" style={{ backgroundColor: t.brand }} />
                <span className="text-xs font-bold">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
           <MenuBtn label="Daily Notifications" active={true} />
           <MenuBtn label="Dark Mode" active={false} />
           <MenuBtn label="Privacy Policy" active={false} />
        </div>

        <div className="space-y-4 pt-8">
          <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-black opacity-30 px-2 text-red-500">
            <ShieldAlert className="w-3 h-3" />
            <span>Danger Zone</span>
          </div>
          <div className="glass p-4 rounded-[32px] space-y-2 border border-red-100/50">
            {couple && (
              <button
                onClick={unlinkSpace}
                className="w-full flex items-center justify-between p-4 bg-white/40 rounded-2xl text-red-500 transition-all active:scale-95"
              >
                <div className="flex items-center space-x-3">
                  <Link2 className="w-4 h-4 opacity-50" />
                  <span className="text-sm font-bold">Unlink Space</span>
                </div>
              </button>
            )}
            <button
              onClick={deleteAccount}
              className="w-full flex items-center justify-between p-4 bg-red-50/50 rounded-2xl text-red-600 transition-all active:scale-95 border border-red-100"
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-bold">Delete My Account</span>
              </div>
            </button>
            <p className="text-[9px] text-center opacity-30 italic mt-2">Accounts are linked to your Google Identity. Deleting here removes your app data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuBtn({ label, active }: any) {
  return (
    <div className="flex items-center justify-between p-5 glass rounded-[24px]">
      <span className="text-sm font-medium opacity-70">{label}</span>
      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${active ? 'bg-brand' : 'bg-gray-200'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-4' : ''}`} />
      </div>
    </div>
  );
}
