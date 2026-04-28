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
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32">
      <div className="space-y-1">
        <h1 className="text-3xl font-serif font-bold text-text-main">Activity</h1>
        <p className="text-sm opacity-50 italic">Captured moments of your journey.</p>
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
                <div className="absolute left-[-4px] top-6 w-2 h-2 rounded-full bg-brand ring-4 ring-bg-app" />
                
                <div className="glass p-5 rounded-[28px] space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white shrink-0">
                      {actor.photo ? (
                        <img src={actor.photo} alt={actor.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-brand">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-bold">{actor.name}</span>
                        <span className="opacity-60 ml-1">{activity.content}</span>
                      </p>
                      <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest mt-0.5">
                        {activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-brand-soft flex items-center justify-center text-brand shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>

                  {/* Metadata Previews */}
                  {activity.type === 'music' && activity.metadata?.coverUrl && (
                    <div className="flex items-center space-x-3 p-3 bg-white/40 rounded-2xl">
                      <img src={activity.metadata.coverUrl} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{activity.metadata.songTitle}</p>
                        <p className="text-[10px] opacity-50 truncate">{activity.metadata.artist}</p>
                      </div>
                    </div>
                  )}

                  {activity.type === 'gallery' && activity.metadata?.url && (
                    <div className="rounded-2xl overflow-hidden aspect-video bg-black/5">
                      {activity.metadata.type === 'image' ? (
                        <img src={activity.metadata.url} className="w-full h-full object-cover" />
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
