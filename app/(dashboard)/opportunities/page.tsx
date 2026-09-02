'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Briefcase, Building2, Sparkles, BookmarkCheck, Trash2 } from 'lucide-react';

// 🌟 IMPORT FRAMER MOTION
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface Opportunity {
  id: string;
  title: string;
  category: string;
  topColleges: string[];
  avgSalaryOrOutcome: string;
  requiredSkills: string[];
  description: string;
  saved: boolean;
}

const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: '1',
    title: 'Computer Science & AI Engineering',
    category: 'Technology',
    topColleges: ['MIT', 'Stanford', 'IIT Bombay', 'Carnegie Mellon'],
    avgSalaryOrOutcome: '$120,000+ / Top Tech Roles',
    requiredSkills: ['Data Structures', 'Python & C++', 'Machine Learning Math'],
    description: 'Design intelligent systems, build scalable software, and lead technological innovation.',
    saved: true
  },
  {
    id: '2',
    title: 'Biomedical Science & Research',
    category: 'Healthcare & Science',
    topColleges: ['Harvard', 'Oxford', 'AIIMS New Delhi', 'Johns Hopkins'],
    avgSalaryOrOutcome: '$95,000+ / Advanced Medical Research',
    requiredSkills: ['Molecular Biology', 'Organic Chemistry', 'Lab Analytics'],
    description: 'Bridge medicine and engineering to create breakthrough treatments and medical diagnostics.',
    saved: false
  },
  {
    id: '3',
    title: 'Quantitative Finance & FinTech',
    category: 'Finance & Economics',
    topColleges: ['LSE', 'Wharton', 'IIT Delhi', 'Princeton'],
    avgSalaryOrOutcome: '$140,000+ / Algorithmic Trading',
    requiredSkills: ['Advanced Calculus', 'Probability & Statistics', 'Financial Modeling'],
    description: 'Apply mathematical models and software engineering to predict market movements and optimize assets.',
    saved: false
  }
];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(DEFAULT_OPPORTUNITIES);
  const [loading, setLoading] = useState(true);

  const [careerQuery, setCareerQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchOpportunities = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, 'student_opportunities_data', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.opportunities) setOpportunities(data.opportunities);
        } else {
          await setDoc(docRef, { opportunities: DEFAULT_OPPORTUNITIES });
        }
      } catch (err) {
        console.error('Error fetching opportunities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, []);

  const saveToFirestore = async (updated: Opportunity[]) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = doc(db, 'student_opportunities_data', user.uid);
      await setDoc(docRef, { opportunities: updated }, { merge: true });
    } catch (err) {
      console.error('Error saving opportunities:', err);
    }
  };

  const toggleSave = async (id: string) => {
    const updated = opportunities.map(o => o.id === id ? { ...o, saved: !o.saved } : o);
    setOpportunities(updated);
    await saveToFirestore(updated);
  };

  const removeOpportunity = async (id: string) => {
    const updated = opportunities.filter(o => o.id !== id);
    setOpportunities(updated);
    await saveToFirestore(updated);
  };

  const handleGenerateCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerQuery.trim() || searching) return;

    setSearching(true);
    try {
      const res = await fetch('/api/generate-career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ careerQuery })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newOp: Opportunity = {
        id: 'opp-' + Date.now(),
        title: data.opportunity.title || careerQuery,
        category: data.opportunity.category || 'Specialized Field',
        topColleges: data.opportunity.topColleges || ['Top Global Universities'],
        avgSalaryOrOutcome: data.opportunity.avgSalaryOrOutcome || 'High Growth Potential',
        requiredSkills: data.opportunity.requiredSkills || ['Core Fundamentals', 'Problem Solving'],
        description: data.opportunity.description || 'Custom path explored via AI Counsellor.',
        saved: true
      };

      const updated = [newOp, ...opportunities];
      setOpportunities(updated);
      setCareerQuery('');
      await saveToFirestore(updated);
    } catch (err) {
      console.error('Error generating career:', err);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-black text-xl">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          LOADING COLLEGES & CAREERS...
        </motion.div>
      </div>
    );
  }

  // 🌟 ANIMATION VARIANTS
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 15 } }
  };

  return (
    <motion.div 
      className="max-w-6xl mx-auto space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      
      {/* 🌟 ANIMATED Banner */}
      <motion.div variants={itemVariants} className="bg-[#A7F3D0] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-sm font-black uppercase tracking-wider bg-white border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Career Discovery
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4">
            Colleges & Careers Hub 🚀
          </h1>
          <p className="font-bold text-lg mt-2 text-gray-800">
            Explore elite career trajectories, top university programs, and high-demand skill requirements synced to your cloud profile.
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 shrink-0">
          <Briefcase className="w-10 h-10 text-black fill-[#FF8A65]" />
          <div>
            <div className="text-xs font-black uppercase text-gray-500">Explored Paths</div>
            <div className="text-2xl font-black">{opportunities.length} Active</div>
          </div>
        </motion.div>
      </motion.div>

      {/* 🌟 ANIMATED Pathfinder Box */}
      <motion.div variants={itemVariants} className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <h3 className="font-black text-base uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" /> AI Career & College Pathfinder
        </h3>
        <p className="text-xs font-bold text-gray-600">
          Type any career, major, or industry (e.g., Aerospace Engineering, Corporate Law, UI/UX Design) to map out top colleges and required skills.
        </p>
        <form onSubmit={handleGenerateCareer} className="flex gap-2">
          <input
            type="text"
            value={careerQuery}
            onChange={(e) => setCareerQuery(e.target.value)}
            placeholder="Enter career or major..."
            className="flex-1 bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-2.5 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={searching || !careerQuery.trim()}
            className="bg-[#BFDBFE] border-2 border-black px-6 py-2.5 rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {searching ? 'EXPLORING...' : 'EXPLORE PATH'}
          </motion.button>
        </form>
      </motion.div>

      {/* 🌟 ANIMATED Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {opportunities.map((opp) => (
            <motion.div 
              layout
              key={opp.id} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between space-y-4"
            >
              
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black uppercase bg-[#FAF8F5] border-2 border-black px-2.5 py-1 rounded-md">
                      {opp.category}
                    </span>
                    <h3 className="text-xl font-black mt-2">{opp.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleSave(opp.id)}
                      className={`p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-colors ${
                        opp.saved ? 'bg-emerald-300' : 'bg-[#FAF8F5]'
                      }`}
                      title={opp.saved ? 'Saved to Profile' : 'Save Path'}
                    >
                      <BookmarkCheck className="w-5 h-5 text-black" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeOpportunity(opp.id)}
                      className="p-2 rounded-xl border-2 border-black bg-red-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-red-400 transition-colors"
                      title="Remove Path"
                    >
                      <Trash2 className="w-5 h-5 text-black" />
                    </motion.button>
                  </div>
                </div>

                <p className="text-sm font-bold text-gray-700">
                  {opp.description}
                </p>

                <div className="bg-[#FAF8F5] p-3 border-2 border-black rounded-xl space-y-2">
                  <span className="block text-xs uppercase font-black text-gray-500">Top Universities / Programs:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.topColleges.map((college, idx) => (
                      <span key={idx} className="bg-white border-2 border-black text-xs font-black px-2 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {college}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t-2 border-black">
                <div className="bg-amber-100 border-2 border-black p-2.5 rounded-xl text-xs font-black">
                  <span className="block uppercase text-[10px] text-gray-600">Career Outcome / Salary:</span>
                  {opp.avgSalaryOrOutcome}
                </div>

                <div className="flex flex-wrap gap-1">
                  {opp.requiredSkills.map((skill, idx) => (
                    <span key={idx} className="bg-[#BFDBFE] border border-black text-[10px] font-black px-2 py-0.5 rounded">
                      #{skill}
                    </span>
                  ))}
                </div>
              </div>

            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

    </motion.div>
  );
}