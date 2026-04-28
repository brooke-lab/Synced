import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Plus, CheckCircle2, Circle, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';

export default function GoalsScreen() {
  const { user, couple } = useAuth();
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
    if (!newGoal.title) return;
    await addDoc(collection(db, 'couples', couple.id, 'goals'), {
      ...newGoal,
      coupleId: couple.id,
      ownerId: user?.uid,
      progress: 0,
      completed: false
    });
    setIsAdding(false);
    setNewGoal({ title: '', type: 'shared' });
  };

  const toggleGoal = async (goal: any) => {
    const goalRef = doc(db, 'couples', couple.id, 'goals', goal.id);
    await updateDoc(goalRef, {
      completed: !goal.completed,
      progress: !goal.completed ? 100 : 0
    });
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-[#4A4440]">Our Goals</h1>
          <p className="text-sm opacity-50 italic">Growing side by side.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="p-3 bg-white rounded-2xl shadow-sm text-green-500 hover:scale-110 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-8">
        <Section title="Shared Journey" goals={goals.filter(g => g.type === 'shared')} onToggle={toggleGoal} icon={Users} />
        <Section title="My Growth" goals={goals.filter(g => g.type === 'individual' && g.ownerId === user?.uid)} onToggle={toggleGoal} icon={UserIcon} />
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

function Section({ title, goals, onToggle, icon: Icon }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold opacity-30 px-2">
        <Icon className="w-3 h-3" />
        <span>{title}</span>
      </div>
      <div className="space-y-3">
        {goals.map((goal: any) => (
          <div key={goal.id} className={`glass p-5 rounded-[28px] flex items-center space-x-4 transition-all ${goal.completed ? 'opacity-40' : ''}`}>
            <button onClick={() => onToggle(goal)} className="text-[#4A4440] hover:scale-110 active:scale-95 transition-all">
              {goal.completed ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${goal.completed ? 'line-through' : ''}`}>{goal.title}</p>
              <div className="w-full h-1 bg-black/5 rounded-full mt-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress}%` }}
                  className="h-full bg-green-400"
                />
              </div>
            </div>
          </div>
        ))}
        {goals.length === 0 && <p className="text-xs italic opacity-20 px-2">No goals in this section yet.</p>}
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${active ? 'bg-pink-100 text-pink-600' : 'bg-white/30 text-gray-400'}`}
    >
      {label}
    </button>
  );
}
