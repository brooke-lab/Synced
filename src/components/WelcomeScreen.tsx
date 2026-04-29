import { motion } from 'motion/react';
import { Heart, Sparkles, Music, Star } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

export default function WelcomeScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 lofi-gradient text-center overflow-hidden relative scanline-glass">
      <div className="absolute inset-0 bg-[#1A0505] z-[-1]" />
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-[0.05] animate-scanning bg-gradient-to-b from-brand to-transparent z-0" />
      
      {/* Decorative Floating Elements */}
      <FloatingItem Icon={Music} delay={0} top="15%" left="15%" color="text-brand/30" />
      <FloatingItem Icon={Star} delay={1} top="75%" left="80%" color="text-brand/20" />
      <FloatingItem Icon={Heart} delay={0.5} top="20%" left="85%" color="text-brand/30" />
      <FloatingItem Icon={Sparkles} delay={1.5} top="80%" left="10%" color="text-brand/20" />

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
            className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[40%] flex items-center justify-center shadow-2xl mb-4 mx-auto border border-white/10"
          >
            <Heart className="w-12 h-12 text-brand fill-brand" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-8 h-8 text-brand animate-pulse" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <h1 className="text-7xl font-display font-black tracking-tighter text-white uppercase leading-[0.85] -skew-x-6 text-chromatic glow-text-white">
            Synced
          </h1>
          <div className="flex items-center justify-center space-x-3 text-[10px] font-mono uppercase tracking-[0.4em] text-brand font-black glow-brand">
            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-ping" />
            <span>CONNECTION_ESTABLISHED</span>
          </div>
          <p className="text-lg text-white/80 max-w-xs mx-auto leading-relaxed font-serif italic drop-shadow-lg">
            Connecting souls through the digital ether.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(230, 0, 76, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={signInWithGoogle}
          className="w-full max-w-xs py-4 bg-brand text-white rounded-3xl shadow-2xl border border-white/20 flex items-center justify-center space-x-3 font-mono font-black uppercase tracking-widest group transition-all glow-brand"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:rotate-12 transition-transform invert" alt="Google" />
          <span>Enter Our Space</span>
        </motion.button>

        <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">
          Encrypted_Channel // Secure_Sync
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
