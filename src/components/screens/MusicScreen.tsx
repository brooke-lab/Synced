import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Search, Heart, Send, Plus, History, Share2, Check, Play, ExternalLink, ListMusic, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { logActivity } from '../../lib/activityLogger';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function MusicScreen() {
  const { user, couple, partner } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dedications, setDedications] = useState<any[]>([]);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [activeTab, setActiveTab] = useState<'dedications' | 'playlist'>('dedications');
  const [mood, setMood] = useState('romantic');
  const [message, setMessage] = useState('');
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [showShareConfirm, setShowShareConfirm] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(
      collection(db, 'couples', couple.id, 'musicDedications'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setDedications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [couple?.id]);

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(
      collection(db, 'couples', couple.id, 'playlist'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setPlaylist(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [couple?.id]);

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const apiResponse = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery)}`);
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setResults(data);
        return;
      }
      
      // Fallback to Gemini if backend API fails (e.g. missing keys)
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for songs matching: "${searchQuery}". Return a JSON array of 5 songs with: title, artist, coverUrl (use aesthetic Unsplash urls related to music), and songUrl (mock spotify url).`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text || '[]');
      setResults(data.map((s: any) => ({ ...s, songUrl: s.songUrl || s.spotifyMockUrl })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const dedicateSong = async () => {
    if (!selectedSong || !couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'musicDedications'), {
      fromId: user?.uid,
      toId: partner?.uid,
      songTitle: selectedSong.title,
      artist: selectedSong.artist,
      coverUrl: selectedSong.coverUrl,
      songUrl: selectedSong.songUrl || '',
      message,
      createdAt: serverTimestamp()
    });

    await logActivity(
      couple.id,
      user?.uid || '',
      'music',
      `dedicated "${selectedSong.title}" by ${selectedSong.artist}`,
      { songTitle: selectedSong.title, artist: selectedSong.artist, coverUrl: selectedSong.coverUrl }
    );

    setSelectedSong(null);
    setMessage('');
    setSearchQuery('');
    setResults([]);
  };

  const addToPlaylist = async (song: any) => {
    if (!couple?.id || !user?.uid) return;
    try {
      await addDoc(collection(db, 'couples', couple.id, 'playlist'), {
        title: song.title,
        artist: song.artist,
        coverUrl: song.coverUrl,
        songUrl: song.songUrl,
        addedBy: user.uid,
        createdAt: serverTimestamp()
      });

      await logActivity(
        couple.id,
        user.uid,
        'music',
        `added "${song.title}" to the shared playlist`,
        { songTitle: song.title, artist: song.artist }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const removeFromPlaylist = async (songId: string) => {
    if (!couple?.id) return;
    try {
      await deleteDoc(doc(db, 'couples', couple.id, 'playlist', songId));
    } catch (e) {
      console.error(e);
    }
  };

  const generateRecommendations = async () => {
    if (!couple?.id) return;
    setIsGeneratingRecs(true);
    try {
      const historySummary = playlist.slice(0, 5).map(s => `${s.title} by ${s.artist}`).join(', ');
      const prompt = `Based on these songs: [${historySummary}] and a ${mood} mood, suggest 5 similar aesthetic songs for a couple. 
      Return JSON array: [{title, artist, coverUrl, songUrl, reason}]. Use Unsplash image URLs for coverUrl.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const data = JSON.parse(response.text || '[]');
      setRecommendations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  const shareSong = async (dedication: any) => {
    const shareData = {
      title: `${dedication.songTitle} - ${dedication.artist}`,
      text: `🎵 Dedicated thinking of you: "${dedication.message || 'Thinking of you'}"`,
      url: dedication.songUrl || window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
          setShowShareConfirm(null);
        }, 2000);
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  return (
    <div className="p-8 pt-20 space-y-12 min-h-screen dotted-grid relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] animate-scanning bg-gradient-to-b from-brand to-transparent z-0" style={{ height: '30vh' }} />

      <div className="relative z-10 space-y-2">
        <h1 className="text-4xl font-display font-black text-text-main uppercase tracking-[-0.05em] text-chromatic">Music Frequency</h1>
        <div className="flex items-center space-x-3 text-[10px] font-mono font-black text-brand tracking-[0.4em] uppercase">
          <div className="w-1.5 h-1.5 bg-brand animate-ping rounded-full" />
          <span>Audio_Sync // Harmony</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 glass-floating rounded-[28px] max-w-sm">
        <button
          onClick={() => setActiveTab('dedications')}
          className={`flex-1 py-4 text-[10px] font-mono font-black uppercase tracking-[0.2em] rounded-[22px] transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'dedications' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'opacity-40 hover:opacity-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Timeline</span>
        </button>
        <button
          onClick={() => setActiveTab('playlist')}
          className={`flex-1 py-4 text-[10px] font-mono font-black uppercase tracking-[0.2em] rounded-[22px] transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'playlist' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'opacity-40 hover:opacity-100'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Playlist</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative group max-w-xl">
        <div className="absolute -inset-2 bg-gradient-to-r from-brand to-blue-500 opacity-0 group-focus-within:opacity-10 transition-opacity blur-2xl rounded-[40px]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchSongs()}
          placeholder="SEARCH SHARED AUDIOSPHERE..."
          className="w-full pl-16 pr-6 py-6 glass rounded-[32px] outline-none border-brand/5 focus:border-brand/40 transition-all text-xs font-mono uppercase tracking-widest font-black"
        />
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-brand transition-all" />
        {isSearching && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4"
          >
            {results.map((song, i) => (
              <motion.div
                layoutId={`song-${song.title}-${i}`}
                key={i}
                className="flex items-center p-4 card-neo !p-4 !rounded-[32px] hover:scale-[1.02] active:scale-95 group cursor-pointer"
              >
                <div className="relative mr-4">
                  {song.coverUrl ? (
                    <img src={song.coverUrl} className="w-16 h-16 rounded-2xl object-cover shadow-2xl" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-black/5 flex items-center justify-center">
                      <Music className="w-6 h-6 text-brand/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl mix-blend-overlay" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-sm font-bold text-text-main truncate uppercase tracking-tight">{song.title}</p>
                  <p className="text-[10px] font-mono font-bold text-text-main/40 uppercase mt-1 tracking-widest">{song.artist}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); addToPlaylist(song); }}
                    className="p-3 bg-black/[0.03] hover:bg-brand/10 text-text-main/20 hover:text-brand rounded-2xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedSong(song); }}
                    className="p-3 bg-brand shadow-lg shadow-brand/20 text-white rounded-2xl hover:scale-110 transition-all"
                  >
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedication Modal */}
      <AnimatePresence>
        {selectedSong && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-8 bg-white/20 backdrop-blur-xl" onClick={() => setSelectedSong(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm glass rounded-[48px] p-10 space-y-10 border border-white/40 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.2)]"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-brand/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  {selectedSong.coverUrl ? (
                    <img src={selectedSong.coverUrl} className="relative w-48 h-48 rounded-[40px] shadow-2xl object-cover transform -rotate-3 group-hover:rotate-0 transition-transform duration-700" />
                  ) : (
                    <div className="relative w-48 h-48 rounded-[40px] bg-black/5 flex items-center justify-center transform -rotate-3 group-hover:rotate-0 transition-transform duration-700">
                      <Music className="w-16 h-16 text-brand/20" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-oracle italic text-text-main">{selectedSong.title}</h3>
                  <p className="text-[10px] font-mono font-black text-brand tracking-[0.4em] uppercase">{selectedSong.artist}</p>
                </div>
              </div>
              
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="WRITE_MESSAGE_FOR_PARTNER..."
                className="w-full p-6 bg-black/[0.02] rounded-[32px] text-xs font-mono outline-none border border-black/[0.03] focus:border-brand/40 focus:bg-white transition-all h-32 resize-none"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedSong(null)}
                  className="flex-1 py-5 rounded-[24px] text-[10px] font-mono font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={dedicateSong}
                  className="flex-1 py-5 bg-brand text-white rounded-[24px] text-[10px] font-mono font-black uppercase tracking-widest shadow-2xl shadow-brand/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Playlist / dedicated section with new aesthetic */}
      {activeTab === 'dedications' ? (
        <section className="space-y-12 pb-40 relative">
          <div className="flex items-center space-x-4">
            <span className="w-12 h-[1px] bg-brand/40" />
            <h2 className="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-brand whitespace-nowrap">Music_Timeline</h2>
          </div>
          
          <div className="space-y-10 relative">
            <div className="absolute left-6 top-4 bottom-4 w-[2px] bg-gradient-to-b from-brand/20 via-brand/10 to-transparent" />
            
            {dedications.map((dedication, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={dedication.id}
                className="relative pl-16 group"
              >
                <div className="absolute left-[21px] top-8 w-3 h-3 rounded-full border-2 border-brand bg-white group-hover:scale-150 group-hover:bg-brand transition-all duration-500 z-10" />
                <div className="card-neo !p-8 hover:bg-white transition-colors">
                  <div className="flex items-center space-x-6">
                    {dedication.coverUrl ? (
                      <img src={dedication.coverUrl} className="w-20 h-20 rounded-2xl object-cover shadow-xl grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-black/5 flex items-center justify-center">
                        <Music className="w-8 h-8 text-brand/20" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-xl font-display font-bold text-text-main uppercase tracking-tight truncate">{dedication.songTitle}</p>
                      <p className="text-[10px] font-mono font-black text-brand/60 uppercase tracking-widest">{dedication.artist}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => addToPlaylist({ title: dedication.songTitle, artist: dedication.artist, coverUrl: dedication.coverUrl, songUrl: dedication.songUrl })}
                        className="p-3 bg-black/5 rounded-2xl hover:bg-brand/10 text-brand"
                      >
                        <ListMusic className="w-5 h-5" />
                      </button>
                      {dedication.songUrl && (
                        <a 
                          href={dedication.songUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-12 h-12 bg-text-main text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-xl"
                        >
                          <Play className="w-5 h-5 fill-current" /> 
                        </a>
                      )}
                    </div>
                  </div>
                  {dedication.message && (
                    <div className="mt-8 pt-8 border-t border-black/[0.03]">
                      <p className="text-lg font-oracle italic text-text-main/80 leading-relaxed">
                        “{dedication.message}”
                      </p>
                    </div>
                  )}
                  <div className="mt-8 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-3 bg-brand/20" />
                      <p className="text-[9px] font-mono font-black text-text-main/30 uppercase tracking-widest">
                        {dedication.fromId === user?.uid ? 'TRANSMITTED_BY_SELF' : `RECEIVED_FROM_${partner?.displayName?.toUpperCase().replace(' ', '_')}`}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-text-main/20">{dedication.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                  </div>
                </div>
              </motion.div>
            ))}

            {dedications.length === 0 && (
              <div className="py-20 text-center space-y-6 grayscale opacity-20">
                <Music className="w-16 h-16 mx-auto" />
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.4em]">Silence is absolute</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-12 pb-40">
          {/* AI Recommendations - Re-imagined as "Hyper-Curator" */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-neo !p-10 border-brand/20 bg-brand/[0.02] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
              <Sparkles className="w-32 h-32 text-brand" />
            </div>

            <div className="space-y-10 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-brand animate-ping" />
                  <h2 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-brand">Discovery_Curator // Beta</h2>
                </div>
                <div className="flex p-1 bg-black/5 rounded-2xl">
                  {['romantic', 'vibey', 'energetic'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`px-4 py-2 text-[8px] font-mono font-black uppercase tracking-widest rounded-xl transition-all ${
                        mood === m ? 'bg-white shadow-xl text-brand' : 'opacity-40'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              
              <p className="text-xl font-display font-medium text-text-main/60 max-w-sm leading-snug">
                Fusing shared history with current <span className="text-brand font-black italic">{mood}</span> frequencies.
              </p>

              <AnimatePresence mode="wait">
                {recommendations.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid gap-4"
                  >
                    {recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-center p-4 glass-floating !rounded-[24px] group/rec"
                      >
                        {rec.coverUrl ? (
                          <img src={rec.coverUrl} className="w-12 h-12 rounded-xl object-cover mr-4 grayscale-[0.5] group-hover/rec:grayscale-0 transition-all" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mr-4">
                            <Music className="w-5 h-5 text-brand/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-bold truncate text-text-main">{rec.title}</p>
                          <p className="text-[9px] font-mono font-bold text-brand/60 uppercase truncate">{rec.artist}</p>
                        </div>
                        <button
                          onClick={() => addToPlaylist(rec)}
                          className="p-2.5 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 opacity-0 group-hover/rec:opacity-100 scale-90 group-hover/rec:scale-100 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setRecommendations([])}
                      className="w-full py-4 text-[9px] font-mono font-black uppercase tracking-[0.3em] text-text-main/20 hover:text-brand transition-all flex items-center justify-center space-x-2"
                    >
                      Reset_Suggestions
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="trigger"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={generateRecommendations}
                    disabled={isGeneratingRecs || playlist.length === 0}
                    className="w-full py-6 bg-brand text-white rounded-[28px] font-mono text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-brand/40 disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center space-x-4 group"
                  >
                    {isGeneratingRecs ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span>Discover_Melodies</span>
                      </>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="space-y-10">
            <div className="flex items-center space-x-4 opacity-40 px-2">
              <span className="w-8 h-[1.5px] bg-text-main" />
              <h2 className="text-[9px] font-mono font-black uppercase tracking-[0.6em] text-text-main">Shared_Stream</h2>
            </div>
            <div className="grid gap-6">
              {playlist.map((song, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={song.id}
                  className="card-neo !p-0 overflow-hidden group/song"
                >
                  <div className="flex items-center p-6 space-x-6">
                    <div className="relative">
                      {song.coverUrl ? (
                        <img src={song.coverUrl} className="w-18 h-18 rounded-2xl object-cover shadow-2xl transition-transform duration-700 group-hover/song:scale-110" />
                      ) : (
                        <div className="w-18 h-18 rounded-2xl bg-black/5 flex items-center justify-center transition-transform duration-700 group-hover/song:scale-110">
                          <Music className="w-7 h-7 text-brand/20" />
                        </div>
                      )}
                      {song.songUrl && (
                        <a 
                          href={song.songUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-brand/40 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover/song:opacity-100 transition-all flex items-center justify-center text-white"
                        >
                          <Play className="w-8 h-8 fill-current" />
                        </a>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-lg font-display font-bold text-text-main truncate uppercase tracking-tight leading-none">{song.title}</p>
                      <p className="text-[10px] font-mono font-black text-text-main/40 uppercase tracking-widest mt-2">{song.artist}</p>
                      <div className="mt-4 flex items-center space-x-3">
                        <div className="w-5 h-5 rounded-lg bg-brand/10 flex items-center justify-center">
                          <Heart className="w-3 h-3 text-brand fill-brand" />
                        </div>
                        <span className="text-[8px] font-mono font-black uppercase tracking-tighter text-text-main/30 translate-y-px">
                          Uplinked by {song.addedBy === user?.uid ? 'Self' : partner?.displayName?.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromPlaylist(song.id)}
                      className="p-4 bg-black/[0.02] hover:bg-red-500/10 text-text-main/10 hover:text-red-500 rounded-2xl opacity-0 group-hover/song:opacity-100 transition-all active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
              {playlist.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center space-y-4 opacity-10 grayscale">
                  <Music className="w-20 h-20" />
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest">Stream is offline</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
