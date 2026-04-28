import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Search, Heart, Send, Plus, History } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function MusicScreen() {
  const { user, couple, partner } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dedications, setDedications] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [selectedSong, setSelectedSong] = useState<any>(null);

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

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for songs matching: "${searchQuery}". Return a JSON array of 5 songs with: title, artist, coverUrl (use aesthetic Unsplash urls related to music), and spotifyMockUrl.`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text);
      setResults(data);
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
      toId: partner?.id,
      songTitle: selectedSong.title,
      artist: selectedSong.artist,
      coverUrl: selectedSong.coverUrl,
      message,
      createdAt: serverTimestamp()
    });
    setSelectedSong(null);
    setMessage('');
    setSearchQuery('');
    setResults([]);
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen">
      <div className="space-y-1">
        <h1 className="text-3xl font-serif font-bold text-[#4A4440]">Music</h1>
        <p className="text-sm opacity-50 italic">Dedicate a song to your partner today.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchSongs()}
          placeholder="Search for a song..."
          className="w-full pl-12 pr-4 py-4 glass rounded-3xl outline-none focus:ring-2 ring-pink-200 transition-all text-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
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
              <button
                key={i}
                onClick={() => setSelectedSong(song)}
                className="flex items-center p-3 glass rounded-2xl hover:bg-white/50 transition-colors text-left"
              >
                <img src={song.coverUrl} className="w-12 h-12 rounded-xl object-cover mr-4" />
                <div>
                  <p className="text-sm font-bold">{song.title}</p>
                  <p className="text-[10px] opacity-50">{song.artist}</p>
                </div>
                <Plus className="ml-auto w-4 h-4 opacity-30" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedication Modal */}
      {selectedSong && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            layoutId="dedicate"
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
                className="flex-1 py-4 bg-pink-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-pink-100 flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Dedicate</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dedications Timeline */}
      <section className="space-y-6 pb-8">
        <div className="flex items-center space-x-2 opacity-40">
          <History className="w-4 h-4" />
          <h2 className="text-xs uppercase tracking-widest font-bold">Timeline</h2>
        </div>
        <div className="space-y-6 relative ml-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-pink-100" />
          {dedications.map((dedication, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={dedication.id}
              className="relative pl-8"
            >
              <div className="absolute left-[-4px] top-6 w-2 h-2 rounded-full bg-pink-300" />
              <div className="glass p-6 rounded-[32px] space-y-4">
                <div className="flex items-center space-x-4">
                  <img src={dedication.coverUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{dedication.songTitle}</p>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest">{dedication.artist}</p>
                  </div>
                </div>
                {dedication.message && (
                  <p className="text-sm italic opacity-70 border-l-2 border-pink-100 pl-3">
                    "{dedication.message}"
                  </p>
                )}
                <div className="flex justify-between items-center text-[10px] opacity-30 font-bold uppercase tracking-widest">
                  <span>{dedication.fromId === user?.uid ? 'Dedication by you' : `Dedication by ${partner?.displayName || 'partner'}`}</span>
                  <span>{dedication.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {dedications.length === 0 && (
            <div className="py-12 text-center opacity-30 text-sm italic">
              No dedications yet. Be the first! ✨
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
