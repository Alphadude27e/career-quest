'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { LayoutDashboard, Compass, BookOpen, GraduationCap, ClipboardList, Briefcase, Settings, LogOut, Menu, X, Sparkles, User } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState('Scholar');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    setIsMounted(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isSubscribed) router.push('/login');
        return;
      }

      try {
        // 1. Check if the user has a profile document in Firestore
        const userDoc = await getDoc(doc(db, 'student_profiles', user.uid));
        
        if (userDoc.exists() && isSubscribed) {
          // Profile exists! Load their data for the sidebar
          const data = userDoc.data();
          if (data.name) setUserName(data.name);
        } else if (isSubscribed) {
          // 🚨 NO PROFILE FOUND! Force redirect to the setup page
          router.push('/onboarding'); 
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'bg-[#BFDBFE]', iconBg: 'bg-[#FACC15]' },
    { name: 'AI Counsellor', href: '/counsellor', icon: Compass, color: 'bg-[#FF8A65]', iconBg: 'bg-[#4ADE80]' },
    { name: 'My Profile', href: '/profile', icon: User, color: 'bg-[#E9D5FF]', iconBg: 'bg-[#93C5FD]' },
    { name: 'Study & Tests', href: '/study', icon: GraduationCap, color: 'bg-[#FED7AA]', iconBg: 'bg-[#FACC15]' },
    { name: 'Entrance Exams', href: '/exams', icon: ClipboardList, color: 'bg-[#FBCFE8]', iconBg: 'bg-[#FB923C]' },
    { name: 'AI Educator', href: '/educator', icon: Sparkles, color: 'bg-[#A7F3D0]', iconBg: 'bg-[#93C5FD]' },
    { name: 'Syllabus Tracker', href: '/syllabus', icon: BookOpen, color: 'bg-[#FDE68A]', iconBg: 'bg-[#F87171]' },
    { name: 'Colleges & Careers', href: '/opportunities', icon: Briefcase, color: 'bg-[#C7D2FE]', iconBg: 'bg-[#4ADE80]' },
  ];

  if (!isMounted) {
    return <div className="min-h-screen bg-[#FAF8F5]" />;
  }

  return (
    <div className="flex h-screen bg-[#FAF8F5] font-sans text-black overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* 🌟 WIDER, CHUNKIER SIDEBAR */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-80 bg-white border-r-4 border-black transition-transform duration-300 flex flex-col justify-between overflow-y-auto shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        
        {/* Top Section (Red Block) */}
        <div className="bg-[#F87171] border-b-4 border-black p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-black">Career Quest.</h1>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden p-1 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 🌟 CLICKABLE LINK TO /profile */}
          <Link 
            href="/profile"
            onClick={() => setSidebarOpen(false)}
            className="block bg-white border-2 border-black p-3.5 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-3 overflow-hidden">
              <span className="text-base font-black truncate pt-0.5">✨ {userName}</span>
              <div className="p-2 bg-[#FEF08A] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Middle Navigation Section */}
        <div className="flex-1 p-6 space-y-3 bg-[#FAF8F5]">
          <nav className="space-y-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-base border-2 border-black transition-all ${
                    isActive
                      ? `${item.color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-1`
                      : 'bg-white hover:bg-gray-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <div className={`p-2 border-2 border-black rounded-xl ${item.iconBg} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0`}>
                    <Icon className="w-5 h-5 text-black shrink-0" />
                  </div>
                  <span className="truncate pt-0.5">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section (Green Footer Block) */}
        <div className="p-6 space-y-4 bg-[#A7F3D0] border-t-4 border-black">
          <Link
            href="/settings"
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-base border-2 border-black bg-white hover:bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="p-2 border-2 border-black rounded-xl bg-[#FACC15] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <Settings className="w-5 h-5 text-black shrink-0" />
            </div>
            <span className="pt-0.5">Settings</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 bg-[#F87171] text-black font-black py-4 px-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer text-base"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b-4 border-black shrink-0">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-black text-xl">Career Quest.</span>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#FAF8F5]">
          {children}
        </main>

      </div>

    </div>
  );
}