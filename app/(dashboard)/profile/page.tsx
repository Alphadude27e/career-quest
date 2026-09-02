'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
// 🌟 Added deleteUser for account removal
import { onAuthStateChanged, deleteUser } from 'firebase/auth';
// 🌟 Added deleteDoc for wiping ghost data
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
// 🌟 Added Trash2 and AlertTriangle for the Danger Zone
import { GraduationCap, Save, Sparkles, User, BookOpen, Target, Plus, X, Trash2, AlertTriangle } from 'lucide-react';

import { motion, AnimatePresence, Variants } from 'framer-motion';

interface StudentProfile {
  name: string;
  grade: string;
  stream: string;
  targetGoal: string;
  weakSubjects: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  
  // Profile States
  const [profile, setProfile] = useState<StudentProfile>({
    name: '',
    grade: 'Class 12',
    stream: 'Science (PCM)',
    targetGoal: '',
    weakSubjects: [],
  });
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Deletion States
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, 'student_profiles', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as StudentProfile;
          setProfile({
            name: data.name || user.displayName || 'Scholar',
            grade: data.grade || 'Class 12',
            stream: data.stream || 'Science (PCM)',
            targetGoal: data.targetGoal || 'Undergraduate Admissions',
            weakSubjects: data.weakSubjects || [],
          });
        } else {
          setProfile({
            name: user.displayName || 'Scholar',
            grade: 'Class 12',
            stream: 'Science (PCM)',
            targetGoal: 'Computer Science Undergraduate',
            weakSubjects: ['Physics - Electromagnetism'],
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await setDoc(doc(db, 'student_profiles', user.uid), profile, { merge: true });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const addSubject = () => {
    if (!newSubject.trim() || profile.weakSubjects.includes(newSubject.trim())) return;
    setProfile(prev => ({
      ...prev,
      weakSubjects: [...prev.weakSubjects, newSubject.trim()]
    }));
    setNewSubject('');
  };

  const removeSubject = (subjectToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      weakSubjects: prev.weakSubjects.filter(sub => sub !== subjectToRemove)
    }));
  };

  // 🌟 HANDLE ACCOUNT DELETION & CLEANUP
  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setIsDeleting(true);
    setDeleteError('');

    const uid = auth.currentUser.uid;

    try {
      // 1. 🔥 WIPE ALL GHOST DATA FROM FIRESTORE FIRST
      await deleteDoc(doc(db, 'student_profiles', uid));
      await deleteDoc(doc(db, 'student_syllabus_tracker', uid));
      await deleteDoc(doc(db, 'student_exams_data', uid));
      await deleteDoc(doc(db, 'student_study_data', uid));

      // 2. 🗑️ DELETE THE FIREBASE AUTH ACCOUNT
      await deleteUser(auth.currentUser);

      // 3. 🚀 REDIRECT TO LOGIN
      router.push('/login');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      
      // Firebase requires a "recent login" to delete an account for security reasons.
      if (error.code === 'auth/requires-recent-login') {
        setDeleteError("For security reasons, you must log out and log back in before deleting your account.");
      } else {
        setDeleteError("An error occurred while deleting your account. Please try again.");
      }
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-black text-xl">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          LOADING STUDENT PROFILE...
        </motion.div>
      </div>
    );
  }

  // 🌟 ANIMATION VARIANTS
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 15 } }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-8 pb-12 font-sans text-black"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      
      {/* 🌟 ANIMATED Banner */}
      <motion.div variants={itemVariants} className="bg-[#BFDBFE] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-sm font-black uppercase tracking-wider bg-white border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
            Account Details
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4 text-black">
            Student Profile 🎓
          </h1>
          <p className="font-bold text-lg mt-2 text-gray-800">
            Customize your academic parameters so your AI counsellor can tailor every roadmap and test to your exact goals.
          </p>
        </div>

        <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 shrink-0">
          <GraduationCap className="w-10 h-10 text-black fill-[#FF8A65]" />
          <div>
            <div className="text-xs font-black uppercase text-gray-500">Status</div>
            <div className="text-sm font-black text-emerald-600">Active Scholar</div>
          </div>
        </div>
      </motion.div>

      {/* 🌟 ANIMATED Form */}
      <motion.form variants={itemVariants} onSubmit={handleSave} className="bg-white border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-black text-sm uppercase flex items-center gap-2">
              <User className="w-4 h-4" /> Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-black text-sm uppercase flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Grade / Class
            </label>
            <select
              value={profile.grade}
              onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
              className="w-full bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer outline-none text-black"
            >
              <option value="Class 10">Class 10</option>
              <option value="Class 11">Class 11</option>
              <option value="Class 12">Class 12</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Dropper / Gap Year">Dropper / Gap Year</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-black text-sm uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Stream / Specialization
            </label>
            <input
              type="text"
              value={profile.stream}
              onChange={(e) => setProfile({ ...profile, stream: e.target.value })}
              placeholder="e.g. Science (PCM), Commerce, Humanities"
              className="w-full bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-black text-sm uppercase flex items-center gap-2">
              <Target className="w-4 h-4" /> Target Goal / Dream Major
            </label>
            <input
              type="text"
              value={profile.targetGoal}
              onChange={(e) => setProfile({ ...profile, targetGoal: e.target.value })}
              placeholder="e.g. Computer Science Undergraduate at Tier-1"
              className="w-full bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
              required
            />
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t-2 border-black">
          <label className="font-black text-sm uppercase block text-black">
            Weak Subjects / Focus Topics
          </label>
          <p className="text-xs font-bold text-gray-600">
            Add specific topics or chapters you want your AI study hub to prioritize during custom test generations.
          </p>

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. Calculus Integration, Organic Chemistry..."
              className="flex-1 bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-2.5 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={addSubject}
              className="bg-[#A7F3D0] border-2 border-black px-5 py-2.5 rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center gap-1 text-black"
            >
              <Plus className="w-4 h-4" /> Add
            </motion.button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <AnimatePresence>
              {profile.weakSubjects.map((sub, idx) => (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  key={idx} 
                  className="bg-[#FF8A65] border-2 border-black text-xs font-black px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 text-black"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() => removeSubject(sub)}
                    className="cursor-pointer hover:opacity-70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="pt-6 border-t-2 border-black flex items-center justify-between">
          <AnimatePresence>
            {savedMessage && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="font-black text-emerald-600 text-sm">
                ✓ Profile saved successfully!
              </motion.span>
            )}
          </AnimatePresence>
          <div className="ml-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={saving}
              className="bg-[#FF8A65] border-4 border-black px-8 py-3.5 rounded-2xl font-black text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow flex items-center gap-2 cursor-pointer disabled:opacity-50 text-black"
            >
              <Save className="w-5 h-5" />
              {saving ? 'SAVING...' : 'SAVE PROFILE'}
            </motion.button>
          </div>
        </div>
      </motion.form>

      {/* 🌟 DANGER ZONE: ACCOUNT DELETION */}
      <motion.div variants={itemVariants} className="mt-8 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-black p-6 text-white flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-[#F87171]" />
          <h2 className="text-2xl font-black">Danger Zone</h2>
        </div>
        
        <div className="p-6 sm:p-8 space-y-4">
          <p className="font-bold text-gray-800 text-lg">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <p className="text-sm font-bold text-gray-600 bg-[#FAF8F5] p-4 border-2 border-black rounded-xl border-dashed">
            <strong>What happens when you delete your account?</strong><br/>
            • Your profile and academic configurations are permanently wiped.<br/>
            • Your syllabus progress, test history, and exam tracking are deleted.<br/>
            • Your account is removed from Firebase completely.
          </p>

          {deleteError && (
            <div className="bg-[#F87171] text-black font-black p-4 border-2 border-black rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="mt-6 inline-flex items-center gap-2 bg-white text-[#DC2626] border-4 border-[#DC2626] font-black py-3 px-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] transition-all cursor-pointer"
            >
              <Trash2 className="w-5 h-5" /> Delete My Account
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 bg-[#F87171] border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <h3 className="text-xl font-black mb-4 text-black">Are you absolutely sure?</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 bg-black text-white font-black py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
                >
                  {isDeleting ? 'Wiping Data...' : 'Yes, wipe everything'}
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setDeleteError('');
                  }}
                  disabled={isDeleting}
                  className="flex-1 bg-white text-black border-4 border-black font-black py-3 px-6 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="w-5 h-5" /> Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
}