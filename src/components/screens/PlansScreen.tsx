import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalIcon, Plus, MapPin, Clock, Star, PartyPopper, Sparkles, Heart, Gift } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export default function PlansScreen() {
  const { user, couple } = useAuth();
  const [activeView, setActiveView] = useState<'calendar' | 'vision'>('calendar');
  const [plans, setPlans] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlan, setNewPlan] = useState({ title: '', date: '', type: 'date' });
  const [isEditingAnniversary, setIsEditingAnniversary] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState(couple?.anniversary || '');
  const [anniversaryMessage, setAnniversaryMessage] = useState(couple?.anniversaryMessage || '');

  useEffect(() => {
    if (couple) {
      setAnniversaryDate(couple.anniversary || '');
      setAnniversaryMessage(couple.anniversaryMessage || '');
    }
  }, [couple]);

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(collection(db, 'couples', couple.id, 'plans'));
    const unsub = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qPins = query(collection(db, 'couples', couple.id, 'visionBoard'));
    const unsubPins = onSnapshot(qPins, (snap) => {
      setPins(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsub(); unsubPins(); };
  }, [couple?.id]);

  const addPlan = async () => {
    if (!newPlan.title || !newPlan.date) return;
    await addDoc(collection(db, 'couples', couple.id, 'plans'), {
      ...newPlan,
      coupleId: couple.id,
      createdAt: serverTimestamp()
    });
    setIsAdding(false);
    setNewPlan({ title: '', date: '', type: 'date' });
  };

  const addPin = async () => {
    const url = prompt("Enter image URL for your vision pin:");
    if (!url) return;
    await addDoc(collection(db, 'couples', couple.id, 'visionBoard'), {
      imageUrl: url,
      coupleId: couple.id,
      ownerId: user?.uid,
      boardType: 'shared',
      createdAt: serverTimestamp()
    });
  };

  const updateAnniversary = async () => {
    if (!anniversaryDate || !couple?.id) return;
    const coupleRef = doc(db, 'couples', couple.id);
    await updateDoc(coupleRef, {
      anniversary: anniversaryDate,
      anniversaryMessage: anniversaryMessage
    });
    setIsEditingAnniversary(false);
  };

  const getCountdown = (dateString: string) => {
    if (!dateString) return null;
    const today = new Date();
    const anni = new Date(dateString);
    
    // Set to this year
    let nextAnni = new Date(today.getFullYear(), anni.getMonth(), anni.getDate());
    
    // If it already passed this year, set to next year
    if (nextAnni < today) {
      nextAnni.setFullYear(today.getFullYear() + 1);
    }
    
    const diff = nextAnni.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysToAnniversary = getCountdown(couple?.anniversary);

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-[#4A4440]">{activeView === 'calendar' ? 'Our Plans' : 'Vision Board'}</h1>
          <p className="text-sm opacity-50 italic">{activeView === 'calendar' ? 'Making memories' : 'Dreaming together'}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView(activeView === 'calendar' ? 'vision' : 'calendar')}
            className="p-3 glass rounded-2xl text-pink-400"
          >
            {activeView === 'calendar' ? <Sparkles className="w-6 h-6" /> : <CalIcon className="w-6 h-6" />}
          </button>
          <button
            onClick={() => activeView === 'calendar' ? setIsAdding(true) : addPin()}
            className="p-3 bg-[#4A4440] rounded-2xl shadow-sm text-white hover:scale-110 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {activeView === 'calendar' && (
        <section className={`p-6 rounded-[40px] space-y-6 relative overflow-hidden transition-all duration-500 ${couple?.anniversary ? 'glass shadow-xl shadow-pink-100/20' : 'bg-pink-50 border-2 border-dashed border-pink-200 animate-pulse-slow'}`}>
          <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
            <Gift className="w-24 h-24" />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <PartyPopper className={`w-4 h-4 ${couple?.anniversary ? 'text-pink-400' : 'text-pink-300'}`} />
              <h3 className="text-sm font-bold opacity-80">Anniversary</h3>
            </div>
            {!isEditingAnniversary ? (
              <button 
                onClick={() => setIsEditingAnniversary(true)} 
                className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full transition-all ${couple?.anniversary ? 'text-pink-500 bg-pink-50 hover:bg-pink-100' : 'text-white bg-pink-400 shadow-lg shadow-pink-200'}`}
              >
                {couple?.anniversary ? 'Update' : 'Set your date'}
              </button>
            ) : (
              <button onClick={updateAnniversary} className="text-[10px] uppercase font-black tracking-widest text-white bg-green-400 px-3 py-1 rounded-full shadow-lg shadow-green-100">
                Confirm
              </button>
            )}
          </div>

          {!isEditingAnniversary ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {couple?.anniversary ? (
                  <>
                    <div className="space-y-1">
                      <motion.p 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-4xl font-serif font-black text-[#4A4440]"
                      >
                        {daysToAnniversary !== null ? daysToAnniversary : '??'}
                      </motion.p>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-30">Days left</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-serif font-bold text-pink-500">
                        {new Date(couple.anniversary).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-[10px] opacity-40 italic">to celebrate your love</p>
                    </div>
                  </>
                ) : (
                  <div className="py-2 text-center w-full">
                    <p className="text-sm font-medium opacity-60 italic">When did your journey begin?</p>
                  </div>
                )}
              </div>
              {couple?.anniversaryMessage && (
                <div className="pt-4 border-t border-pink-100/30">
                  <p className="text-sm italic text-[#5D544F] opacity-70">"{couple.anniversaryMessage}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest opacity-30">The Date</label>
                <input
                  type="date"
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                  className="w-full p-4 bg-white/80 backdrop-blur-sm rounded-3xl outline-none text-sm font-bold text-[#4A4440] border border-pink-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest opacity-30">A Message (optional)</label>
                <textarea
                  value={anniversaryMessage}
                  onChange={(e) => setAnniversaryMessage(e.target.value)}
                  placeholder="e.g. Can't wait for our trip!"
                  className="w-full p-4 bg-white/80 backdrop-blur-sm rounded-3xl outline-none text-sm font-medium text-[#4A4440] border border-pink-100 h-24 resize-none"
                />
              </div>
              <div className="flex justify-between items-center px-2">
                <button onClick={() => setIsEditingAnniversary(false)} className="text-[10px] opacity-40 uppercase font-black tracking-widest">Cancel</button>
                <div className="w-1 h-1 bg-pink-200 rounded-full" />
              </div>
            </div>
          )}
        </section>
      )}

      {activeView === 'calendar' ? (
        <div className="grid gap-4">
          <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold opacity-30 mt-4 px-2">
            <CalIcon className="w-3 h-3" />
            <span>Timeline</span>
          </div>
          {plans.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((plan) => (
            <PlanCard key={plan.id} plan={plan} onDelete={() => deleteDoc(doc(db, 'couples', couple.id, 'plans', plan.id))} />
          ))}
          {plans.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-30 space-y-4">
              <CalIcon className="w-12 h-12" />
              <p className="font-serif italic">No plans yet. Maybe a picnic? 🧺</p>
            </div>
          )}
        </div>
      ) : (
        <div className="columns-2 gap-4 space-y-4">
          {pins.map((pin) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={pin.id}
              className="relative group break-inside-avoid"
            >
              <img src={pin.imageUrl} className="w-full rounded-[24px] shadow-sm border border-white/50" />
              <button 
                onClick={() => deleteDoc(doc(db, 'couples', couple.id, 'visionBoard', pin.id))}
                className="absolute top-2 right-2 p-2 glass rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="w-4 h-4 rotate-45 text-red-400" />
              </button>
            </motion.div>
          ))}
          {pins.length === 0 && (
            <div className="col-span-2 py-20 text-center opacity-30 italic text-sm">
              Dreams start here. Add your first pin! ✨
            </div>
          )}
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm glass rounded-[40px] p-8 space-y-6">
            <h3 className="text-xl font-serif">Add a Plan</h3>
            <div className="space-y-4">
              <input
                value={newPlan.title}
                onChange={e => setNewPlan({...newPlan, title: e.target.value})}
                placeholder="What's the plan?"
                className="w-full p-4 bg-white/50 rounded-2xl outline-none text-sm"
              />
              <input
                type="date"
                value={newPlan.date}
                onChange={e => setNewPlan({...newPlan, date: e.target.value})}
                className="w-full p-4 bg-white/50 rounded-2xl outline-none text-sm"
              />
              <select
                value={newPlan.type}
                onChange={e => setNewPlan({...newPlan, type: e.target.value})}
                className="w-full p-4 bg-white/50 rounded-2xl outline-none text-sm"
              >
                <option value="date">Date Night</option>
                <option value="event">Event</option>
                <option value="occasion">Special Occasion</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-3 text-sm opacity-50">Cancel</button>
              <button onClick={addPlan} className="flex-1 py-3 bg-[#4A4440] text-white rounded-2xl text-sm font-bold">Add Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onDelete }: any) {
  const isDate = plan.type === 'date';
  const Icon = isDate ? Heart : plan.type === 'occasion' ? PartyPopper : Star;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5 rounded-[32px] flex items-center justify-between group"
    >
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-2xl ${isDate ? 'bg-pink-100 text-pink-500' : 'bg-blue-100 text-blue-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold">{plan.title}</h4>
          <div className="flex items-center space-x-2 text-[10px] opacity-40 uppercase tracking-widest font-bold" key={plan.date}>
            <Clock className="w-3 h-3" />
            <span>{new Date(plan.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
      <button onClick={onDelete} className="p-2 opacity-0 group-hover:opacity-100 text-red-400 text-xs">Remove</button>
    </motion.div>
  );
}
