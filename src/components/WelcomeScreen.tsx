import { motion } from 'motion/react';
import { Heart, Sparkles, Music, Star } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

export default function WelcomeScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 lofi-gradient text-center overflow-hidden relative">
      {/* Decorative Floating Elements */}
      <FloatingItem Icon={Music} delay={0} top="15%" left="15%" color="text-brand/20" />
      <FloatingItem Icon={Star} delay={1} top="75%" left="80%" color="text-yellow-200" />
      <FloatingItem Icon={Heart} delay={0.5} top="20%" left="85%" color="text-brand/20" />
      <FloatingItem Icon={Sparkles} delay={1.5} top="80%" left="10%" color="text-purple-200" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="z-10 space-y-8"
      >
        <div className="relative inline-block">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-24 h-24 bg-white rounded-[40%] flex items-center justify-center shadow-xl mb-4 mx-auto"
          >
            <Heart className="w-12 h-12 text-brand fill-brand/20" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-serif font-black tracking-tight text-[#4A4440]">Synced</h1>
          <p className="text-lg text-[#6B635D] max-w-xs mx-auto leading-relaxed">
            A soft, private space designed for just the two of you.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={signInWithGoogle}
          className="w-full max-w-xs py-4 bg-white text-[#4A4440] rounded-3xl shadow-lg border border-white/50 flex items-center justify-center space-x-3 font-semibold group transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:rotate-12 transition-transform" alt="Google" />
          <span>Begin our journey</span>
        </motion.button>

        <p className="text-xs text-[#9E948B] opacity-60">
          Private • Encrypted • Just for couples
        </p>
      </motion.div>

      {/* Aesthetic blur overlay */}
      <div className="absolute inset-0 pointer-events-none border-[24px] border-white/10 rounded-[60px]" />
    </div>
  );
}

function FloatingItem({ Icon, delay, top, left, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [0.3, 0.6, 0.3],
        y: [0, -20, 0],
        rotate: [0, 10, -10, 0]
      }}
      transition={{ 
        repeat: Infinity, 
        duration: 5 + delay, 
        delay 
      }}
      className={`absolute ${top} ${left} ${color} pointer-events-none`}
      style={{ top, left }}
    >
      <Icon className="w-12 h-12" />
    </motion.div>
  );
}
