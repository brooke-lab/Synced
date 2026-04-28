import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, Play, Plus, Trash2, X, Heart, Pause, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { doc, addDoc, collection, serverTimestamp, query, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';
import { logActivity } from '../../lib/activityLogger';

function CustomVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * (videoRef.current?.duration || 0);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMute = !isMuted;
      setIsMuted(newMute);
      videoRef.current.muted = newMute;
      if (!newMute && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center group"
      onMouseMove={resetControlsTimeout}
      onClick={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        className="max-w-full max-h-full rounded-xl"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 left-6 right-6 glass p-4 rounded-3xl space-y-4 z-10"
          >
            <div className="flex items-center space-x-4">
              <button onClick={togglePlay} className="text-brand">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand"
              />

              <div className="flex items-center space-x-2 w-24">
                <button onClick={toggleMute} className="opacity-50 hover:opacity-100">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PREDEFINED_TAGS = ['Happy', 'Romantic', 'Fun', 'Cozy', 'Adventure'];

export default function GalleryScreen() {
  const { user, couple } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [type, setType] = useState<'image' | 'video'>('image');
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(
      collection(db, 'couples', couple.id, 'gallery'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [couple?.id]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addItem = async () => {
    if (!url.trim() || !couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'gallery'), {
      url,
      caption,
      type,
      tags: selectedTags,
      addedBy: user?.uid,
      createdAt: serverTimestamp()
    });

    await logActivity(
      couple.id,
      user?.uid || '',
      'gallery',
      `added a new ${type}${selectedTags.length > 0 ? ` (${selectedTags.join(', ')})` : ''}`,
      { url, type, caption, tags: selectedTags }
    );

    setUrl('');
    setCaption('');
    setSelectedTags([]);
    setIsAdding(false);
  };

  const deleteItem = async (id: string, e: any) => {
    e.stopPropagation();
    if (!couple?.id) return;
    if (confirm('Remove this memory?')) {
      await deleteDoc(doc(db, 'couples', couple.id, 'gallery', id));
    }
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold text-text-main">Memories</h1>
          <p className="text-sm opacity-50 italic">Our shared moments.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-brand text-white rounded-2xl shadow-lg shadow-brand/20 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <motion.div
            layoutId={item.id}
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className="aspect-square bg-gray-100 rounded-3xl overflow-hidden relative group cursor-pointer"
          >
            {item.type === 'image' ? (
              <img src={item.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            ) : (
              <div className="w-full h-full bg-black/5 flex items-center justify-center relative">
                <Play className="w-8 h-8 text-brand/40" />
                <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
              </div>
            )}
            
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 space-y-2">
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag: string) => (
                      <span key={tag} className="text-[8px] bg-brand/30 backdrop-blur-md text-white px-1.5 py-0.5 rounded-full font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <button 
                    onClick={(e) => deleteItem(item.id, e)}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
          </motion.div>
        ))}

        {items.length === 0 && (
          <div className="col-span-2 py-20 flex flex-col items-center justify-center opacity-10 space-y-4 grayscale">
            <Image className="w-20 h-20" />
            <p className="text-sm font-black uppercase tracking-widest">Gallery Empty</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-app/80 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setIsAdding(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm glass p-8 rounded-[40px] space-y-6"
            >
              <div className="text-center">
                <h3 className="text-xl font-bold">Add Memory</h3>
                <p className="text-xs opacity-50 italic">Enter a photo or video URL</p>
              </div>

              <div className="flex p-1 bg-black/5 rounded-2xl">
                <button 
                  onClick={() => setType('image')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'image' ? 'bg-white shadow-sm text-brand' : 'opacity-40'}`}
                >
                  Photo
                </button>
                <button 
                  onClick={() => setType('video')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'video' ? 'bg-white shadow-sm text-brand' : 'opacity-40'}`}
                >
                  Video
                </button>
              </div>

              <input 
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://images.com/our-date..."
                className="w-full p-4 bg-white/40 rounded-2xl text-sm outline-none font-mono"
              />

              <input 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="w-full p-4 bg-white/40 rounded-2xl text-sm outline-none"
              />

              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-1">How does this feel?</p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                        selectedTags.includes(tag) 
                          ? 'bg-brand text-white shadow-md' 
                          : 'bg-black/5 opacity-40'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest opacity-30">Cancel</button>
                <button 
                  onClick={addItem}
                  disabled={!url.trim()}
                  className="flex-1 py-4 bg-brand text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand/20 disabled:opacity-50"
                >
                  Save Moment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedMedia && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setSelectedMedia(null)}
          >
            <motion.div layoutId={selectedMedia.id} className="relative w-full max-w-4xl h-full flex items-center justify-center p-4">
               {selectedMedia.type === 'image' ? (
                <img src={selectedMedia.url} className="max-w-full max-h-full object-contain rounded-xl" />
              ) : (
                <CustomVideoPlayer src={selectedMedia.url} />
              )}
              
              <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-8 right-8 p-4 bg-white/10 backdrop-blur-xl rounded-full text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center space-y-4">
                 {(selectedMedia.caption || (selectedMedia.tags && selectedMedia.tags.length > 0)) && (
                   <div className="max-w-md bg-black/40 backdrop-blur-xl px-6 py-4 rounded-[28px] text-white text-center space-y-3">
                     {selectedMedia.caption && <p className="text-sm font-medium leading-relaxed">{selectedMedia.caption}</p>}
                     {selectedMedia.tags && selectedMedia.tags.length > 0 && (
                       <div className="flex flex-wrap justify-center gap-2">
                         {selectedMedia.tags.map((tag: string) => (
                           <span key={tag} className="px-3 py-1 bg-brand/20 border border-brand/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-light">
                             {tag}
                           </span>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
                 <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full flex items-center space-x-3 text-white">
                    <Heart className="w-4 h-4 fill-brand text-brand" />
                    <span className="text-xs font-bold uppercase tracking-widest">Our Memory</span>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
