'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, Variants } from 'framer-motion';

export default function DashboardHomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [examsCount, setExamsCount] = useState(0);
  const [syllabusProgress, setSyllabusProgress] = useState(0);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubExams: (() => void) | undefined;
    let unsubSyllabus: (() => void) | undefined;
    let unsubStudy: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login'); 
        return;
      }

      unsubProfile = onSnapshot(doc(db, 'student_profiles', user.uid), (docSnap) => {
        if (docSnap.exists()) setProfile(docSnap.data());
      });

      unsubExams = onSnapshot(doc(db, 'student_exams_data', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.exams) setExamsCount(data.exams.length);
        }
      });

      unsubSyllabus = onSnapshot(doc(db, 'student_syllabus_tracker', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.topics && data.topics.length > 0) {
            const completed = data.topics.filter((t: any) => t.completed).length;
            setSyllabusProgress(Math.round((completed / data.topics.length) * 100));
          } else {
            setSyllabusProgress(0);
          }
        } else {
          setSyllabusProgress(0);
        }
      });

      unsubStudy = onSnapshot(doc(db, 'student_study_data', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.testHistory) {
            setTestHistory(data.testHistory);
          }
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching study data:", error);
        setLoading(false);
      });
    });

    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
      if (unsubExams) unsubExams();
      if (unsubSyllabus) unsubSyllabus();
      if (unsubStudy) unsubStudy();
      clearTimeout(timer);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-black text-xl">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          LOADING DASHBOARD...
        </motion.div>
      </div>
    );
  }

  if (!auth.currentUser) return null; 

  const chartData = testHistory.length > 2 
    ? testHistory.map((test, index) => ({ name: `Test ${index + 1}`, score: Math.round((test.score / (test.total || 10)) * 100) || 0 }))
    : [
        { name: 'Week 1', score: 45 },
        { name: 'Week 2', score: 52 },
        { name: 'Week 3', score: 58 },
        { name: 'Week 4', score: 68 },
        { name: 'Week 5', score: 76 },
        { name: 'Current', score: 85 },
      ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 25 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } }
  };

  return (
    <motion.div 
      className="max-w-6xl mx-auto space-y-8 pb-12 font-sans text-black"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      
      {/* 🌟 EXACT REFERENCE IMAGE HERO BANNER (Soft Blue) */}
      <motion.div variants={itemVariants} className="bg-[#BFDBFE] border-4 border-black p-8 sm:p-10 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white border-2 border-black px-4 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-4 font-black">
            <span>{profile?.stream || 'SCIENCE'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-black flex items-center gap-3">
            Welcome back, {profile?.name || 'Scholar'}! 👋
          </h1>
          <p className="font-bold text-lg mt-3 text-black">
            Target: <span className="underline decoration-2">{profile?.targetGoal || 'Undergraduate Admissions'}</span>
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10 shrink-0">
          <Link
            href="/counsellor"
            className="bg-[#FF8A65] border-4 border-black px-6 py-4 rounded-2xl font-black text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 cursor-pointer text-black"
          >
            <Sparkles className="w-5 h-5 fill-black" /> Talk to AI
          </Link>
        </motion.div>
      </motion.div>

      {/* 🌟 WHAT SHOULD I DO NEXT & AI INSIGHT SECTION */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">What Should I Do Next?</h2>
            <span className="bg-black text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">AI Priority</span>
          </div>

          <div className="space-y-4">
            <motion.div whileHover={{ scale: 1.01 }} className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex gap-4 transition-all">
              <CheckCircle2 className="w-6 h-6 text-gray-300 shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#F87171] border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">High Priority</span>
                  <span className="text-[10px] font-black uppercase text-gray-600">REVISION</span>
                </div>
                <h3 className="text-xl font-black mb-1">Review Calculus Integration formulas</h3>
                <p className="text-sm font-bold text-gray-700">Why: Identified as a weak topic in your recent diagnostic test.</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.01 }} className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex gap-4 transition-all">
              <CheckCircle2 className="w-6 h-6 text-gray-300 shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#FACC15] border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Medium Priority</span>
                  <span className="text-[10px] font-black uppercase text-gray-600">RESEARCH</span>
                </div>
                <h3 className="text-xl font-black mb-1">Shortlist 3 Tier-1 Computer Science colleges</h3>
                <p className="text-sm font-bold text-gray-700">Why: Aligns with your primary goal.</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Column: AI Insight & Stats Widget */}
        <div className="space-y-6">
          
          <div className="bg-[#A7F3D0] border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
            <div className="absolute -top-3 left-4 bg-black text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full z-10 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              AI INSIGHT
            </div>
            <p className="font-bold text-black leading-snug mt-2 text-sm">
              "Your Physics problem sets have improved by 14%. Focus on Calculus integration to stabilize your core PCM score."
            </p>
            <Link 
              href="/counsellor?insight=true"
              className="mt-4 font-black text-sm inline-flex items-center gap-1 hover:underline cursor-pointer text-black"
            >
              Discuss plan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats Box matching reference image */}
          <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <h3 className="font-black text-lg uppercase tracking-wider border-b-2 border-black pb-2">STATS</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-black">
                <span>Syllabus</span>
                <span>{syllabusProgress}%</span>
              </div>
              <div className="w-full bg-white border-2 border-black h-3 rounded-full overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${syllabusProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="bg-[#93C5FD] h-full border-r-2 border-black" 
                />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-sm font-black">
                <span>Exams Tracked</span>
                <span>{examsCount} Active</span>
              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* 🌟 ANALYTICS CHART SECTION */}
      <motion.div variants={itemVariants} className="bg-white border-4 border-black p-6 sm:p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#BFDBFE] border-4 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black">Performance Analytics</h2>
              <p className="font-bold text-gray-600 text-sm">Test Score Progression (%)</p>
            </div>
          </div>
        </div>
        
        <div className="h-[260px] w-full mt-4 font-bold bg-[#FAF8F5] border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A7F3D0" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#A7F3D0" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFBEB', 
                  border: '4px solid #000', 
                  borderRadius: '16px',
                  boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
                  fontWeight: '900'
                }} 
              />
              <Area type="monotone" dataKey="score" stroke="#000" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </motion.div>
  );
}