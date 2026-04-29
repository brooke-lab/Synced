import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, LogOut, Link2, Ghost, Sparkles, Heart, Copy, Check, Palette, ShieldAlert, Trash2, Edit3, Save, UserCircle, Upload, X } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { signOut, db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, getDoc, deleteDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { THEMES } from '../../constants';
import { logActivity } from '../../lib/activityLogger';

const ZODIAC_SIGNS = [
  { name: 'Aries', emoji: '♈️' },
  { name: 'Taurus', emoji: '♉️' },
  { name: 'Gemini', emoji: '♊️' },
  { name: 'Cancer', emoji: '♋️' },
  { name: 'Leo', emoji: '♌️' },
  { name: 'Virgo', emoji: '♍️' },
  { name: 'Libra', emoji: '♎️' },
  { name: 'Scorpio', emoji: '♏️' },
  { name: 'Sagittarius', emoji: '♐️' },
  { name: 'Capricorn', emoji: '♑️' },
  { name: 'Aquarius', emoji: '♒️' },
  { name: 'Pisces', emoji: '♓️' }
];

export default function ProfileScreen() {
  const { user, couple, partner } = useAuth();
  const [linkCode, setLinkCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState(user?.photoURL || '');
  const [uploading, setUploading] = useState(false);
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
    if (!user || !partner || !newNickname.trim() || !couple?.id) return;
    try {
      const updatedNicknames = { ...user.nicknames, [partner.uid]: newNickname };
      await updateDoc(doc(db, 'users', user.uid), {
        nicknames: updatedNicknames
      });

      await logActivity(
        couple.id,
        user.uid,
        'nickname',
        `set a new nickname for ${partner.displayName || 'their partner'}: "${newNickname}"`,
        { nickname: newNickname, partnerId: partner.uid }
      );

      setIsEditingNickname(false);
    } catch (e) {
      console.error(e);
    }
  };

  const coupleLink = async () => {
    if (!linkCode || !user) return;
    setError('');
    setUploading(true);
    try {
      const formattedCode = linkCode.trim().toUpperCase();
      
      // The code is the first 6 chars of the creator's UID
      // We need to find the user document that matches this invitation code
      // To keep it simple without complex queries, we use a shared collection 'invitations'
      // Or just a deterministic coupleId: space_6CHARCODE
      const coupleId = `space_${formattedCode}`;
      const coupleRef = doc(db, 'couples', coupleId);
      const coupleSnap = await getDoc(coupleRef);
      
      if (!coupleSnap.exists()) {
        // Create new space
        await setDoc(coupleRef, {
          members: [user.uid, 'PARTNER_WAITING'],
          invitationCode: user.uid.substring(0, 6).toUpperCase(),
          createdAt: serverTimestamp(),
          theme: 'default',
          loveLetterDay: 0,
          quoteOfTheDay: {
            text: "Love is composed of a single soul inhabiting two bodies.",
            author: "Aristotle"
          }
        });
        
        await updateDoc(doc(db, 'users', user.uid), {
          coupleId: coupleId,
          role: 'owner'
        });
      } else {
        // Join existing space
        const data = coupleSnap.data();
        if (data.members.includes(user.uid)) {
          // Already a member
          await updateDoc(doc(db, 'users', user.uid), { coupleId: coupleId });
        } else if (data.members.includes('PARTNER_WAITING')) {
           const newMembers = [data.members[0], user.uid];
           await updateDoc(coupleRef, {
             members: newMembers
           });
           await updateDoc(doc(db, 'users', user.uid), {
             coupleId: coupleId,
             role: 'member'
           });
           
           // Mutual link
           await updateDoc(doc(db, 'users', data.members[0]), { partnerId: user.uid });
           await updateDoc(doc(db, 'users', user.uid), { partnerId: data.members[0] });
        } else {
          setError("This space is already full.");
        }
      }
      setLinkCode('');
    } catch (e) {
      setError("Linking failed. Error: " + (e as any).message);
    } finally {
      setUploading(false);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: base64String
        });
        setIsEditingPhoto(false);
      } catch (err) {
        console.error(err);
        setError("Failed to upload image");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="px-4 md:px-8 pt-10 space-y-10 min-h-screen pb-40">
      <div className="flex justify-between items-center px-2">
        <h1 className="text-3xl font-display font-black text-text-main uppercase tracking-tighter">Your Profile</h1>
        <button onClick={handleLogout} className="p-3 bg-white/5 rounded-2xl text-text-main/20 hover:text-red-400 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center space-y-6">
        <div 
          className="relative group w-24 h-24"
        >
          <div 
            onClick={() => setIsEditingPhoto(!isEditingPhoto)}
            className="w-24 h-24 rounded-[32px] bg-white/[0.02] border border-white/10 cursor-pointer overflow-hidden transition-all active:scale-95 hover:border-brand/40"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} className="w-full h-full object-cover transition-all group-hover:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/5">
                <User className="w-8 h-8 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
              <Upload className="w-5 h-5 text-white" />
            </div>
          </div>
          
          {uploading && (
            <div className="absolute inset-0 rounded-[32px] bg-bg-app/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {isEditingPhoto && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-5 rounded-[32px] w-full max-w-xs space-y-4 tech-border shadow-2xl relative"
          >
            <button 
              onClick={() => setIsEditingPhoto(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-brand transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-40">Profile Photo // Update</h3>
              <p className="text-xs font-bold">Choose your representative image.</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <label className="btn-primary w-full py-3 bg-brand text-white rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload From Device</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              
              <div className="relative">
                <input
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="Or paste image URL..."
                  className="w-full p-4 bg-white/60 rounded-2xl outline-none text-[10px] font-mono border border-black/5 focus:border-brand/20 transition-colors"
                />
                <button 
                  onClick={() => updateProfile('photoURL', newPhotoUrl)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-brand/10 text-brand rounded-xl hover:bg-brand/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
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
              <button 
                onClick={() => setIsEditingName(true)} 
                className="opacity-40 hover:opacity-100 transition-opacity p-1 bg-black/5 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs opacity-40 uppercase tracking-widest font-black leading-relaxed mt-1">{user?.email}</p>
          {user?.role && (
            <span className="inline-block mt-2 px-3 py-1 bg-brand/10 text-brand text-[10px] font-black uppercase tracking-widest rounded-full">
              {user.role}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-4 px-2 opacity-40">
          <span className="w-8 h-[1px] bg-text-main" />
          <h3 className="text-[9px] font-mono font-bold uppercase tracking-[0.6em] text-text-main">Astra_Profile</h3>
        </div>
        
        <div className="card-neo !p-8 space-y-8 overflow-hidden relative border-white/[0.03]">
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-text-main">Zodiac Origin</p>
                <p className="text-[9px] font-mono font-bold text-text-main/20 uppercase tracking-widest">Alignment calibration</p>
              </div>
              <div className="text-3xl opacity-60">
                {ZODIAC_SIGNS.find(s => s.name === user?.zodiacSign)?.emoji || '✨'}
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {ZODIAC_SIGNS.map((sign) => (
                <button
                  key={sign.name}
                  onClick={async () => {
                    if (!user) return;
                    await updateDoc(doc(db, 'users', user.uid), { zodiacSign: sign.name });
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border ${
                    user?.zodiacSign === sign.name 
                      ? 'bg-brand text-white border-brand shadow-lg' 
                      : 'bg-white/[0.02] border-white/[0.05] hover:border-brand/40 opacity-40'
                  }`}
                >
                  <span className="text-lg mb-1">{sign.emoji}</span>
                  <span className="text-[8px] font-mono font-black uppercase tracking-tighter">{sign.name.substring(0, 3)}</span>
                </button>
              ))}
            </div>
          </div>
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
               <div className="flex items-center space-x-6 p-6 bg-white/40 rounded-[32px] relative group border border-brand/5">
                <div className="relative">
                {partner?.photoURL ? (
                  <img src={partner.photoURL} className="w-16 h-16 rounded-[24px] object-cover shadow-lg border-2 border-white" />
                ) : (
                  <div className="w-16 h-16 rounded-[24px] bg-black/5 flex items-center justify-center border-2 border-white">
                    <UserCircle className="w-8 h-8 text-brand/40" />
                  </div>
                )}
                  <div className="absolute -bottom-1 -right-1 bg-brand text-white p-1 rounded-lg">
                    <Heart className="w-3 h-3 fill-current" />
                  </div>
                </div>
                <div className="flex-1">
                  {isEditingNickname ? (
                    <div className="flex items-center space-x-2">
                       <input
                        autoFocus
                        value={newNickname}
                        onChange={e => setNewNickname(e.target.value)}
                        placeholder="Pet name..."
                        className="bg-white/60 rounded-xl px-3 py-2 text-sm font-bold flex-1 outline-none border border-brand/20 shadow-inner"
                        onKeyDown={(e) => e.key === 'Enter' && updatePartnerNickname()}
                      />
                      <button onClick={updatePartnerNickname} className="p-2 bg-brand text-white rounded-xl shadow-lg active:scale-90 transition-all">
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="space-y-0.5">
                        <p className="text-xl font-serif font-bold text-brand leading-none">
                          {user?.nicknames?.[partner?.uid || ''] || partner?.displayName || 'Your Love'}
                        </p>
                        <p className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-black">
                          {partner?.displayName || 'Partner'}
                        </p>
                      </div>
                      <button onClick={() => setIsEditingNickname(true)} className="p-1.5 bg-brand/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-brand/10">
                        <Edit3 className="w-3.5 h-3.5 text-brand" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Space Settings */}
            <div className="space-y-4 pt-6 border-t border-black/5">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-30 px-2">Space Settings</h4>
              
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold opacity-60 ml-2">Letter Reveal Day</label>
                  <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <button
                        key={i}
                        onClick={async () => {
                          if (!couple?.id) return;
                          await updateDoc(doc(db, 'couples', couple.id), { loveLetterDay: i });
                        }}
                        className={`py-2 rounded-xl text-[10px] font-mono font-black border transition-all ${
                          couple.loveLetterDay === i 
                            ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' 
                            : 'bg-white text-gray-400 border-black/5 hover:border-brand/20'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold opacity-60 ml-2">Visual Theme</label>
                  <div className="flex space-x-2 p-1 bg-black/5 rounded-2xl">
                    {['default', 'dark', 'soft'].map((t) => (
                      <button
                        key={t}
                        onClick={async () => {
                          if (!couple?.id) return;
                          await updateDoc(doc(db, 'couples', couple.id), { theme: t });
                        }}
                        className={`flex-1 py-2 text-[10px] font-mono font-black uppercase tracking-widest rounded-xl transition-all ${
                          (couple.theme || 'default') === t 
                            ? 'bg-white shadow-sm text-brand' 
                            : 'opacity-40 hover:opacity-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={async () => {
                if (!user || !couple?.id) return;
                if (confirm("Disconnect from this space? You will lose access to shared memories.")) {
                  await updateDoc(doc(db, 'users', user.uid), { coupleId: null, role: 'member' });
                  await updateDoc(doc(db, 'couples', couple.id), {
                    members: couple.members.filter((m: string) => m !== user.uid)
                  });
                }
              }}
              className="w-full py-4 text-[10px] font-mono font-black uppercase tracking-widest text-red-500 opacity-40 hover:opacity-100 transition-opacity"
            >
              [ DISCONNECT_SPACE ]
            </button>
          </div>
        ) : (
          <div className="glass p-8 rounded-[40px] space-y-8">
            <div className="flex items-center space-x-3 text-yellow-500">
              <Link2 className="w-6 h-6" />
              <h3 className="text-lg font-serif">Link your space</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-[10px] md:text-xs opacity-40 uppercase tracking-widest font-black ml-2">Share Invitation Code</p>
              <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-2xl md:rounded-3xl">
                <code className="text-base md:text-lg font-mono font-black tracking-widest text-brand">
                  {user?.uid?.substring(0, 6).toUpperCase()}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user?.uid?.substring(0, 6).toUpperCase() || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 md:p-3 bg-brand/10 hover:bg-brand/20 rounded-xl text-brand transition-all"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/[0.05]">
              <p className="text-[10px] md:text-xs opacity-40 uppercase tracking-widest font-black ml-2">Connect with Partner</p>
              <div className="flex space-x-2">
                <input
                  value={linkCode}
                  onChange={e => setLinkCode(e.target.value)}
                  placeholder="CODE"
                  className="flex-1 p-4 bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-3xl outline-none text-xs md:text-sm font-mono font-black tracking-widest text-text-main focus:border-brand/40 transition-all"
                />
                <button
                  onClick={coupleLink}
                  className="px-6 md:px-8 bg-brand text-white rounded-2xl md:rounded-3xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all"
                >
                  Join
                </button>
              </div>
              {error && <p className="text-[10px] text-red-500 font-bold px-2">{error}</p>}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center space-x-4 px-2 opacity-40">
            <span className="w-8 h-[1px] bg-text-main" />
            <h3 className="text-[9px] font-mono font-bold uppercase tracking-[0.6em] text-text-main">Interface_Styles</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {THEMES.map((t) => (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                key={t.id}
                onClick={async () => {
                  if (couple?.id) {
                    await updateDoc(doc(db, 'couples', couple.id), { theme: t.id });
                  }
                }}
                className={`relative group overflow-hidden card-neo !p-6 flex items-center justify-between transition-all ${
                  (couple?.theme || 'burgundy') === t.id 
                    ? 'border-brand/40 bg-brand/[0.04] shadow-xl' 
                    : 'opacity-40 hover:opacity-80'
                }`}
              >
                <div className="flex items-center space-x-6 relative z-10">
                  <div 
                    className="w-12 h-12 rounded-xl shadow-inner relative overflow-hidden flex items-center justify-center"
                    style={{ background: t.gradient }}
                  >
                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: t.brand }} />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-display font-black text-text-main uppercase tracking-tight leading-none">{t.name}</p>
                    <p className="text-[9px] font-mono font-bold text-brand/60 uppercase tracking-widest mt-2 transition-all">
                      {t.id.toUpperCase()}_PROFILE
                    </p>
                  </div>
                </div>
                
                {(couple?.theme || 'burgundy') === t.id && (
                  <motion.div 
                    layoutId="active-theme-check"
                    className="bg-brand text-white p-2 rounded-xl shadow-lg relative z-10"
                  >
                    <Check className="w-3 h-3 stroke-[3px]" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Connection Rituals Settings */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 px-2 opacity-40">
            <span className="w-8 h-[1.5px] bg-text-main" />
            <h3 className="text-[9px] font-mono font-black uppercase tracking-[0.6em] text-text-main">Connection_Rituals</h3>
          </div>
          
          <div className="card-neo !p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-text-main">Letter Reveal Ritual</p>
                <p className="text-[10px] font-mono font-medium text-text-main/40 uppercase tracking-wider">Weekly letter sharing</p>
              </div>
              <select 
                value={couple?.loveLetterDay ?? 0}
                onChange={async (e) => {
                  if (couple?.id) {
                    await updateDoc(doc(db, 'couples', couple.id), { loveLetterDay: parseInt(e.target.value) });
                  }
                }}
                className="bg-black/[0.03] border border-black/[0.05] p-3 px-5 rounded-2xl text-xs font-mono font-bold outline-none focus:border-brand/40 transition-all cursor-pointer"
              >
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                  <option key={i} value={i}>{day.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
           <MenuBtn 
             label="Daily Notifications" 
             active={user?.settings?.notifications ?? true} 
             onClick={async () => {
               if (!user) return;
               await updateDoc(doc(db, 'users', user.uid), { 
                 'settings.notifications': !(user?.settings?.notifications ?? true) 
               });
             }}
           />
           <MenuBtn 
             label="Focus Mode Sync" 
             active={user?.isFocused ?? false} 
             onClick={async () => {
               if (!user) return;
               const newStatus = !(user?.isFocused ?? false);
               await updateDoc(doc(db, 'users', user.uid), { 
                 isFocused: newStatus,
                 status: newStatus ? 'Deep Work' : (user.status === 'Deep Work' ? 'Available' : user.status),
                 statusEmoji: newStatus ? '🧠' : (user.statusEmoji === '🧠' ? '✨' : user.statusEmoji)
               });
               if (couple?.id) {
                 await logActivity(couple.id, user.uid, 'status', newStatus ? 'entered Deep Work mode 🧠' : 'is now available', { isFocused: newStatus });
               }
             }}
           />
           <MenuBtn 
             label="Privacy Shield" 
             active={user?.settings?.privacy ?? false} 
             onClick={async () => {
               if (!user) return;
               await updateDoc(doc(db, 'users', user.uid), { 
                 'settings.privacy': !(user?.settings?.privacy ?? false) 
               });
             }}
           />
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

function MenuBtn({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-5 glass rounded-[24px] text-left transition-all active:scale-[0.98]"
    >
      <span className="text-sm font-medium opacity-70">{label}</span>
      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${active ? 'bg-brand' : 'bg-gray-200'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}
