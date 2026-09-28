'use client';

import React from 'react';
import { Layers, Database, Sparkles, Code, CheckCircle2 } from 'lucide-react';

export default function ProposalView() {
  return (
    <div className="bg-white border border-sky-100 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
      <div className="border-b border-sky-100 pb-4">
        <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Project Specifications</span>
        <h2 className="text-2xl font-black text-slate-900 mt-1">EduVerse 3D Next.js + TypeScript Ecosystem</h2>
        <p className="text-xs text-slate-600 mt-1">Next.js 15 App Router, TypeScript strongly typed components, PostgreSQL integration, 3D WebGL Web visualizers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
            <Code className="w-4 h-4" /> Next.js App Router Architecture
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Built using Next.js Server Components, Client Components (`'use client'`), and API Route Handlers under `src/app/`.
          </p>
        </div>

        <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
            <Database className="w-4 h-4" /> PostgreSQL Relational DB Integration
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Relational persistence storing 70 curriculum topics (Classes 6–12), student progress, quiz attempts, bookmarks, and revision notes.
          </p>
        </div>

        <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <Layers className="w-4 h-4" /> 5 Interactive WebGL & Canvas Engines
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Real-time 3D Cell Anatomy, Bohr Atomic Model, SHM Pendulum Simulator, Trig Wave Plotter, and CS Algorithmic Runner.
          </p>
        </div>

        <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <Sparkles className="w-4 h-4" /> Light-Blue Modern Theme
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Vibrant Tailwind CSS colors (`sky-600`, `indigo-600`, `emerald-500`) with glassmorphism header & card overlays.
          </p>
        </div>
      </div>
    </div>
  );
}
