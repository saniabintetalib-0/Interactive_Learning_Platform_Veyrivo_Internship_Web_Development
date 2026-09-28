'use client';

import React, { useState } from 'react';
import { Play, RotateCcw, CheckCircle2, Code2, Terminal } from 'lucide-react';

interface EngineProps {
  topic?: any;
  onCompleteStep?: () => void;
}

export default function CSCodeEngine({ topic, onCompleteStep }: EngineProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const steps = [
    { label: 'Start Program', code: 'let totalSum = 0;\nlet numbers = [10, 25, 30, 45];', desc: 'Initialize totalSum accumulator variable to 0.' },
    { label: 'Initialize Loop', code: 'for (let i = 0; i < numbers.length; i++) {', desc: 'Start for-loop iteration index i = 0.' },
    { label: 'Check Condition', code: '  if (numbers[i] > 20) {', desc: 'Evaluate if current element is greater than threshold 20.' },
    { label: 'Accumulate Sum', code: '    totalSum += numbers[i];\n  }\n}', desc: 'Add matching value to totalSum accumulator.' },
    { label: 'Output Result', code: 'console.log("Filtered Sum =", totalSum);', desc: 'Output final result to console stream.' }
  ];

  const handleRunNextStep = () => {
    if (activeStep < steps.length - 1) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
      setLogs((prev) => [...prev, `[Step ${nextStep}] ${steps[nextStep].desc}`]);
      if (nextStep === steps.length - 1 && onCompleteStep) {
        onCompleteStep();
      }
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setLogs(['[Step 0] Program loaded. Click "Run Next Step" to step through algorithm.']);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white border border-sky-100 rounded-2xl p-5 shadow-xs">
      <div className="flex-1 flex flex-col space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Algorithmic Logic & Flowchart Engine</span>
          </div>
          <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-full font-mono font-bold">
            JavaScript AST Execution
          </span>
        </div>

        {/* Code Visualizer Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-200 space-y-2">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl transition-all border ${
                idx === activeStep
                  ? 'bg-sky-950/80 border-sky-500 text-sky-200 shadow-md ring-1 ring-sky-500/50'
                  : idx < activeStep
                  ? 'bg-slate-900/50 border-emerald-900/50 text-emerald-400 opacity-70'
                  : 'bg-slate-900/20 border-transparent text-slate-500'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] mb-1 font-sans">
                <span className="font-bold uppercase tracking-wider">{s.label}</span>
                {idx < activeStep && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <pre className="text-xs leading-relaxed overflow-x-auto">{s.code}</pre>
            </div>
          ))}
        </div>

        {/* Live Output Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-2 pb-1.5 border-b border-slate-800">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Execution Terminal</span>
          </div>
          <div className="space-y-1 text-slate-300 max-h-28 overflow-y-auto">
            {logs.length === 0 ? (
              <span className="text-slate-500 italic">Click Run to execute steps...</span>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col justify-between bg-sky-50/50 border border-sky-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-3 border-b border-sky-200 pb-2">
            Execution Controls
          </h3>

          <div className="bg-white p-3.5 rounded-xl border border-sky-100 text-xs mb-4 shadow-xs">
            <span className="text-slate-500 block mb-1 font-medium">Current Step Description:</span>
            <p className="text-slate-800 font-medium leading-relaxed">{steps[activeStep].desc}</p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleRunNextStep}
            disabled={activeStep >= steps.length - 1}
            className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5" /> Step Through Algorithm ({activeStep + 1}/{steps.length})
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Execution
          </button>
        </div>
      </div>
    </div>
  );
}
