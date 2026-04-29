import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Image, Target, Calendar, Edit3, User, Film, Clock, Heart } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Activity } from '../../types';

export default function ActivityScreen() {
  const { user, couple, partner } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!couple?.id) return;

    const q = query(
      collection(db, 'couples', couple.id, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [couple?.id]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music className="w-4 h-4" />;
      case 'gallery': return <Image className="w-4 h-4" />;
      case 'goal': return <Target className="w-4 h-4" />;
      case 'plan': return <Calendar className="w-4 h-4" />;
      case 'reflection': return <Edit3 className="w-4 h-4" />;
      case 'status': return <User className="w-4 h-4" />;
      case 'movie': return <Film className="w-4 h-4" />;
      case 'nickname': return <Heart className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getActorInfo = (userId: string) => {
    if (userId === user?.uid) return { name: 'You', photo: user.photoURL };
    return { name: partner?.displayName || 'Partner', photo: partner?.photoURL };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32 dotted-grid scanline">
      <div className="space-y-1">
        <h1 className="text-4xl font-display font-black text-text-main uppercase tracking-tighter glow-text-white">Activity Log</h1>
        <div className="flex items-center space-x-2 text-[10px] font-mono text-brand font-bold glow-brand">
          <span className="w-2 h-2 bg-brand animate-ping rounded-full" />
          <span className="uppercase tracking-[0.2em]">Operational_Log_v2.4</span>
        </div>
      </div>

      <div className="space-y-6 relative ml-4">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-brand-soft" />
        
        <AnimatePresence>
          {activities.map((activity, i) => {
            const actor = getActorInfo(activity.userId);
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-8"
              >
                <div className="absolute left-[-4px] top-6 w-2 h-2 rounded-full bg-brand ring-4 ring-bg-app shadow-[0_0_12px_rgba(230,0,76,0.8)] animate-pulse" />
                
                <div className="card-neo !p-5 space-y-4 relative overflow-hidden group hover:bg-brand/[0.02] transition-colors">
                  <div className="absolute inset-0 pointer-events-none opacity-[0.02] animate-scanning bg-gradient-to-b from-brand to-transparent" />
                  <div className="flex items-center space-x-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 shrink-0 border border-white/10 shadow-inner">
                      {actor.photo ? (
                        <img src={actor.photo} alt={actor.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-mono font-bold text-brand uppercase">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-display font-bold text-text-main glow-text-white">{actor.name}</span>
                        <div className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">
                          {activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                        </span>
                      </div>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {activity.content}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0 border border-brand/20 glow-brand">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>

                  {/* Metadata Previews */}
                  {activity.type === 'music' && activity.metadata?.coverUrl && (
                    <div className="flex items-center space-x-3 p-3 bg-white/40 rounded-2xl">
                      {activity.metadata.coverUrl && <img src={activity.metadata.coverUrl} className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{activity.metadata.songTitle}</p>
                        <p className="text-[10px] opacity-50 truncate">{activity.metadata.artist}</p>
                      </div>
                    </div>
                  )}

                  {activity.type === 'gallery' && activity.metadata?.url && (
                    <div className="rounded-2xl overflow-hidden aspect-video bg-black/5">
                      {activity.metadata.type === 'image' ? (
                        activity.metadata.url && <img src={activity.metadata.url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {activities.length === 0 && (
          <div className="py-20 text-center space-y-4 opacity-20">
            <Heart className="w-12 h-12 mx-auto" />
            <p className="text-sm font-black uppercase tracking-widest leading-relaxed px-12">
              Waiting for shared moments to sprout...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
