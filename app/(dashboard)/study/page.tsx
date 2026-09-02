'use client';

import { useState, useEffect, Suspense } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CheckCircle, Play, Sparkles, Plus, RefreshCw, Clock, XCircle, Trash2, Bot, History, Eye, Send } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// Imports for rendering Markdown and Math equations beautifully
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 🌟 IMPORT FRAMER MOTION
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Type for our inline chat feature
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface QuestionExplanation {
  messages: ChatMessage[];
  inputValue: string;
  loading: boolean;
}

function StudyHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoTopic = searchParams.get('topic');

  const [modules, setModules] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Test Taking State
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [testPhase, setTestPhase] = useState<'intro' | 'active' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState<string>('');
  const [userAnswers, setUserAnswers] = useState<string[]>([]); 
  
  // State for inline AI Tutor chats
  const [explanations, setExplanations] = useState<Record<number, QuestionExplanation>>({});

  const [customTopic, setCustomTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [generatingTest, setGeneratingTest] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, 'student_study_data', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.modules) setModules(data.modules);
          if (data.tests) setTests(data.tests);
          if (data.testHistory) setTestHistory(data.testHistory);
        } else {
          await setDoc(docRef, { modules: [], tests: [], testHistory: [] });
        }
      } catch (err) {
        console.error('Error fetching study data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (autoTopic && !loading) {
      setCustomTopic(autoTopic);
      router.replace('/study');
    }
  }, [autoTopic, loading, router]);

  const saveToFirestore = async (updatedModules: any[], updatedTests: any[], updatedHistory: any[]) => {
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'student_study_data', user.uid), { modules: updatedModules, tests: updatedTests, testHistory: updatedHistory }, { merge: true });
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return; 
    
    const newMod = { id: Date.now().toString(), title: newModuleTitle.trim(), completed: false };
    const updated = [newMod, ...modules];
    setModules(updated);
    setNewModuleTitle(''); 
    try { await saveToFirestore(updated, tests, testHistory); } catch (error) {}
  };

  const toggleModule = async (id: string) => {
    const updated = modules.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m));
    setModules(updated);
    await saveToFirestore(updated, tests, testHistory);
  };

  const handleDeleteModule = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    const updated = modules.filter((m) => m.id !== id);
    setModules(updated);
    try { await saveToFirestore(updated, tests, testHistory); } catch (error) {}
  };

  const handleDeleteTest = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = tests.filter((t) => t.id !== id);
    setTests(updated);
    try { await saveToFirestore(modules, updated, testHistory); } catch (error) {}
  };

  const handleGenerateAITest = async (e: React.FormEvent) => {
    e.preventDefault();
    const topicToGenerate = customTopic;
    
    if (!topicToGenerate.trim() || generatingTest || questionCount < 1 || questionCount > 100) return;
    setGeneratingTest(true);

    try {
      const res = await fetch('/api/generate-test', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ topic: topicToGenerate, count: questionCount }) 
      });
      
      if (!res.ok) throw new Error("Failed to generate API response");
      
      const data = await res.json();
      const newTest = { 
        id: 'ai-' + Date.now(), 
        title: `AI Custom Test: ${topicToGenerate}`, 
        questionsCount: data.questions?.length || questionCount, 
        timeMinutes: (data.questions?.length || questionCount) * 2, 
        questions: data.questions || [] 
      };
      
      const updatedTests = [newTest, ...tests];
      setTests(updatedTests);
      setCustomTopic('');
      await saveToFirestore(modules, updatedTests, testHistory);
      setActiveTest(newTest);

    } catch (err) {
      console.error('Error generating test:', err);
      alert('Failed to generate test. Make sure your API route returns the correct format.');
    } finally {
      setGeneratingTest(false);
    }
  };

  const getCorrectAnswerText = (q: any) => {
    if (!q) return '';
    const raw = q.answer !== undefined ? String(q.answer) : String(q.correctAnswer);
    if (q.options && q.options.includes(raw)) return raw; 

    const asNum = parseInt(raw);
    if (!isNaN(asNum) && q.options) {
      if ((raw === "1" || raw === "2" || raw === "3" || raw === "4") && q.options[asNum - 1]) {
        return q.options[asNum - 1]; 
      }
      if (q.options[asNum]) return q.options[asNum]; 
    }
    
    if (raw && ['a', 'b', 'c', 'd'].includes(raw.toLowerCase()) && q.options) {
      const idx = raw.toLowerCase().charCodeAt(0) - 97;
      if (q.options[idx]) return q.options[idx];
    }
    return raw;
  };

  const closeTestModal = () => {
    setActiveTest(null);
    setTestPhase('intro');
    setCurrentQ(0);
    setScore(0);
    setSelectedAns('');
    setUserAnswers([]);
    setExplanations({}); 
  };

  const startTest = () => {
    if (!activeTest.questions || activeTest.questions.length === 0) {
      alert("This test doesn't have any questions formatted correctly.");
      return;
    }
    setTestPhase('active');
  };

  const nextQuestion = () => {
    const q = activeTest.questions[currentQ];
    const correctAnsText = getCorrectAnswerText(q);
    
    let isCorrect = false;
    if (selectedAns === correctAnsText) {
      setScore(s => s + 1);
      isCorrect = true;
    }

    const updatedAnswers = [...userAnswers, selectedAns];
    setUserAnswers(updatedAnswers);

    if (currentQ < activeTest.questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelectedAns('');
    } else {
      setTestPhase('result');
      const finalScore = score + (isCorrect ? 1 : 0);
      
      const newHistoryItem = {
        id: Date.now().toString(),
        testId: activeTest.id,
        title: activeTest.title,
        score: finalScore,
        total: activeTest.questions.length,
        date: new Date().toLocaleDateString(),
        questions: activeTest.questions, 
        userAnswers: updatedAnswers       
      };
      
      const updatedHistory = [newHistoryItem, ...testHistory];
      setTestHistory(updatedHistory);
      saveToFirestore(modules, tests, updatedHistory);
    }
  };

  const openHistoryReview = (historyItem: any) => {
    if (!historyItem.questions || !historyItem.userAnswers) {
      alert("This older test record doesn't have detailed review data saved.");
      return;
    }
    setActiveTest({
      id: historyItem.testId,
      title: historyItem.title,
      questionsCount: historyItem.total,
      timeMinutes: 0,
      questions: historyItem.questions
    });
    setUserAnswers(historyItem.userAnswers);
    setScore(historyItem.score);
    setTestPhase('result');
    setExplanations({}); 
  };

  const formatMath = (text: string) => {
    if (!text) return text;
    return text
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$')
      .replace(/\\\[/g, () => '$$')
      .replace(/\\\]/g, () => '$$');
  };

  const updateExplInput = (questionIndex: number, text: string) => {
    setExplanations(prev => ({
      ...prev,
      [questionIndex]: { ...prev[questionIndex], inputValue: text }
    }));
  };

  const streamChatResponse = async (questionIndex: number, newMessages: ChatMessage[]) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.body) throw new Error("No response stream");

      setExplanations(prev => {
        const curr = prev[questionIndex];
        return {
          ...prev,
          [questionIndex]: { ...curr, loading: false }
        };
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiFullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        aiFullText += chunkText;

        setExplanations(prev => {
          const curr = prev[questionIndex];
          const updatedMessages = [...curr.messages];
          updatedMessages[updatedMessages.length - 1].content = aiFullText;
          
          return {
            ...prev,
            [questionIndex]: { ...curr, messages: updatedMessages, loading: false }
          };
        });
      }
    } catch (error) {
      console.error("AI Explanation Error:", error);
      setExplanations(prev => {
        const curr = prev[questionIndex];
        const updatedMessages = [...curr.messages];
        updatedMessages[updatedMessages.length - 1].content = 'Sorry, I encountered an error. Please try asking again.';
        return { ...prev, [questionIndex]: { ...curr, messages: updatedMessages, loading: false } };
      });
    }
  };

  const handleAskExplanation = async (questionIndex: number, question: string, correct: string, userChoice: string) => {
    if (explanations[questionIndex]?.loading) return;

    const systemMessage: ChatMessage = { 
      role: 'system', 
      content: 'You are an AI Tutor explaining a diagnostic test question. Keep explanations extremely clear and concise. CRITICAL INSTRUCTION: You MUST format all mathematical equations and formulas using strictly $ for inline math and $$ for display math.' 
    };
    
    const userMessage: ChatMessage = { 
      role: 'user', 
      content: `Please explain this question to me.\nQuestion: ${question}\nCorrect Answer: ${correct}\nI chose: ${userChoice}\nBriefly explain why the correct answer is right.` 
    };

    const initialMessages = [systemMessage, userMessage];

    setExplanations(prev => ({
      ...prev,
      [questionIndex]: { 
        messages: [...initialMessages, { role: 'assistant', content: '' }], 
        inputValue: '', 
        loading: true 
      }
    }));

    await streamChatResponse(questionIndex, initialMessages);
  };

  const handleFollowUp = async (e: React.FormEvent, questionIndex: number) => {
    e.preventDefault();
    const chatState = explanations[questionIndex];
    if (!chatState || chatState.loading || !chatState.inputValue.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatState.inputValue };
    const messagesToRender = [...chatState.messages, userMessage, { role: 'assistant', content: '' } as ChatMessage];
    
    setExplanations(prev => ({
      ...prev,
      [questionIndex]: { 
        messages: messagesToRender, 
        inputValue: '', 
        loading: true 
      }
    }));

    const messagesToApi = [...chatState.messages, userMessage];
    await streamChatResponse(questionIndex, messagesToApi);
  };

  if (loading) return <div className="flex h-96 items-center justify-center font-black text-xl text-black">LOADING STUDY HUB...</div>;

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
      className="max-w-6xl mx-auto space-y-8 pb-12 text-black relative"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="bg-[#A7F3D0] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-sm font-black uppercase tracking-wider bg-white border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Active Prep Hub</span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4">Study & Diagnostic Tests 📚</h1>
          <p className="font-bold text-lg mt-2 text-gray-800">Targeted chapters, practice sets, and mock examinations synced to your cloud profile.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          
          {/* Modules */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black">Today's Study Modules</h2>
            <form onSubmit={handleAddModule} className="flex gap-2">
              <input 
                type="text" 
                value={newModuleTitle} 
                onChange={(e) => setNewModuleTitle(e.target.value)} 
                placeholder="Add a custom study module to track..." 
                className="flex-1 bg-white border-2 border-black rounded-xl px-4 py-3 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none text-black placeholder:text-gray-400" 
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit" 
                disabled={!newModuleTitle.trim()}
                className="bg-[#BFDBFE] border-2 border-black px-4 rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Plus className="w-5 h-5 pointer-events-none" />
              </motion.button>
            </form>

            {modules.length === 0 ? (
              <div className="bg-white border-4 border-black p-6 rounded-3xl text-center font-bold text-sm text-gray-600">No study modules yet. Add one above!</div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {modules.map((mod, index) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      key={mod.id || `mod-${index}`} 
                      onClick={() => toggleModule(mod.id)} 
                      className={`p-5 rounded-2xl border-4 border-black cursor-pointer flex items-center justify-between group transition-colors ${mod.completed ? 'bg-gray-200 opacity-60 shadow-none' : 'bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                    >
                      <div className="flex items-center gap-4">
                        <CheckCircle className={`w-6 h-6 shrink-0 ${mod.completed ? 'text-black fill-emerald-400' : 'text-gray-300'}`} />
                        <h3 className={`font-black text-lg ${mod.completed && 'line-through text-gray-500'}`}>{mod.title}</h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleDeleteModule(e, mod.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Test Records Section */}
          <div className="space-y-6 pt-4">
            <h2 className="text-2xl font-black flex items-center gap-2"><History className="w-6 h-6" /> Test Records & History</h2>
            {testHistory.length === 0 ? (
               <div className="bg-white border-4 border-black p-6 rounded-3xl text-center font-bold text-sm text-gray-600">No tests taken yet. Generate and complete a mock exam to see your records!</div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {testHistory.map((historyItem, index) => (
                    <motion.div 
                      whileHover={{ y: -3 }}
                      key={historyItem.id || `history-${index}`} 
                      onClick={() => openHistoryReview(historyItem)}
                      className="bg-white border-4 border-black p-5 rounded-2xl flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-shadow group"
                    >
                       <div className="mb-4">
                         <h3 className="font-black text-sm leading-tight mb-1 group-hover:text-blue-600 transition-colors">{historyItem.title}</h3>
                         <p className="text-xs font-bold text-gray-500">{historyItem.date}</p>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-gray-400 flex items-center gap-1 group-hover:text-black transition-colors">
                            <Eye className="w-4 h-4" /> Review
                          </span>
                          <div className="bg-[#A7F3D0] border-2 border-black px-3 py-1 rounded-lg font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            {historyItem.score} / {historyItem.total}
                          </div>
                       </div>
                    </motion.div>
                 ))}
               </div>
            )}
          </div>

        </motion.div>

        {/* Right Column */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <h3 className="font-black text-base uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" /> AI Custom Test</h3>
            <form onSubmit={handleGenerateAITest} className="space-y-3">
              <input 
                type="text" 
                value={customTopic} 
                onChange={(e) => setCustomTopic(e.target.value)} 
                placeholder="Topic e.g. Organic Chem..." 
                className="w-full bg-[#FAF8F5] border-2 border-black rounded-xl px-3 py-2.5 font-bold text-sm outline-none text-black" 
              />
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-700">Questions:</span>
                <input 
                  type="number" 
                  min="1" max="100" 
                  value={questionCount} 
                  onChange={(e) => setQuestionCount(Number(e.target.value))} 
                  className="w-20 bg-white border-2 border-black rounded-lg px-2 py-1.5 font-bold text-sm outline-none text-black"
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={generatingTest || !customTopic.trim()} 
                className="w-full bg-[#BFDBFE] border-2 border-black px-4 py-2.5 rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-black"
              >
                {generatingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingTest ? 'BUILDING EXAM...' : 'CREATE TEST'}
              </motion.button>
            </form>
          </div>

          <h2 className="text-2xl font-black">Available Exams</h2>
          {tests.length === 0 ? (
            <div className="bg-white border-4 border-black p-6 rounded-3xl text-center font-bold text-sm text-gray-600">No active tests. Generate one above!</div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {tests.map((test, index) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    key={test.id || `test-${index}`} 
                    className="bg-white border-4 border-black p-6 rounded-3xl space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-sm leading-tight">{test.title}</h3>
                      <button onClick={(e) => handleDeleteTest(e, test.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2 text-xs font-bold text-gray-600">
                      <span>{test.questionsCount} Qs</span> • <span>{test.timeMinutes} mins</span>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTest(test)} 
                      className="w-full bg-[#FF8A65] border-2 border-black py-2 rounded-xl font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-black"
                    >
                      <Play className="w-4 h-4" /> Start Test
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* QUIZ MODAL */}
      <AnimatePresence>
        {activeTest && (
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
              className="bg-white border-4 border-black w-full max-w-4xl rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden max-h-[95vh] h-full sm:h-auto"
            >
              
              {/* Modal Header */}
              <div className="bg-[#A7F3D0] border-b-4 border-black p-5 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-black truncate pr-4">{activeTest.title}</h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeTestModal} 
                  className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-red-300 transition-colors shrink-0"
                >
                  <XCircle className="w-5 h-5 text-black" />
                </motion.button>
              </div>

              {/* PHASE 1: INTRO */}
              {testPhase === 'intro' && (
                <div className="p-8 text-center space-y-4 overflow-y-auto">
                  <Clock className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                  <h3 className="text-2xl font-black">Ready to begin?</h3>
                  <p className="font-bold text-gray-600">This test contains {activeTest.questionsCount} questions and you have {activeTest.timeMinutes} minutes.</p>
                  <div className="pt-4">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startTest} 
                      className="bg-[#BFDBFE] border-4 border-black px-8 py-3 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-lg text-black"
                    >
                      Launch Exam Now
                    </motion.button>
                  </div>
                </div>
              )}

              {/* PHASE 2: TAKING THE TEST */}
              {testPhase === 'active' && activeTest.questions && (
                <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col">
                  <div className="mb-6 flex justify-between items-center text-sm font-black text-gray-500 uppercase tracking-wider">
                    <span>Question {currentQ + 1} of {activeTest.questions.length}</span>
                    <span>Current Score: {score}</span>
                  </div>
                  
                  <h3 className="text-xl font-black mb-6 leading-relaxed">
                    {activeTest.questions[currentQ]?.question || activeTest.questions[currentQ]?.text}
                  </h3>
                  
                  <div className="space-y-3 flex-1">
                    {(activeTest.questions[currentQ]?.options || []).map((opt: string, i: number) => (
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        key={i} 
                        onClick={() => setSelectedAns(opt)}
                        className={`w-full text-left p-4 rounded-xl border-4 border-black font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                          selectedAns === opt ? 'bg-[#BFDBFE] translate-x-[1px] translate-y-[1px] shadow-none' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>

                  <div className="mt-8 pt-4 border-t-4 border-black flex justify-end">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextQuestion} 
                      disabled={!selectedAns}
                      className="bg-[#FF8A65] border-4 border-black px-8 py-3 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-black disabled:opacity-50 disabled:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed"
                    >
                      {currentQ < activeTest.questions.length - 1 ? 'Next Question' : 'Submit Exam'}
                    </motion.button>
                  </div>
                </div>
              )}

              {/* PHASE 3: DETAILED REVIEW & RESULTS */}
              {testPhase === 'result' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F5]">
                  <div className="p-6 text-center shrink-0 border-b-4 border-black bg-white">
                    <h3 className="text-3xl font-black mb-2">Exam Complete!</h3>
                    <p className="text-xl font-bold">
                      Final Score: <span className="text-black font-black bg-[#A7F3D0] px-3 py-1 border-2 border-black rounded-lg ml-2">{score} / {activeTest.questions.length}</span>
                    </p>
                  </div>

                  <div className="p-4 sm:p-8 overflow-y-auto space-y-6 flex-1">
                    <h4 className="font-black text-xl uppercase tracking-wider mb-2">Detailed Review</h4>
                    
                    {activeTest.questions.map((q: any, index: number) => {
                       const uAns = userAnswers[index];
                       const correctAnsText = getCorrectAnswerText(q);
                       const isCorrect = uAns === correctAnsText;
                       const chatState = explanations[index];

                       return (
                         <div key={index} className="bg-white border-4 border-black p-5 sm:p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="font-black text-lg mb-4">
                              <span className="text-gray-400 mr-2">Q{index + 1}.</span> 
                              {q.question || q.text}
                            </p>
                            
                            <div className="space-y-3 text-sm font-bold">
                               <div className={`p-4 border-2 border-black rounded-xl ${isCorrect ? 'bg-green-200' : 'bg-red-200'}`}>
                                 <span className="opacity-70 uppercase text-[10px] tracking-wider block mb-1">Your Answer</span>
                                 {uAns} {isCorrect ? '✅' : '❌'}
                               </div>
                               
                               {!isCorrect && (
                                 <div className="p-4 border-2 border-black rounded-xl bg-[#A7F3D0]">
                                   <span className="opacity-70 uppercase text-[10px] tracking-wider block mb-1">Correct Answer</span>
                                   {correctAnsText} ✅
                                 </div>
                               )}
                            </div>

                            {/* INLINE AI TUTOR CHAT */}
                            {chatState ? (
                              <div className="mt-5 bg-[#FAF8F5] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
                                <h5 className="font-black flex items-center gap-2 text-sm uppercase tracking-wider"><Bot className="w-5 h-5 text-blue-500" /> AI Tutor</h5>
                                
                                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                                  {chatState.messages.filter(m => m.role !== 'system' && m.role !== 'user' && m.content.trim() !== '').map((msg, i) => (
                                      <div key={i} className="font-medium text-sm leading-relaxed text-black prose prose-black max-w-none prose-p:leading-snug prose-headings:font-black prose-a:text-blue-600 prose-ul:list-disc prose-ol:list-decimal pl-2 sm:pl-4">
                                        <ReactMarkdown 
                                          remarkPlugins={[remarkGfm, remarkMath]} 
                                          rehypePlugins={[rehypeKatex]}
                                        >
                                          {formatMath(msg.content)}
                                        </ReactMarkdown>
                                      </div>
                                  ))}

                                  {chatState.messages.filter(m => m.role === 'user').slice(1).map((msg, i) => (
                                      <div key={`u-${i}`} className="bg-[#BFDBFE] border-2 border-black p-3 rounded-xl ml-auto w-11/12 font-bold text-sm">
                                        {msg.content}
                                      </div>
                                  ))}

                                  {chatState.loading && (
                                    <div className="flex items-center gap-2 font-bold text-gray-500 pl-4">
                                      <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                                      <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                      <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                      <span className="ml-1 uppercase text-xs">Analyzing...</span>
                                    </div>
                                  )}
                                </div>

                                <form onSubmit={(e) => handleFollowUp(e, index)} className="flex gap-2 pt-2 border-t-2 border-black/10">
                                  <input 
                                    type="text" 
                                    value={chatState.inputValue}
                                    onChange={(e) => updateExplInput(index, e.target.value)}
                                    placeholder="Ask a follow-up question..." 
                                    className="flex-1 bg-white border-2 border-black rounded-xl px-3 py-2 font-bold text-sm outline-none text-black"
                                  />
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit" 
                                    disabled={chatState.loading || !chatState.inputValue.trim()}
                                    className="bg-[#BFDBFE] border-2 border-black px-4 rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center text-black cursor-pointer"
                                  >
                                    <Send className="w-4 h-4" />
                                  </motion.button>
                                </form>
                              </div>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleAskExplanation(index, q.question || q.text, correctAnsText, uAns)}
                                className="mt-5 flex items-center gap-2 text-xs font-black uppercase bg-[#BFDBFE] border-2 border-black px-4 py-2.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-black transition-shadow"
                              >
                                <Bot className="w-4 h-4" /> Ask AI to Explain
                              </motion.button>
                            )}
                         </div>
                       )
                    })}
                  </div>

                  <div className="p-4 sm:p-6 border-t-4 border-black bg-white shrink-0 text-center">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={closeTestModal} 
                      className="bg-black text-white border-4 border-black px-8 py-3 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-lg w-full sm:w-auto"
                    >
                      Close & Return to Hub
                    </motion.button>
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-black text-2xl text-black">LOADING...</div>}>
      <StudyHubContent />
    </Suspense>
  );
}