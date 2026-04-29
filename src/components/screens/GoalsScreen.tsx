import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Plus, CheckCircle2, Circle, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../../lib/activityLogger';

export default function GoalsScreen() {
  const { user, couple, partner } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'shared' as 'shared' | 'individual' });

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(collection(db, 'couples', couple.id, 'goals'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [couple?.id]);

  const addGoal = async () => {
    if (!newGoal.title || !couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'goals'), {
      ...newGoal,
      coupleId: couple.id,
      ownerId: user?.uid,
      progress: 0,
      completed: false
    });

    await logActivity(
      couple.id,
      user?.uid || '',
      'goal',
      `added a new ${newGoal.type} goal: "${newGoal.title}"`,
      { goalTitle: newGoal.title, goalType: newGoal.type }
    );

    setIsAdding(false);
    setNewGoal({ title: '', type: 'shared' });
  };

  const toggleGoal = async (goal: any) => {
    if (!couple?.id) return;
    const goalRef = doc(db, 'couples', couple.id, 'goals', goal.id);
    const newStatus = !goal.completed;
    await updateDoc(goalRef, {
      completed: newStatus,
      progress: newStatus ? 100 : 0
    });

    if (newStatus) {
      await logActivity(
        couple.id,
        user?.uid || '',
        'goal',
        `completed the goal: "${goal.title}" 🎉`,
        { goalTitle: goal.title }
      );
    }
  };

  const updateProgress = async (goal: any, newProgress: number) => {
    if (!couple?.id) return;
    const goalRef = doc(db, 'couples', couple.id, 'goals', goal.id);
    await updateDoc(goalRef, {
      progress: newProgress,
      completed: newProgress === 100
    });

    if (newProgress === 100) {
      await logActivity(
        couple.id,
        user?.uid || '',
        'goal',
        `reached 100% on: "${goal.title}" 🏆`,
        { goalTitle: goal.title }
      );
    }
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32 dotted-grid scanline">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-black text-text-main uppercase tracking-tighter glow-text-white">Our Goals</h1>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-brand font-bold glow-brand">
            <span className="w-2 h-2 bg-brand animate-ping rounded-full" />
            <span className="uppercase tracking-[0.2em]">Mission_Log_v3.2</span>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="p-3 bg-brand text-white rounded-2xl shadow-xl shadow-brand/20 hover:scale-105 transition-all glow-brand"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-10">
        <Section title="Shared Journey" goals={goals.filter(g => g.type === 'shared')} onToggle={toggleGoal} onUpdateProgress={updateProgress} icon={Users} user={user} partner={partner} />
        <Section title="My Growth" goals={goals.filter(g => g.type === 'individual' && g.ownerId === user?.uid)} onToggle={toggleGoal} onUpdateProgress={updateProgress} icon={UserIcon} user={user} partner={partner} />
        {partner && (
          <Section 
            title={`${user?.nicknames?.[partner.uid] || partner.displayName || 'Partner'}'s Growth`} 
            goals={goals.filter(g => g.type === 'individual' && g.ownerId === partner.uid)} 
            onToggle={toggleGoal} 
            onUpdateProgress={updateProgress}
            icon={UserIcon} 
            user={user}
            partner={partner}
          />
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm glass rounded-[40px] p-8 space-y-6">
            <h3 className="text-xl font-serif">New Goal</h3>
            <div className="space-y-4">
              <input
                value={newGoal.title}
                onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                placeholder="What do you want to achieve?"
                className="w-full p-4 bg-white/50 rounded-2xl outline-none text-sm"
              />
              <div className="flex gap-2">
                <FilterBtn active={newGoal.type === 'shared'} onClick={() => setNewGoal({...newGoal, type: 'shared'})} label="Shared" />
                <FilterBtn active={newGoal.type === 'individual'} onClick={() => setNewGoal({...newGoal, type: 'individual'})} label="Personal" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-3 text-sm opacity-50">Cancel</button>
              <button onClick={addGoal} className="flex-1 py-3 bg-[#4A4440] text-white rounded-2xl text-sm font-bold">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, goals, onToggle, onUpdateProgress, icon: Icon, user, partner }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 px-2 opacity-40">
        <span className="w-8 h-[1px] bg-text-main" />
        <h3 className="text-[9px] font-mono font-black uppercase tracking-[0.6em] text-text-main">{title}</h3>
      </div>
      <div className="space-y-4">
        {goals.map((goal: any) => {
          const ownerPhoto = goal.ownerId === user?.uid ? user.photoURL : partner?.photoURL;
          
          return (
            <div key={goal.id} className={`card-neo !p-6 flex flex-col space-y-4 transition-all relative overflow-hidden group ${goal.completed ? 'opacity-40 grayscale blur-[0.5px]' : ''}`}>
              <div className="absolute inset-0 pointer-events-none opacity-[0.02] animate-scanning bg-gradient-to-b from-brand to-transparent" />
              <div className="flex items-center space-x-4 relative z-10">
                <button 
                  onClick={() => onToggle(goal)} 
                  className={`transition-all hover:scale-110 active:scale-90 ${goal.completed ? 'text-brand glow-brand' : 'text-white/20'}`}
                >
                  {goal.completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                </button>
                
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-md font-display font-bold text-text-main tracking-tight ${goal.completed ? 'line-through opacity-50' : 'glow-text-white'}`}>{goal.title}</p>
                    {goal.type === 'shared' && ownerPhoto && (
                      <div className="flex items-center space-x-2 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                        <span className="text-[7px] font-mono uppercase tracking-tighter opacity-30">Actor</span>
                        <img src={ownerPhoto} className="w-4 h-4 rounded-full border border-white/20" alt="Owner" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-white/30">
                  <div className="flex items-center space-x-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${goal.completed ? 'bg-brand' : 'bg-brand animate-pulse'} glow-brand`} />
                    <span className="font-black">Operational_Sync</span>
                  </div>
                  <span className={goal.completed ? 'text-brand glow-brand font-black' : ''}>{goal.progress || 0}%</span>
                </div>
                
                <div className="relative group/progress h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress || 0}%` }}
                    className={`h-full relative ${goal.completed ? 'bg-brand' : 'bg-brand shadow-[0_0_15px_rgba(230,0,76,0.5)]'}`}
                  >
                    <div className="absolute inset-0 bg-white/10 animate-shimmer" />
                  </motion.div>
                </div>

                {!goal.completed && (
                  <div className="pt-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={goal.progress || 0}
                      onChange={(e) => onUpdateProgress(goal, parseInt(e.target.value))}
                      className="w-full h-1.5 accent-brand bg-black/5 rounded-lg cursor-pointer transition-all active:scale-[1.02]"
                    />
                    <div className="flex justify-between mt-1 px-1">
                      <span className="text-[8px] font-mono opacity-20 uppercase">Start</span>
                      <span className="text-[8px] font-mono opacity-20 uppercase">Complete</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="py-8 text-center glass rounded-[32px] border border-dashed border-black/5">
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-20 italic">No objectives assigned.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${active ? 'bg-brand-soft text-brand' : 'bg-white/30 text-gray-400'}`}
    >
      {label}
    </button>
  );
}
