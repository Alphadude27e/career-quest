'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Layers, CheckCircle2, Sparkles, Play, X, RefreshCw, ChevronDown, ChevronRight, Percent } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Imports for beautiful AI text and math formatting
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 🌟 IMPORT FRAMER MOTION
import { motion, AnimatePresence, Variants } from 'framer-motion';

// --- NEW DEEP NESTED INTERFACES ---
interface SubTopic {
  name: string;
  completed: boolean;
}

interface Chapter {
  chapterName: string;
  subTopics: SubTopic[];
}

interface SubjectGroup {
  subject: string;
  chapters: Chapter[];
}

export default function SyllabusTrackerPage() {
  const router = useRouter();
  const [userExams, setUserExams] = useState<string[]>([]);
  const [syllabus, setSyllabus] = useState<SubjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // AI Guided Master State (Now operates at the Chapter level)
  const [activeMasterChapter, setActiveMasterChapter] = useState<{ subject: string; chapter: string } | null>(null);
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
        setSyllabus(data.syllabus || []);
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
        // Passing the combined string of exams to match your new detailed API route
        body: JSON.stringify({ targetExams: userExams.join(', ') })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to communicate with AI API.');
      
      if (data.syllabus && data.syllabus.length > 0) {
        // Map over the new nested structure to ensure 'completed' is set to false initially
        const formattedSyllabus: SubjectGroup[] = data.syllabus.map((subj: any) => ({
          subject: subj.subject,
          chapters: (subj.chapters || []).map((ch: any) => ({
            chapterName: ch.chapterName,
            subTopics: (ch.subTopics || []).map((st: any) => ({
              name: typeof st === 'string' ? st : st.name,
              completed: false,
            })),
          })),
        }));

        setSyllabus(formattedSyllabus);
        await setDoc(doc(db, 'student_syllabus_tracker', user.uid), { syllabus: formattedSyllabus }, { merge: true });
        
        // Expand all chapters by default on new generation
        const newExpandedState: Record<string, boolean> = {};
        formattedSyllabus.forEach((s, sIdx) => {
          s.chapters.forEach((_, cIdx) => {
            newExpandedState[`${sIdx}-${cIdx}`] = true;
          });
        });
        setExpandedChapters(newExpandedState);

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

  const toggleSubTopic = async (subjIndex: number, chIndex: number, stIndex: number) => {
    const updated = [...syllabus];
    const target = updated[subjIndex].chapters[chIndex].subTopics[stIndex];
    target.completed = !target.completed;

    setSyllabus(updated);
    const user = auth.currentUser;
    if (user) await setDoc(doc(db, 'student_syllabus_tracker', user.uid), { syllabus: updated }, { merge: true });
  };

  const toggleChapterAccordion = (key: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatMath = (text: string) => {
    if (!text) return text;
    return text.replace(/\\\(/g, '$').replace(/\\\)/g, '$').replace(/\\\[/g, () => '$$').replace(/\\\]/g, () => '$$');
  };

  // Update Master Modal to work on a Chapter level
  const handleOpenMasterModal = async (subject: string, chapter: string) => {
    setActiveMasterChapter({ subject, chapter });
    setGuidedLoading(true);
    
    const initialUserMessage = `Provide a detailed, step-by-step foundational explanation of the chapter "${chapter}" in "${subject}", breaking down key formulas, concepts, and common pitfalls tested in ${userExams.join(', ')}. Conclude with a guided follow-up question.`;
    
    const newChatHistory = [{ role: 'user' as const, content: initialUserMessage }];
    setGuidedMessages([...newChatHistory, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/question-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${chapter} (${subject})`,
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
    if (!guidedInput.trim() || !activeMasterChapter || guidedLoading) return;

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
          topic: `${activeMasterChapter.chapter} (${activeMasterChapter.subject})`,
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

  // Progress Calculations
  const allSubTopics = syllabus.flatMap(s => s.chapters.flatMap(c => c.subTopics));
  const totalSubTopics = allSubTopics.length;
  const completedSubTopics = allSubTopics.filter(st => st.completed).length;
  const progressPercent = totalSubTopics > 0 ? Math.round((completedSubTopics / totalSubTopics) * 100) : 0;

  const subjects = ['All', ...Array.from(new Set(syllabus.map(s => s.subject)))].filter(Boolean);

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
      className="max-w-6xl mx-auto space-y-8 pb-12 text-black"
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
        {totalSubTopics > 0 && (
          <div className="bg-white border-4 border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 shrink-0">
            <Percent className="w-10 h-10 text-black fill-[#A7F3D0]" />
            <div>
              <div className="text-xs font-black uppercase text-gray-500">Mastery Progress</div>
              <div className="text-3xl font-black">{progressPercent}%</div>
            </div>
          </div>
        )}
      </motion.div>

      {syllabus.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-white border-4 border-black p-12 rounded-3xl text-center space-y-4">
          <Layers className="w-16 h-16 mx-auto text-gray-400" />
          <h2 className="text-2xl font-black">Your Syllabus is Empty</h2>
          <p className="font-bold text-gray-600">Let AI map out an ultra-detailed, chapter-by-chapter plan based on your active exams.</p>
          <motion.button 
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={generateDynamicSyllabus}
            disabled={generating || userExams.length === 0}
            className="bg-[#FF8A65] border-2 border-black px-8 py-3 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow disabled:opacity-50 cursor-pointer inline-flex items-center gap-2 text-black"
          >
            {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? 'Mapping Deep Syllabus...' : 'Generate Deep Syllabus Map'}
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
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateDynamicSyllabus}
              disabled={generating}
              className="bg-[#BFDBFE] border-2 border-black px-4 py-1.5 rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 text-black shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Mapping...' : 'Re-Sync AI Syllabus'}
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <AnimatePresence mode="popLayout">
              {syllabus
                .filter(s => subjectFilter === 'All' || s.subject === subjectFilter)
                .map((subj, subjIdx) => {
                  const subjSubtopics = subj.chapters.flatMap(c => c.subTopics);
                  const completedCount = subjSubtopics.filter(st => st.completed).length;
                  const subjPct = subjSubtopics.length > 0 ? Math.round((completedCount / subjSubtopics.length) * 100) : 0;

                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      key={subjIdx} 
                      className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4"
                    >
                      {/* Subject Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-4 border-black pb-4 gap-2">
                        <div>
                          <span className="text-xs font-black uppercase bg-[#FAF8F5] border-2 border-black px-2.5 py-1 rounded-md">
                            Subject
                          </span>
                          <h3 className="text-2xl font-black mt-2">{subj.subject}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-600">
                            {completedCount} of {subjSubtopics.length} completed
                          </span>
                          <span className="bg-[#A7F3D0] border-2 border-black font-black text-xs px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            {subjPct}%
                          </span>
                        </div>
                      </div>

                      {/* Chapters Grid */}
                      <div className="grid grid-cols-1 gap-4">
                        {subj.chapters.map((ch, chIdx) => {
                          const chapterKey = `${subjIdx}-${chIdx}`;
                          const isExpanded = expandedChapters[chapterKey] ?? true;
                          const chCompleted = ch.subTopics.filter(s => s.completed).length;
                          const chTotal = ch.subTopics.length;
                          const allChCompleted = chTotal > 0 && chCompleted === chTotal;

                          return (
                            <div 
                              key={chIdx} 
                              className={`border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors ${
                                allChCompleted ? 'bg-gray-100 opacity-80' : 'bg-[#FAF8F5]'
                              }`}
                            >
                              <div className="p-4 bg-white border-b-4 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div 
                                  onClick={() => toggleChapterAccordion(chapterKey)}
                                  className="flex items-center gap-3 font-black text-lg cursor-pointer flex-1"
                                >
                                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                  <span className={allChCompleted ? 'line-through text-gray-500' : 'text-black'}>
                                    {ch.chapterName}
                                  </span>
                                  <span className="text-xs font-bold bg-[#BFDBFE] border-2 border-black px-2.5 py-0.5 rounded-md ml-2">
                                    {chCompleted} / {chTotal}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0 ml-8 md:ml-0">
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} 
                                    whileTap={{ scale: 0.95 }} 
                                    onClick={() => handleOpenMasterModal(subj.subject, ch.chapterName)} 
                                    className="bg-[#BFDBFE] border-2 border-black px-4 py-2 rounded-xl font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
                                  >
                                    <Sparkles className="w-4 h-4 fill-black" /> Master
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} 
                                    whileTap={{ scale: 0.95 }} 
                                    onClick={() => router.push(`/study?topic=${encodeURIComponent(ch.chapterName)}`)} 
                                    className="bg-[#A7F3D0] border-2 border-black px-4 py-2 rounded-xl font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-black" /> Test
                                  </motion.button>
                                </div>
                              </div>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#FAF8F5]"
                                  >
                                    {ch.subTopics.map((st, stIdx) => (
                                      <label
                                        key={stIdx}
                                        onClick={() => toggleSubTopic(subjIdx, chIdx, stIdx)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border-2 border-black font-bold text-sm cursor-pointer transition-all ${
                                          st.completed 
                                            ? 'bg-[#A7F3D0] line-through text-gray-700 shadow-none translate-x-[1px] translate-y-[1px]' 
                                            : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={st.completed}
                                          onChange={() => {}} 
                                          className="w-4 h-4 mt-0.5 rounded border-2 border-black accent-black cursor-pointer shrink-0"
                                        />
                                        <span className="flex-1 leading-snug">{st.name}</span>
                                      </label>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
              })}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {/* 🌟 ANIMATED AI Guided Modal */}
      <AnimatePresence>
        {activeMasterChapter && (
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
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white border border-black px-2 py-0.5 rounded text-black">
                    AI Guided Educator • {activeMasterChapter.subject}
                  </span>
                  <h2 className="text-xl font-black mt-1 text-black">{activeMasterChapter.chapter}</h2>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveMasterChapter(null)} 
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
                        <div className="font-medium leading-relaxed text-black prose prose-sm prose-black max-w-none prose-p:leading-snug prose-headings:font-black prose-a:text-blue-600 prose-ul:list-disc prose-ol:list-decimal overflow-x-auto">
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
                  placeholder="Ask a follow-up about this chapter..." 
                  className="flex-1 bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-xs outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black" 
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendGuidedChat} 
                  disabled={guidedLoading || !guidedInput.trim()} 
                  className="bg-[#BFDBFE] border-2 border-black px-6 py-3 rounded-xl font-black text-xs cursor-pointer disabled:opacity-50 transition-shadow shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
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