'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, Bell, Palette, Save } from 'lucide-react';

// 🌟 IMPORT FRAMER MOTION
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface UserSettings {
  emailNotifications: boolean;
  studyReminders: boolean;
  highContrastMode: boolean;
  themeColor: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    studyReminders: true,
    highContrastMode: false,
    themeColor: 'Classic Neo-Brutalist',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, 'student_settings', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserSettings;
          setSettings(data);
          if (data.highContrastMode || data.themeColor === 'High Contrast Dark') {
            document.documentElement.classList.add('dark-mode');
          } else {
            document.documentElement.classList.remove('dark-mode');
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const applyTheme = (theme: string, isDarkChecked: boolean) => {
    const isDark = theme === 'High Contrast Dark' || isDarkChecked;
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  const handleThemeChange = (theme: string) => {
    const isDark = theme === 'High Contrast Dark';
    setSettings(prev => ({
      ...prev,
      themeColor: theme,
      highContrastMode: isDark
    }));
    applyTheme(theme, isDark);
  };

  const handleToggleDarkMode = (checked: boolean) => {
    const newTheme = checked ? 'High Contrast Dark' : 'Classic Neo-Brutalist';
    setSettings(prev => ({
      ...prev,
      highContrastMode: checked,
      themeColor: newTheme
    }));
    applyTheme(newTheme, checked);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await setDoc(doc(db, 'student_settings', user.uid), settings, { merge: true });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-black text-xl">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          LOADING SETTINGS...
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
      className="max-w-4xl mx-auto space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      
      {/* 🌟 ANIMATED Banner */}
      <motion.div variants={itemVariants} className="bg-[#FF8A65] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-sm font-black uppercase tracking-wider bg-white border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Platform Preferences
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4">
            Settings & Controls ⚙️
          </h1>
          <p className="font-bold text-lg mt-2 text-black">
            Manage your notification preferences, display options, and account security parameters.
          </p>
        </div>

        <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 shrink-0">
          <Settings className="w-10 h-10 text-black" />
          <div>
            <div className="text-xs font-black uppercase text-gray-500">System Status</div>
            <div className="text-sm font-black text-emerald-600">Secure & Synced</div>
          </div>
        </div>
      </motion.div>

      {/* 🌟 ANIMATED Form */}
      <motion.form variants={itemVariants} onSubmit={handleSave} className="bg-white border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        
        <div className="space-y-4">
          <h3 className="font-black text-lg uppercase tracking-wider flex items-center gap-2 border-b-2 border-black pb-2">
            <Bell className="w-5 h-5" /> Notifications & Alerts
          </h3>

          <motion.div whileHover={{ scale: 1.01 }} className="flex items-center justify-between p-4 bg-[#FAF8F5] border-2 border-black rounded-2xl">
            <div>
              <span className="font-black block text-sm">Email Exam Deadlines</span>
              <span className="text-xs font-bold text-gray-600">Receive timely warnings before target entrance exam application cutoffs.</span>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="w-6 h-6 accent-black cursor-pointer"
            />
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} className="flex items-center justify-between p-4 bg-[#FAF8F5] border-2 border-black rounded-2xl">
            <div>
              <span className="font-black block text-sm">Study Streak Reminders</span>
              <span className="text-xs font-bold text-gray-600">Get daily cloud reminders to finish your scheduled study modules.</span>
            </div>
            <input
              type="checkbox"
              checked={settings.studyReminders}
              onChange={(e) => setSettings({ ...settings, studyReminders: e.target.checked })}
              className="w-6 h-6 accent-black cursor-pointer"
            />
          </motion.div>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="font-black text-lg uppercase tracking-wider flex items-center gap-2 border-b-2 border-black pb-2">
            <Palette className="w-5 h-5" /> Appearance & Theme
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-black text-sm uppercase block">UI Design System</label>
              <select
                value={settings.themeColor}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="w-full bg-[#FAF8F5] border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer outline-none"
              >
                <option value="Classic Neo-Brutalist">Classic Neo-Brutalist (Cream & Bold)</option>
                <option value="High Contrast Dark">High Contrast Dark Mode</option>
              </select>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} className="flex items-center justify-between p-4 bg-[#FAF8F5] border-2 border-black rounded-2xl">
              <div>
                <span className="font-black block text-sm">High Contrast Dark Mode</span>
                <span className="text-xs font-bold text-gray-600">Invert dashboard colors for high contrast visibility.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrastMode}
                onChange={(e) => handleToggleDarkMode(e.target.checked)}
                className="w-6 h-6 accent-black cursor-pointer"
              />
            </motion.div>
          </div>
        </div>

        <div className="pt-6 border-t-2 border-black flex items-center justify-between">
          <AnimatePresence>
            {savedMessage && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="font-black text-emerald-600 text-sm">
                ✓ Settings saved successfully!
              </motion.span>
            )}
          </AnimatePresence>
          <div className="ml-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={saving}
              className="bg-[#BFDBFE] border-4 border-black px-8 py-3.5 rounded-2xl font-black text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'SAVING...' : 'SAVE SETTINGS'}
            </motion.button>
          </div>
        </div>

      </motion.form>

    </motion.div>
  );
}