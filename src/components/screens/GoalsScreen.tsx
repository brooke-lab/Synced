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
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32 dotted-grid scanline">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-black text-[#4A4440] uppercase tracking-tighter">Our Goals</h1>
          <div className="flex items-center space-x-2 text-[10px] font-mono opacity-30">
            <span className="w-2 h-2 bg-green-400" />
            <span className="uppercase">Mission_Log_v3.2</span>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary p-3 bg-white rounded-2xl shadow-sm text-green-500 border border-black/5"
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
      <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-[0.3em] font-bold opacity-30 px-2">
        <Icon className="w-3 h-3" />
        <span>{title}</span>
      </div>
      <div className="space-y-4">
        {goals.map((goal: any) => {
          const ownerPhoto = goal.ownerId === user?.uid ? user.photoURL : partner?.photoURL;
          
          return (
            <div key={goal.id} className={`glass p-6 rounded-[32px] flex flex-col space-y-4 transition-all tech-border ${goal.completed ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => onToggle(goal)} 
                  className={`btn-primary transition-all ${goal.completed ? 'text-green-500' : 'text-gray-300'}`}
                >
                  {goal.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-bold truncate ${goal.completed ? 'line-through' : ''}`}>{goal.title}</p>
                    {goal.type === 'shared' && ownerPhoto && (
                      <div className="flex items-center space-x-1 opacity-40">
                        <span className="text-[8px] font-mono uppercase tracking-tighter">Updated by</span>
                        <img src={ownerPhoto} className="w-4 h-4 rounded-full" alt="Owner" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest opacity-40">
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    <span>Progression</span>
                  </div>
                  <span>{goal.progress || 0}%</span>
                </div>
                
                <div className="relative group/progress h-2 bg-black/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress || 0}%` }}
                    className={`h-full relative ${goal.completed ? 'bg-green-400' : 'bg-brand'}`}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  </motion.div>
                </div>

                {!goal.completed && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress || 0}
                    onChange={(e) => onUpdateProgress(goal, parseInt(e.target.value))}
                    className="w-full h-1 mt-2 accent-brand bg-transparent cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                  />
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
