'use client';

import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  FileSpreadsheet,
  Flame,
  Zap,
  Database,
  Bot
} from 'lucide-react';
import StudentLearningHub from '@/components/StudentLearningHub';
import StudentDashboard from '@/components/StudentDashboard';
import ProposalView from '@/components/ProposalView';
import AILearningAssistant from '@/components/AILearningAssistant';
import { StudentProfile } from '@/types';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'learn' | 'dashboard' | 'proposal'>('learn');
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    name: 'Alex Rivera',
    grade: 9,
    avatar: '🎓',
    level: 4,
    totalXp: 320,
    streakDays: 7,
    topicsCompletedCount: 5,
    quizAccuracy: 88
  });

  // Fetch initial profile from SQLite API
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.success && data.profile) {
          setStudentProfile(data.profile);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    loadProfile();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Glassmorphism Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-sky-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900">
                  EduVerse <span className="text-sky-600">3D</span>
                </h1>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  Next.js + TS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Interactive Learning Platform — Classes 6–12
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('learn')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'learn'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Learn
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> My Dashboard
            </button>

            <button
              onClick={() => setActiveTab('proposal')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'proposal'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Proposal
            </button>
          </nav>

          {/* Student Stats Badges */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>PostgreSQL Live</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              <Flame className="w-3.5 h-3.5" />
              <span>{studentProfile.streakDays}d</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200">
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span>{studentProfile.totalXp} XP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'learn' && (
          <StudentLearningHub
            studentProfile={studentProfile}
            onUpdateProfile={(updated) => setStudentProfile(updated)}
          />
        )}

        {activeTab === 'dashboard' && (
          <StudentDashboard studentProfile={studentProfile} />
        )}

        {activeTab === 'proposal' && <ProposalView />}
      </main>

      {/* AI Tutor Assistant Drawer */}
      <AILearningAssistant />
    </div>
  );
}
