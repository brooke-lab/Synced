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
      const data = JSON.parse(response.text);
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
      
      const data = JSON.parse(response.text);
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
    <div className="p-6 pt-12 space-y-8 min-h-screen dotted-grid scanline">
      <div className="space-y-1">
        <h1 className="text-4xl font-display font-black text-[#4A4440] uppercase tracking-tighter">Music</h1>
        <div className="flex items-center space-x-2 text-[10px] font-mono opacity-30">
          <span className="w-2 h-2 bg-brand" />
          <span className="uppercase">Audio_Module_v1.4</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-black/5 rounded-2xl border border-black/5">
        <button
          onClick={() => setActiveTab('dedications')}
          className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'dedications' ? 'bg-white shadow-sm text-brand' : 'opacity-40'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Timeline</span>
        </button>
        <button
          onClick={() => setActiveTab('playlist')}
          className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'playlist' ? 'bg-white shadow-sm text-brand' : 'opacity-40'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Playlist</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-brand opacity-0 group-focus-within:opacity-5 transition-opacity blur rounded-[32px]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchSongs()}
          placeholder="SEARCH_TRACKS..."
          className="w-full pl-12 pr-4 py-4 glass rounded-[28px] outline-none border-brand/10 focus:border-brand/30 transition-all text-xs font-mono uppercase tracking-wider"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid gap-3"
          >
            {results.map((song, i) => (
              <div
                key={i}
                className="flex items-center p-3 glass rounded-2xl hover:bg-white/50 transition-colors text-left group"
              >
                <img src={song.coverUrl} className="w-12 h-12 rounded-xl object-cover mr-4" />
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-bold truncate">{song.title}</p>
                  <p className="text-[10px] opacity-50 truncate">{song.artist}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => addToPlaylist(song)}
                    className="p-2 hover:bg-brand/10 text-brand rounded-lg transition-colors"
                    title="Add to Playlist"
                  >
                    <ListMusic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedSong(song)}
                    className="p-2 hover:bg-brand text-white bg-brand/10 text-brand rounded-lg transition-colors"
                    title="Dedicate"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedication Modal */}
      <AnimatePresence>
        {selectedSong && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#FAF7F2] rounded-[40px] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <img src={selectedSong.coverUrl} className="w-40 h-40 rounded-[32px] shadow-2xl" />
                <div>
                  <h3 className="text-xl font-serif font-bold">{selectedSong.title}</h3>
                  <p className="text-sm opacity-50">{selectedSong.artist}</p>
                </div>
              </div>
              
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Why this song today? (optional)"
                className="w-full p-4 glass rounded-3xl text-sm outline-none resize-none h-24"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedSong(null)}
                  className="flex-1 py-4 glass rounded-2xl text-sm font-medium opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={dedicateSong}
                  className="flex-1 py-4 bg-brand text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand/20 flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Dedicate</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Confirmation Dialog */}
      <AnimatePresence>
        {showShareConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xs bg-white rounded-[40px] p-8 space-y-6 text-center shadow-2xl overflow-hidden relative"
            >
              <div className="w-16 h-16 bg-brand-soft rounded-2xl flex items-center justify-center mx-auto text-brand">
                <Share2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold">Share Dedication</h3>
                <p className="text-sm opacity-50 px-4">Ready to spread the love for "{showShareConfirm.songTitle}"?</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => shareSong(showShareConfirm)}
                  disabled={isCopied}
                  className={`py-4 rounded-3xl text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
                    isCopied ? 'bg-green-500 text-white' : 'bg-brand text-white shadow-lg shadow-brand/20'
                  }`}
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  <span>{isCopied ? 'Copied!' : 'Share Now'}</span>
                </button>
                <button
                  onClick={() => setShowShareConfirm(null)}
                  className="py-4 text-sm font-medium opacity-40 hover:opacity-100 transition-opacity"
                >
                  Maybe later
                </button>
              </div>

              {isCopied && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-green-500/10 pointer-events-none"
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Timeline or Playlist View */}
      {activeTab === 'dedications' ? (
        <section className="space-y-6 pb-8">
          <div className="flex items-center space-x-2 opacity-40">
            <History className="w-4 h-4" />
            <h2 className="text-[10px] uppercase font-mono tracking-[0.3em] font-bold">Timeline // Dedications</h2>
          </div>
          <div className="space-y-6 relative ml-4">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-brand-soft" />
            {dedications.map((dedication, i) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={dedication.id}
                className="relative pl-8"
              >
                <div className="absolute left-[-4px] top-6 w-2 h-2 rounded-full bg-brand" />
                <motion.div 
                  whileHover={{ y: -4, scale: 1.02, boxShadow: "0 12px 40px rgba(0,0,0,0.06)" }}
                  className="glass p-6 rounded-[32px] space-y-4 cursor-default border border-transparent hover:border-brand/5 active:scale-[0.98] transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <img src={dedication.coverUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{dedication.songTitle}</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest">{dedication.artist}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => addToPlaylist({ title: dedication.songTitle, artist: dedication.artist, coverUrl: dedication.coverUrl, songUrl: dedication.songUrl })}
                        className="p-3 glass rounded-2xl hover:bg-brand/10 text-brand transition-all active:scale-95"
                        title="Add to Playlist"
                      >
                        <ListMusic className="w-4 h-4" />
                      </button>
                      {dedication.songUrl && (
                        <a 
                          href={dedication.songUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-3 glass rounded-2xl hover:bg-brand hover:text-white transition-all active:scale-95 text-brand"
                          title="Listen on Spotify"
                        >
                          <Play className="w-4 h-4 fill-current" /> 
                        </a>
                      )}
                      <button 
                        onClick={() => setShowShareConfirm(dedication)}
                        className="p-3 glass rounded-2xl hover:bg-white/50 transition-all active:scale-95 text-brand"
                        title="Share song"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {dedication.message && (
                    <p className="text-sm italic opacity-70 border-l-2 border-brand/20 pl-3">
                      "{dedication.message}"
                    </p>
                  )}
                  <div className="flex justify-between items-center text-[10px] opacity-30 font-bold uppercase tracking-widest">
                    <span>{dedication.fromId === user?.uid ? 'Dedication by you' : `Dedication by ${partner?.displayName || 'partner'}`}</span>
                    <span>{dedication.createdAt?.toDate().toLocaleDateString()}</span>
                  </div>
                </motion.div>
              </motion.div>
            ))}
            {dedications.length === 0 && (
              <div className="py-12 text-center opacity-30 text-sm italic">
                No dedications yet. Be the first! ✨
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-8 pb-32">
          {/* AI Recommendations */}
          <div className="glass p-8 rounded-[40px] space-y-6 border border-brand/10 tech-border scanline">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-brand">
                <Sparkles className="w-5 h-5 shadow-[0_0_10px_rgba(244,114,182,0.3)]" />
                <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Magic_Radio // Suggester</h2>
              </div>
              <div className="flex items-center space-x-1 bg-black/5 p-1 rounded-xl">
                {['romantic', 'vibey', 'energetic'].map(m => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-3 py-1.5 text-[7px] font-mono font-black uppercase tracking-widest rounded-lg transition-all ${
                      mood === m ? 'bg-white shadow-sm text-brand' : 'opacity-30'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            
            <p className="text-xs opacity-40 leading-relaxed">
              Let AI curate a special list for you based on your taste and current mood.
            </p>

            {recommendations.length > 0 ? (
              <div className="grid gap-3">
                {recommendations.map((rec, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className="flex items-center p-3 bg-white/40 rounded-2xl group"
                  >
                    <img src={rec.coverUrl} className="w-10 h-10 rounded-xl object-cover mr-4" />
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs font-bold truncate">{rec.title}</p>
                      <p className="text-[8px] opacity-40 truncate">{rec.artist}</p>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => addToPlaylist(rec)}
                        className="p-2 hover:bg-brand/10 text-brand rounded-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                <button 
                  onClick={() => setRecommendations([])}
                  className="w-full py-3 text-[10px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity flex items-center justify-center space-x-2"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Magic</span>
                </button>
              </div>
            ) : (
              <button
                onClick={generateRecommendations}
                disabled={isGeneratingRecs || playlist.length === 0}
                className="w-full py-4 bg-brand text-white rounded-3xl text-sm font-bold shadow-lg shadow-brand/20 disabled:opacity-40 flex items-center justify-center space-x-2 active:scale-95 transition-all"
              >
                {isGeneratingRecs ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Mix</span>
                  </>
                )}
              </button>
            )}
            {playlist.length === 0 && <p className="text-[10px] text-center opacity-30 italic">Add some songs to your playlist first!</p>}
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-2 opacity-40">
              <ListMusic className="w-4 h-4" />
              <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold">Shared_Playlist // Sync</h2>
            </div>
            <div className="grid gap-4">
              {playlist.map((song, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={song.id}
                  className="glass p-4 rounded-[28px] flex items-center space-x-4 relative group"
                >
                  <div className="relative">
                    <img src={song.coverUrl} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                    {song.songUrl && (
                      <a 
                        href={song.songUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-brand/20 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Play className="w-6 h-6 fill-current" />
                      </a>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-sm font-bold truncate">{song.title}</p>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest">{song.artist}</p>
                    <div className="mt-1 flex items-center space-x-1.5">
                      <div className="w-4 h-4 rounded-full bg-brand/10 flex items-center justify-center">
                        <Heart className="w-2.5 h-2.5 text-brand fill-current" />
                      </div>
                      <span className="text-[8px] opacity-30 font-black uppercase">
                        Added by {song.addedBy === user?.uid ? 'You' : (partner?.displayName || 'Partner')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromPlaylist(song.id)}
                    className="p-3 glass rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
              {playlist.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-20">
                  <Music className="w-12 h-12" />
                  <p className="text-sm italic">Search and add songs to start your playlist.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
