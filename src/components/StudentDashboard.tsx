'use client';

import React from 'react';
import { Award, Zap, Flame, CheckCircle, Trophy, Target } from 'lucide-react';
import { StudentProfile } from '@/types';

interface DashboardProps {
  studentProfile: StudentProfile;
}

export default function StudentDashboard({ studentProfile }: DashboardProps) {
  const xpForNextLevel = 500;
  const progressPercent = Math.min((studentProfile.totalXp / xpForNextLevel) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-sky-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
            {studentProfile.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Level {studentProfile.level} Student
              </span>
              <span className="text-sky-100 text-xs font-semibold">Grade {studentProfile.grade}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{studentProfile.name}</h2>
            <p className="text-xs text-sky-100 mt-1 font-medium">Keep up the daily learning streak! 🚀</p>
          </div>
        </div>

        <div className="w-full md:w-64 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span>Level Progress</span>
            <span className="font-mono">{studentProfile.totalXp} / {xpForNextLevel} XP</span>
          </div>
          <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden border border-white/20">
            <div
              className="bg-gradient-to-r from-amber-300 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-sky-100 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total XP</span>
            <span className="text-xl font-black text-slate-900 font-mono">{studentProfile.totalXp}</span>
          </div>
        </div>

        <div className="bg-white border border-sky-100 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Daily Streak</span>
            <span className="text-xl font-black text-slate-900 font-mono">{studentProfile.streakDays} Days</span>
          </div>
        </div>

        <div className="bg-white border border-sky-100 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Topics Mastered</span>
            <span className="text-xl font-black text-slate-900 font-mono">{studentProfile.topicsCompletedCount}</span>
          </div>
        </div>

        <div className="bg-white border border-sky-100 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Quiz Accuracy</span>
            <span className="text-xl font-black text-slate-900 font-mono">{studentProfile.quizAccuracy}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
