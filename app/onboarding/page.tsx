'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
// ✨ Added Sparkles to the import list below!
import { Rocket, Target, BookOpen, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [stream, setStream] = useState('');
  const [targetGoal, setTargetGoal] = useState('');
  const [grade, setGrade] = useState('');

  // Protect the route
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !stream || !targetGoal || !grade) return;

    setLoading(true);

    try {
      // Write the initial profile data to Firestore
      await setDoc(doc(db, 'student_profiles', user.uid), {
        name: user.displayName || 'Scholar',
        email: user.email,
        stream: stream,
        targetGoal: targetGoal,
        grade: grade,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      // Redirect to the dashboard!
      router.push('/');
    } catch (error) {
      console.error("Error saving profile:", error);
      setLoading(false);
    }
  };

  const streams = ['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities'];
  const grades = ['10th Grade', '11th Grade', '12th Grade', 'Dropper / Gap Year'];

  if (!user) return <div className="min-h-screen bg-[#FAF8F5]" />;

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans text-black flex items-center justify-center p-6 selection:bg-[#FACC15]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white border-4 border-black rounded-3xl p-8 sm:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
      >
        {/* Background decorative element */}
        <div className="absolute -right-12 -top-12 opacity-10 pointer-events-none">
          <Rocket className="w-64 h-64 text-black" />
        </div>

        <div className="relative z-10 mb-8">
          <div className="inline-flex items-center gap-2 bg-[#FACC15] border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-4">
            <Sparkles className="w-4 h-4 text-black" />
            <span className="text-xs font-black uppercase tracking-wider text-black">Profile Setup</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">
            Welcome to Career Quest.
          </h1>
          <p className="font-bold text-gray-600 text-lg">
            Let's customize your AI Counsellor. What are you studying?
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="relative z-10 space-y-8">
          
          {/* Grade Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-black text-lg uppercase tracking-wider">
              <GraduationCap className="w-5 h-5" /> Current Grade
            </label>
            <div className="grid grid-cols-2 gap-4">
              {grades.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`p-4 border-2 border-black rounded-xl font-black text-sm text-left transition-all ${
                    grade === g 
                    ? 'bg-[#93C5FD] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                    : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Stream Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-black text-lg uppercase tracking-wider">
              <BookOpen className="w-5 h-5" /> Academic Stream
            </label>
            <div className="grid grid-cols-2 gap-4">
              {streams.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStream(s)}
                  className={`p-4 border-2 border-black rounded-xl font-black text-sm text-left transition-all ${
                    stream === s 
                    ? 'bg-[#FACC15] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                    : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Target Goal */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-black text-lg uppercase tracking-wider">
              <Target className="w-5 h-5" /> Primary Goal
            </label>
            <input 
              type="text"
              required
              placeholder="e.g., JEE Advanced, NEET, SAT, Top Tier CS Colleges..."
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              className="w-full bg-[#FAF8F5] border-2 border-black p-4 rounded-xl font-bold text-black placeholder-gray-400 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!stream || !targetGoal || !grade || loading}
              className="w-full flex items-center justify-center gap-3 bg-[#4ADE80] text-black font-black py-5 px-6 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[4px] hover:translate-x-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl"
            >
              {loading ? 'Initializing AI...' : 'Generate My Dashboard'} 
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}