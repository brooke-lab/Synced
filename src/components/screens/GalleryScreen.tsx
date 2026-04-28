import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, Play, Plus, Trash2, X, Maximize2, Heart } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

export default function GalleryScreen() {
  const { user, couple } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState('');
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

  const addItem = async () => {
    if (!url.trim() || !couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'gallery'), {
      url,
      type,
      addedBy: user?.uid,
      createdAt: serverTimestamp()
    });
    setUrl('');
    setIsAdding(false);
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
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
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <button 
                onClick={(e) => deleteItem(item.id, e)}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/50"
              >
                <Trash2 className="w-3 h-3" />
              </button>
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
                <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-full rounded-xl" />
              )}
              
              <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-8 right-8 p-4 bg-white/10 backdrop-blur-xl rounded-full text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
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
