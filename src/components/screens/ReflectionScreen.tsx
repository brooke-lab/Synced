import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Send, Ghost, Check, MessageSquareHeart, Eye } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

export default function ReflectionScreen() {
  const { user, couple, partner } = useAuth();
  const [reflections, setReflections] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(
      collection(db, 'couples', couple.id, 'reflections'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setReflections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [couple?.id]);

  const sendReflection = async () => {
    if (!content.trim() || !couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'reflections'), {
      coupleId: couple.id,
      authorId: user?.uid,
      content,
      status: 'unread',
      createdAt: serverTimestamp()
    });
    setContent('');
    setIsTyping(false);
  };

  const markRead = async (r: any) => {
    if (r.authorId === user?.uid || r.status !== 'unread') return;
    await updateDoc(doc(db, 'couples', couple.id, 'reflections', r.id), {
      status: 'read'
    });
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32">
      <div className="space-y-1">
        <h1 className="text-3xl font-serif font-bold text-[#4A4440]">Safe Space</h1>
        <p className="text-sm opacity-50 italic">Reflection over confrontation.</p>
      </div>

      {/* Input Area */}
      {!isTyping ? (
        <button
          onClick={() => setIsTyping(true)}
          className="w-full p-8 glass rounded-[40px] flex flex-col items-center justify-center space-y-4 border-dashed border-2 border-pink-200"
        >
          <div className="p-4 bg-pink-50 rounded-full">
            <Heart className="w-10 h-10 text-pink-300 fill-pink-100" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold">How are you feeling today?</p>
            <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">Tap to express yourself</p>
          </div>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-6 rounded-[40px] space-y-4 shadow-xl shadow-pink-100/20"
        >
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something you're struggling to communicate..."
            className="w-full p-4 bg-white/40 rounded-3xl text-sm outline-none resize-none h-48 placeholder:italic"
          />
          <div className="flex gap-3">
            <button onClick={() => setIsTyping(false)} className="flex-1 py-3 text-sm opacity-50">Hide</button>
            <button
              onClick={sendReflection}
              disabled={!content.trim()}
              className="flex-1 py-3 bg-pink-400 text-white rounded-[24px] text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-pink-100 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Share space</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* List of Reflections */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold opacity-30 px-2 mt-8">
          <MessageSquareHeart className="w-4 h-4" />
          <span>Shared Reflections</span>
        </div>
        
        <div className="space-y-4">
          {reflections.map((r, i) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={r.id}
              onClick={() => markRead(r)}
              className={`p-6 rounded-[32px] space-y-4 transition-all duration-500 cursor-pointer ${r.authorId === user?.uid ? 'bg-white shadow-sm self-end ml-12' : 'glass mr-12'}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase tracking-widest font-black opacity-30">
                  {r.authorId === user?.uid ? 'Written by you' : `${partner?.displayName || 'Partner'}'s heart`}
                </span>
                {r.status === 'read' && <Eye className="w-3 h-3 text-pink-300" />}
                {r.status === 'unread' && r.authorId !== user?.uid && <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />}
              </div>
              <p className="text-sm leading-relaxed text-[#5D544F]">
                {r.authorId !== user?.uid && r.status === 'unread' ? (
                  <span className="italic opacity-60">Wait until you're in a calm headspace to read this...</span>
                ) : (
                  r.content
                )}
              </p>
              <div className="text-[9px] opacity-20 font-black uppercase tracking-tighter">
                {r.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {r.createdAt?.toDate().toLocaleDateString()}
              </div>
            </motion.div>
          ))}
          {reflections.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center opacity-10 space-y-4 grayscale">
              <Ghost className="w-20 h-20" />
              <p className="font-serif italic text-lg">Silence is peaceful, too.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
