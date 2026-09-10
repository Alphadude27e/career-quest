'use client';

import { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Zap, RefreshCw, ArrowRight, ArrowLeft, Sparkles, Plus } from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
}

export default function FlashcardsPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  
  // Deck Navigation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const generateCards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setIsFlipped(false);
    setCurrentIndex(0);
    
    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      
      const data = await res.json();
      if (data.flashcards) {
        setFlashcards(data.flashcards);
      }
    } catch (err) {
      console.error("Failed to generate cards:", err);
      alert("Failed to build deck. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c + 1), 150);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c - 1), 150);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 15 } }
  };

  return (
    <motion.div className="max-w-4xl mx-auto space-y-8 pb-12 font-sans text-black" variants={containerVariants} initial="hidden" animate="show">
      
      {/* HEADER BANNER */}
      <motion.div variants={itemVariants} className="bg-[#FDE047] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-sm font-black uppercase tracking-wider bg-white border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">Active Recall</span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4 text-black flex items-center gap-2">
            AI Flashcards <Zap className="w-8 h-8 fill-black" />
          </h1>
          <p className="font-bold text-lg mt-2 text-gray-800">Master high-yield concepts through rapid-fire spaced repetition.</p>
        </div>
      </motion.div>

      {/* GENERATOR INPUT */}
      <motion.div variants={itemVariants} className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <h3 className="font-black text-base uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" /> Generate New Deck
        </h3>
        <form onSubmit={generateCards} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to memorize? (e.g. Organic Chemistry Reactions)"
            className="flex-1 bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-sm outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !topic.trim()}
            className="bg-[#A7F3D0] border-2 border-black px-6 py-3 rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0 text-black"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'BUILDING DECK...' : 'BUILD DECK'}
          </motion.button>
        </form>
      </motion.div>

      {/* FLASHCARD INTERFACE */}
      {flashcards.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-col items-center space-y-8 mt-8">
          
          <div className="flex justify-between w-full max-w-2xl font-black text-sm uppercase tracking-widest text-gray-500">
            <span>Card {currentIndex + 1} of {flashcards.length}</span>
            <span>Click to flip</span>
          </div>

          {/* THE 3D CARD */}
          <div 
            className="relative w-full max-w-2xl h-80 sm:h-96 cursor-pointer"
            style={{ perspective: 1000 }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              className="w-full h-full relative preserve-3d"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* FRONT (QUESTION) */}
              <div 
                className="absolute w-full h-full backface-hidden bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="absolute top-4 left-4 bg-[#BFDBFE] border-2 border-black px-3 py-1 text-[10px] font-black uppercase rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Question</div>
                <h2 className="text-2xl sm:text-4xl font-black text-black leading-tight">
                  {flashcards[currentIndex].front}
                </h2>
              </div>

              {/* BACK (ANSWER) */}
              <div 
                className="absolute w-full h-full backface-hidden bg-[#FDE047] border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="absolute top-4 left-4 bg-white border-2 border-black px-3 py-1 text-[10px] font-black uppercase rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Answer</div>
                <h2 className="text-xl sm:text-3xl font-bold text-black leading-snug">
                  {flashcards[currentIndex].back}
                </h2>
              </div>
            </motion.div>
          </div>

          {/* NAVIGATION BUTTONS */}
          <div className="flex gap-4 w-full max-w-2xl">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="flex-1 bg-white border-4 border-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 cursor-pointer transition-all hover:bg-gray-50"
            >
              <ArrowLeft className="w-6 h-6" /> Previous
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextCard}
              disabled={currentIndex === flashcards.length - 1}
              className="flex-1 bg-[#FF8A65] border-4 border-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 cursor-pointer transition-all"
            >
              Next <ArrowRight className="w-6 h-6" />
            </motion.button>
          </div>

        </motion.div>
      )}
    </motion.div>
  );
}