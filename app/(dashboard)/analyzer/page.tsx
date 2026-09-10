'use client';

import { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { FileSearch, UploadCloud, Loader2, Sparkles, CheckCircle, HelpCircle, FileText } from 'lucide-react';

interface AnalyzedQuestion {
  questionText: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hint: string;
}

interface PaperAnalysis {
  paperSummary: string;
  questions: AnalyzedQuestion[];
}

export default function PaperAnalyzerPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview URL
    setImagePreview(URL.createObjectURL(file));

    // Convert to Base64 for the API
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const analyzePaper = async () => {
    if (!imageBase64 || loading) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const res = await fetch('/api/analyze-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        throw new Error("No analysis returned");
      }
    } catch (err) {
      console.error("Failed to analyze paper:", err);
      alert("Failed to analyze the image. Please try a clearer picture.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 15 } }
  };

  return (
    <motion.div className="max-w-5xl mx-auto space-y-8 pb-12 font-sans text-black" variants={containerVariants} initial="hidden" animate="show">
      
      {/* HEADER BANNER */}
      <motion.div variants={itemVariants} className="bg-[#FCA5A5] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-sm font-black uppercase tracking-wider bg-white border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">Vision AI</span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4 text-black flex items-center gap-2">
            Paper Analyzer <FileSearch className="w-8 h-8 text-black" />
          </h1>
          <p className="font-bold text-lg mt-2 text-gray-900">Upload a snapshot of a past paper. AI will extract questions, identify topics, and generate hints.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* UPLOAD SECTION (LEFT) */}
        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
          <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 text-center flex flex-col items-center">
            
            {imagePreview ? (
              <div className="w-full relative border-4 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <img src={imagePreview} alt="Paper Preview" className="w-full h-auto object-cover max-h-64" />
                <button 
                  onClick={() => { setImagePreview(null); setImageBase64(null); setAnalysis(null); }}
                  className="absolute top-2 right-2 bg-white border-2 border-black font-black text-xs px-2 py-1 rounded-lg cursor-pointer hover:bg-red-200"
                >
                  CLEAR
                </button>
              </div>
            ) : (
              <label className="w-full h-48 border-4 border-black border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-[#FAF8F5] hover:bg-[#BFDBFE] transition-colors group">
                <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-black mb-2" />
                <span className="font-black text-sm uppercase">Upload Paper Image</span>
                <span className="text-xs font-bold text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={analyzePaper}
              disabled={!imageBase64 || loading}
              className="w-full bg-[#A7F3D0] border-4 border-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 cursor-pointer transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              {loading ? 'SCANNING PAPER...' : 'ANALYZE PAPER'}
            </motion.button>
          </div>
        </motion.div>

        {/* RESULTS SECTION (RIGHT) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {!analysis && !loading && (
             <div className="bg-white border-4 border-black p-12 rounded-3xl text-center space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col items-center justify-center opacity-70">
               <FileText className="w-16 h-16 text-gray-300" />
               <h2 className="text-2xl font-black">Awaiting Document</h2>
               <p className="font-bold text-gray-500 max-w-sm">Upload an image of your exam paper on the left to see the AI breakdown here.</p>
             </div>
          )}

          {loading && (
             <div className="bg-[#FAF8F5] border-4 border-black p-12 rounded-3xl text-center space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col items-center justify-center">
               <Loader2 className="w-16 h-16 text-black animate-spin" />
               <h2 className="text-2xl font-black animate-pulse">Vision AI is reading...</h2>
             </div>
          )}

          {analysis && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-black text-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                <span className="text-[10px] font-black uppercase text-gray-400">Document Summary</span>
                <p className="font-bold text-sm mt-1">{analysis.paperSummary}</p>
              </div>

              <div className="space-y-4">
                {analysis.questions.map((q, idx) => (
                  <div key={idx} className="bg-white border-4 border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#BFDBFE] border-2 border-black text-xs font-black px-2 py-0.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">Q{idx + 1}</span>
                        <span className="font-black text-sm uppercase bg-[#FAF8F5] border-2 border-black px-2 py-0.5 rounded text-black">{q.topic}</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black ${
                        q.difficulty === 'Hard' ? 'bg-[#FCA5A5]' : q.difficulty === 'Medium' ? 'bg-[#FDE047]' : 'bg-[#A7F3D0]'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    
                    <p className="font-bold text-base leading-relaxed text-black mb-4">
                      {q.questionText}
                    </p>

                    <div className="bg-[#FAF8F5] border-2 border-black p-3 rounded-xl flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-black uppercase text-gray-500 mb-0.5">AI Hint</span>
                        <p className="text-sm font-bold text-gray-800">{q.hint}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}