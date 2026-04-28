import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalIcon, Plus, MapPin, Clock, Star, PartyPopper, Sparkles, Heart, Gift, Film, Search, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { logActivity } from '../../lib/activityLogger';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function PlansScreen() {
  const { user, couple } = useAuth();
  const [activeView, setActiveView] = useState<'calendar' | 'vision' | 'movies'>('calendar');
  const [plans, setPlans] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlan, setNewPlan] = useState({ title: '', date: '', type: 'date' });
  const [isEditingAnniversary, setIsEditingAnniversary] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState(couple?.anniversary || '');
  const [anniversaryMessage, setAnniversaryMessage] = useState(couple?.anniversaryMessage || '');

  const [movieSearch, setMovieSearch] = useState('');
  const [movieResults, setMovieResults] = useState<any[]>([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);

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

    const qMovies = query(collection(db, 'couples', couple.id, 'movies'), orderBy('createdAt', 'desc'));
    const unsubMovies = onSnapshot(qMovies, (snap) => {
      setMovies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsub(); unsubPins(); unsubMovies(); };
  }, [couple?.id]);

  const searchMovies = async () => {
    if (!movieSearch.trim()) return;
    setIsSearchingMovies(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for movies matching: "${movieSearch}". Return a JSON array of 5 movies with: title, year, posterUrl (use professional movie poster links or aesthetic unsplash movie-themed urls), and summary.`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text);
      setMovieResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingMovies(false);
    }
  };

  const addMovie = async (movie: any) => {
    if (!couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'movies'), {
      title: movie.title,
      year: movie.year,
      posterUrl: movie.posterUrl,
      coupleId: couple.id,
      addedBy: user?.uid,
      watched: false,
      createdAt: serverTimestamp()
    });

    await logActivity(
      couple.id,
      user?.uid || '',
      'movie',
      `added "${movie.title}" to the watchlist 🍿`,
      { movieTitle: movie.title, posterUrl: movie.posterUrl }
    );

    setMovieResults([]);
    setMovieSearch('');
  };

  const toggleMovieWatched = async (movie: any) => {
    if (!couple?.id) return;
    const movieRef = doc(db, 'couples', couple.id, 'movies', movie.id);
    const newStatus = !movie.watched;
    await updateDoc(movieRef, { watched: newStatus });

    if (newStatus) {
      await logActivity(
        couple.id,
        user?.uid || '',
        'movie',
        `watched "${movie.title}" 🎬`,
        { movieTitle: movie.title, posterUrl: movie.posterUrl }
      );
    }
  };

  const addPlan = async () => {
    if (!newPlan.title || !newPlan.date || !couple?.id) return;
    await addDoc(collection(db, 'couples', couple.id, 'plans'), {
      ...newPlan,
      coupleId: couple.id,
      createdAt: serverTimestamp()
    });

    await logActivity(
      couple.id,
      user?.uid || '',
      'plan',
      `planned a new ${newPlan.type}: "${newPlan.title}" on ${new Date(newPlan.date).toLocaleDateString()}`,
      { planTitle: newPlan.title, planDate: newPlan.date, planType: newPlan.type }
    );

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
    <div className="p-6 pt-12 space-y-8 min-h-screen pb-32 dotted-grid scanline">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-black text-[#4A4440] uppercase tracking-tighter">
            {activeView === 'calendar' ? 'Tactical Plans' : activeView === 'vision' ? 'Dream Spec' : 'Watchlist'}
          </h1>
          <div className="flex items-center space-x-2 text-[10px] font-mono opacity-30">
            <span className="w-2 h-2 bg-brand animate-pulse" />
            <span className="uppercase">{activeView === 'calendar' ? 'Planning_v4.1' : activeView === 'vision' ? 'Neuro_Link_v0.9' : 'Visual_Module_v2.0'}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="flex bg-black/5 p-1 rounded-2xl border border-black/5">
            <TabIcon active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} Icon={CalIcon} />
            <TabIcon active={activeView === 'vision'} onClick={() => setActiveView('vision')} Icon={Sparkles} />
            <TabIcon active={activeView === 'movies'} onClick={() => setActiveView('movies')} Icon={Film} />
          </div>
          {activeView !== 'movies' && (
            <button
              onClick={() => activeView === 'calendar' ? setIsAdding(true) : addPin()}
              className="btn-primary p-3 bg-brand rounded-2xl shadow-lg shadow-brand/20 text-white"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {activeView === 'calendar' && (
        <section className={`p-8 rounded-[40px] space-y-6 relative overflow-hidden transition-all duration-500 tech-border ${couple?.anniversary ? 'glass shadow-sm' : 'bg-black/5 border-dashed border-2 border-black/10 animate-pulse-slow'}`}>
          <div className="absolute -right-6 -top-6 opacity-5 rotate-12">
            <Gift className="w-24 h-24" />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <PartyPopper className={`w-4 h-4 ${couple?.anniversary ? 'text-brand shadow-[0_0_8px_rgba(244,114,182,0.5)]' : 'opacity-40'}`} />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold opacity-40">System_Event // Anniversary</h3>
            </div>
            {!isEditingAnniversary ? (
              <button 
                onClick={() => setIsEditingAnniversary(true)} 
                className="btn-primary text-[10px] font-mono font-black uppercase tracking-widest px-4 py-2 bg-brand/5 border border-brand/10 text-brand rounded-xl"
              >
                {couple?.anniversary ? '[ UPDATE ]' : '[ INITIALIZE ]'}
              </button>
            ) : (
              <button onClick={updateAnniversary} className="btn-primary text-[10px] font-mono font-black uppercase tracking-widest text-white bg-green-500 px-4 py-2 rounded-xl shadow-lg shadow-green-100">
                [ CONFIRM ]
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
                      <p className="text-lg font-serif font-bold text-brand">
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
                <div className="pt-4 border-t border-brand-soft">
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
                <div className="w-1 h-1 bg-brand-soft rounded-full" />
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
      ) : activeView === 'vision' ? (
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
      ) : (
        <div className="space-y-8">
          {/* Movie Search */}
          <div className="relative">
            <input
              value={movieSearch}
              onChange={(e) => setMovieSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMovies()}
              placeholder="Suggest a movie..."
              className="w-full pl-12 pr-4 py-4 glass rounded-3xl outline-none focus:ring-2 ring-brand/20 transition-all text-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
            {isSearchingMovies && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <AnimatePresence>
            {movieResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-3"
              >
                {movieResults.map((movie, i) => (
                  <button
                    key={i}
                    onClick={() => addMovie(movie)}
                    className="flex items-center p-3 glass rounded-2xl hover:bg-white/50 transition-colors text-left"
                  >
                    <img src={movie.posterUrl} className="w-12 h-18 rounded-lg object-cover mr-4" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{movie.title}</p>
                      <p className="text-[10px] opacity-50">{movie.year} • {movie.summary?.substring(0, 40)}...</p>
                    </div>
                    <Plus className="w-4 h-4 opacity-30" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Watchlist */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold opacity-30 px-2 mt-4">
              <Film className="w-3 h-3" />
              <span>Watchlist</span>
            </div>
            <div className="grid gap-4">
              {movies.map((movie) => (
                <div key={movie.id} className={`glass p-4 rounded-[28px] flex items-center space-x-4 transition-all ${movie.watched ? 'opacity-40' : ''}`}>
                  <button onClick={() => toggleMovieWatched(movie)} className="text-[#4A4440] hover:scale-110 active:scale-95 transition-all">
                    {movie.watched ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                  </button>
                  <img src={movie.posterUrl} className="w-10 h-14 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${movie.watched ? 'line-through' : ''}`}>{movie.title}</p>
                    <p className="text-[10px] opacity-40">{movie.year}</p>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'couples', couple.id, 'movies', movie.id))} className="p-2 opacity-20 hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
              {movies.length === 0 && (
                <div className="py-20 text-center opacity-30 italic text-sm">
                  The cinema is empty. Add some movies! 🍿
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={() => setIsAdding(false)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm glass rounded-[40px] p-10 space-y-8 tech-border"
          >
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-display font-black uppercase tracking-tight">New Mission</h3>
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.2em]">Objective // Task_Entry</p>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 ml-2">Description</label>
                <input
                  autoFocus
                  value={newPlan.title}
                  onChange={e => setNewPlan({...newPlan, title: e.target.value})}
                  placeholder="WHAT_IS_THE_PLAN..."
                  className="w-full p-5 bg-white/50 rounded-3xl outline-none text-xs font-mono uppercase border border-black/5 focus:border-brand/30 transition-colors"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 ml-2">Timeline</label>
                <input
                  type="date"
                  value={newPlan.date}
                  onChange={e => setNewPlan({...newPlan, date: e.target.value})}
                  className="w-full p-5 bg-white/50 rounded-3xl outline-none text-xs font-mono border border-black/5 focus:border-brand/30 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 ml-2">Category</label>
                <select
                  value={newPlan.type}
                  onChange={e => setNewPlan({...newPlan, type: e.target.value})}
                  className="w-full p-5 bg-white/50 rounded-3xl outline-none text-xs font-mono uppercase border border-black/5 focus:border-brand/30 transition-colors appearance-none"
                >
                  <option value="date">Date Night</option>
                  <option value="event">Event</option>
                  <option value="occasion">Special Occasion</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-4 pt-2">
              <button onClick={() => setIsAdding(false)} className="btn-primary flex-1 py-4 text-[10px] font-mono font-black uppercase tracking-widest opacity-30">Cancel</button>
              <button onClick={addPlan} className="btn-primary flex-1 py-4 bg-brand text-white rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest shadow-lg shadow-brand/20">
                [ DEPLOY ]
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function TabIcon({ active, onClick, Icon }: { active: boolean, onClick: () => void, Icon: any }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-xl transition-all ${active ? 'bg-white text-brand shadow-sm' : 'text-gray-400'}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function PlanCard({ plan, onDelete }: any) {
  const isDate = plan.type === 'date';
  const Icon = isDate ? Heart : plan.type === 'occasion' ? PartyPopper : Star;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 rounded-[32px] flex items-center justify-between group tech-border transition-all hover:bg-white/60"
    >
      <div className="flex items-center space-x-5">
        <div className={`p-4 rounded-2xl ${isDate ? 'bg-brand/5 text-brand border border-brand/10' : 'bg-blue-500/5 text-blue-500 border border-blue-500/10'}`}>
          <Icon className={`w-5 h-5 ${isDate ? 'fill-brand/20' : ''}`} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-display font-bold text-[#4A4440]">{plan.title}</h4>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-[9px] font-mono opacity-40 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>{new Date(plan.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="w-1 h-1 bg-black/10 rounded-full" />
            <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest">{plan.type}</span>
          </div>
        </div>
      </div>
      <button onClick={onDelete} className="btn-primary p-2 opacity-0 group-hover:opacity-100 text-red-400">
        <Plus className="w-4 h-4 rotate-45" />
      </button>
    </motion.div>
  );
}
