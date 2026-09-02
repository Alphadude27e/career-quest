'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Layers, CheckCircle2, Sparkles, Play, X, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Imports for beautiful AI text and math formatting
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 🌟 IMPORT FRAMER MOTION
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface SyllabusTopic {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  category: 'Overlapping' | 'Individual';
  exams: string[];
  difficultyComparison: { [examName: string]: 'Easy' | 'Medium' | 'Hard' | 'Advanced' };
  completed: boolean;
}

export default function SyllabusTrackerPage() {
  const router = useRouter();
  const [userExams, setUserExams] = useState<string[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Overlapping' | 'Individual'>('All');

  const [activeMasterTopic, setActiveMasterTopic] = useState<SyllabusTopic | null>(null);
  const [guidedMessages, setGuidedMessages] = useState<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([]);
  const [guidedInput, setGuidedInput] = useState('');
  const [guidedLoading, setGuidedLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubExams = onSnapshot(doc(db, 'student_exams_data', user.uid), (examSnap) => {
      if (examSnap.exists()) {
        const data = examSnap.data();
        if (data.exams && Array.isArray(data.exams)) {
          setUserExams(data.exams.map((e: any) => typeof e === 'string' ? e : (e.name || e.title || 'Unknown Exam')));
        }
      }
    });

    const unsubTracker = onSnapshot(doc(db, 'student_syllabus_tracker', user.uid), (trackerSnap) => {
      if (trackerSnap.exists()) {
        const data = trackerSnap.data();
        setTopics(data.topics || []);
      }
      setLoading(false);
    });

    return () => {
      unsubExams();
      unsubTracker();
    };
  }, []);

  const generateDynamicSyllabus = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (userExams.length === 0) return alert("Please add exams in the Entrance Exams tab first!");

    setGenerating(true);
    try {
      const res = await fetch('/api/generate-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exams: userExams })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to communicate with AI API.');
      
      if (data.topics && data.topics.length > 0) {
        const formattedTopics = data.topics.map((t: any) => ({ 
          ...t, 
          completed: false,
          id: t.id || Date.now().toString() + Math.random().toString(36).substring(7)
        }));
        setTopics(formattedTopics);
        await setDoc(doc(db, 'student_syllabus_tracker', user.uid), { topics: formattedTopics }, { merge: true });
      } else {
        alert("The AI generated an empty response. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to map syllabus:", error);
      alert(`Error generating syllabus: ${error.message}\n\nPlease verify your API route is working.`);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTopic = async (id: string) => {
    const updated = topics.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTopics(updated);
    const user = auth.currentUser;
    if (user) await setDoc(doc(db, 'student_syllabus_tracker', user.uid), { topics: updated }, { merge: true });
  };

  const formatMath = (text: string) => {
    if (!text) return text;
    return text.replace(/\\\(/g, '$').replace(/\\\)/g, '$').replace(/\\\[/g, () => '$$').replace(/\\\]/g, () => '$$');
  };

  const handleOpenMasterModal = async (topic: SyllabusTopic) => {
    setActiveMasterTopic(topic);
    setGuidedLoading(true);
    
    const initialUserMessage = `Provide a detailed, step-by-step foundational explanation of this topic, breaking down key formulas, concepts, and common pitfalls tested in ${topic.exams.join(', ')}. Conclude with a guided follow-up question.`;
    
    const newChatHistory = [{ role: 'user' as const, content: initialUserMessage }];
    setGuidedMessages([...newChatHistory, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/question-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${topic.topic} (${topic.chapter} - ${topic.subject})`,
          messages: newChatHistory
        })
      });

      if (!res.body) throw new Error("No response stream");

      setGuidedLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiFullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        aiFullText += decoder.decode(value, { stream: true });

        setGuidedMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = aiFullText;
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setGuidedMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Failed to load AI session. Please try again.';
        return updated;
      });
      setGuidedLoading(false);
    }
  };

  const handleSendGuidedChat = async () => {
    if (!guidedInput.trim() || !activeMasterTopic || guidedLoading) return;

    const userMsg = guidedInput.trim();
    setGuidedInput('');
    const updatedChat = [...guidedMessages, { role: 'user' as const, content: userMsg }];
    
    setGuidedMessages([...updatedChat, { role: 'assistant', content: '' }]);
    setGuidedLoading(true);

    try {
      const res = await fetch('/api/question-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeMasterTopic.topic,
          messages: updatedChat
        })
      });

      if (!res.body) throw new Error("No response stream");

      setGuidedLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiFullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        aiFullText += decoder.decode(value, { stream: true });

        setGuidedMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = aiFullText;
          return updated;
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setGuidedLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-black text-xl">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          LOADING SYLLABUS...
        </motion.div>
      </div>
    );
  }

  const subjects = ['All', ...Array.from(new Set(topics.map(t => t.subject)))].filter(Boolean);
  const filteredTopics = topics.filter(t => {
    if (subjectFilter !== 'All' && t.subject !== subjectFilter) return false;
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    return true;
  });

  const completedCount = topics.filter(t => t.completed).length;
  const progressPercent = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

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
      <motion.div variants={itemVariants} className="bg-[#BFDBFE] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-sm font-black uppercase tracking-wider bg-white border-2 border-black px-3 py-1 rounded-full">
            AI-Mapped Syllabus
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4">Unified Syllabus Tracker 🎯</h1>
          <p className="font-bold text-lg mt-2 text-gray-800">
            {userExams.length > 0 ? `Mapped for: ${userExams.join(', ')}` : 'Add exams in the bulletin to get started.'}
          </p>
        </div>
        <div className="bg-white border-4 border-black p-5 rounded-2xl text-center shrink-0">
          <div className="text-xs font-black uppercase text-gray-500">Mastery Progress</div>
          <div className="text-3xl font-black mt-1">{progressPercent}%</div>
        </div>
      </motion.div>

      {topics.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-white border-4 border-black p-12 rounded-3xl text-center space-y-4">
          <Layers className="w-16 h-16 mx-auto text-gray-400" />
          <h2 className="text-2xl font-black">Your Syllabus is Empty</h2>
          <p className="font-bold text-gray-600">Let AI map out the overlapping and individual chapters based on your active exams.</p>
          <motion.button 
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={generateDynamicSyllabus}
            disabled={generating}
            className="bg-[#FF8A65] border-2 border-black px-8 py-3 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
          >
            {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? 'Mapping Syllabus...' : 'Generate AI Syllabus Map'}
          </motion.button>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border-4 border-black p-4 rounded-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-xs uppercase px-2">Subject:</span>
              {subjects.map((s, idx) => (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={`subject-${idx}`} 
                  onClick={() => setSubjectFilter(s)} 
                  className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs cursor-pointer ${subjectFilter === s ? 'bg-[#FF8A65]' : 'bg-[#FAF8F5]'}`}
                >
                  {s}
                </motion.button>
              ))}
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase px-2">Type:</span>
                {(['All', 'Overlapping', 'Individual'] as const).map((c, idx) => (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={`type-${idx}`} 
                    onClick={() => setCategoryFilter(c)} 
                    className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs cursor-pointer ${categoryFilter === c ? 'bg-[#A7F3D0]' : 'bg-[#FAF8F5]'}`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateDynamicSyllabus}
                disabled={generating}
                className="bg-[#BFDBFE] border-2 border-black px-4 py-1.5 rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Mapping...' : 'Sync AI Syllabus'}
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTopics.map((topic) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  key={topic.id} 
                  className={`p-6 rounded-3xl border-4 border-black transition-colors ${topic.completed ? 'bg-gray-100 opacity-75' : 'bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
                    <div className="flex items-start gap-4">
                      {/* 🌟 ANIMATED CHECKBOX */}
                      <motion.button 
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleTopic(topic.id)} 
                        className="mt-1 cursor-pointer outline-none"
                      >
                        <CheckCircle2 className={`w-7 h-7 transition-colors ${topic.completed ? 'text-black fill-emerald-400' : 'text-gray-300'}`} />
                      </motion.button>
                      
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="bg-[#FAF8F5] text-xs font-black px-2 py-0.5 border border-black rounded">
                            {topic.subject || 'Subject'} &gt; {topic.chapter || 'Chapter'}
                          </span>
                          <span className={`text-xs font-black px-2.5 py-0.5 border-2 border-black rounded-md ${topic.category === 'Overlapping' ? 'bg-[#BFDBFE]' : 'bg-[#FF8A65]'}`}>
                            {topic.category || 'Topic'}
                          </span>
                        </div>
                        <h3 className={`text-xl font-black ${topic.completed ? 'line-through text-gray-500' : 'text-black'}`}>
                          {topic.topic || 'Untitled Topic'}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleOpenMasterModal(topic)} className="bg-[#BFDBFE] border-2 border-black px-4 py-2 rounded-xl font-black text-xs cursor-pointer flex items-center gap-1.5"><Sparkles className="w-4 h-4 fill-black" /> Master</motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push(`/study?topic=${encodeURIComponent(topic.topic || '')}`)} className="bg-[#A7F3D0] border-2 border-black px-4 py-2 rounded-xl font-black text-xs cursor-pointer flex items-center gap-1.5"><Play className="w-3.5 h-3.5 fill-black" /> Test</motion.button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-xs font-black uppercase text-gray-500 col-span-full">
                      Exam Difficulty Breakdown:
                    </div>
                    {topic.difficultyComparison && Object.entries(topic.difficultyComparison).map(([examName, diff], i) => (
                      <div key={i} className="bg-[#FAF8F5] border-2 border-black p-2.5 rounded-xl flex items-center justify-between">
                        <span className="font-black text-xs truncate max-w-[100px]">{examName}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-black shrink-0 ${
                          diff === 'Advanced' ? 'bg-red-300' : diff === 'Hard' ? 'bg-amber-300' : 'bg-emerald-200'
                        }`}>
                          {diff}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {/* 🌟 ANIMATED AI Guided Modal */}
      <AnimatePresence>
        {activeMasterTopic && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="bg-white border-4 border-black w-full max-w-3xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="bg-[#FF8A65] border-b-4 border-black p-6 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white border border-black px-2 py-0.5 rounded">AI Guided Educator</span>
                  <h2 className="text-xl font-black mt-1 text-black">{activeMasterTopic.topic}</h2>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveMasterTopic(null)} 
                  className="p-2 bg-white border-2 border-black rounded-xl cursor-pointer hover:bg-red-300 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <X className="w-5 h-5 text-black" />
                </motion.button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAF8F5]">
                <AnimatePresence initial={false}>
                  {guidedMessages.filter(m => m.role !== 'system').map((msg, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 250, damping: 20 }}
                      className={`p-4 rounded-2xl border-2 border-black text-sm font-bold ${msg.role === 'user' ? 'bg-[#BFDBFE] ml-8' : 'bg-white mr-8 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
                    >
                      <span className="block text-[10px] font-black uppercase text-gray-500 mb-2">{msg.role === 'user' ? 'You:' : 'AI Educator:'}</span>
                      
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-line leading-relaxed text-gray-900">{msg.content}</p>
                      ) : (
                        <div className="font-medium leading-relaxed text-black prose prose-sm prose-black max-w-none prose-p:leading-snug prose-headings:font-black prose-a:text-blue-600 prose-ul:list-disc prose-ol:list-decimal">
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath] as any} rehypePlugins={[rehypeKatex] as any}>
                            {formatMath(msg.content)}
                          </ReactMarkdown>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {guidedLoading && (
                  <div className="flex items-center gap-2 font-bold text-gray-500 pl-2">
                    <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-1 uppercase text-xs">Analyzing...</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t-4 border-black bg-white flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={guidedInput} 
                  onChange={(e) => setGuidedInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSendGuidedChat()} 
                  placeholder="Ask a follow-up about this topic..." 
                  className="flex-1 bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-xs outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendGuidedChat} 
                  disabled={guidedLoading || !guidedInput.trim()} 
                  className="bg-[#BFDBFE] border-2 border-black px-6 py-3 rounded-xl font-black text-xs cursor-pointer disabled:opacity-50 transition-shadow shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  Send
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}