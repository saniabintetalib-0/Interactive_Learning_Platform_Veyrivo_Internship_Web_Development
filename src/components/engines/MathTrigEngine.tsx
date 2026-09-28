'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sliders, RotateCcw } from 'lucide-react';

interface EngineProps {
  topic?: any;
  onCompleteStep?: () => void;
}

export default function MathTrigEngine({ topic, onCompleteStep }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [amplitude, setAmplitude] = useState<number>(60);
  const [frequency, setFrequency] = useState<number>(1);
  const [phase, setPhase] = useState<number>(0);
  const [waveType, setWaveType] = useState<'sin' | 'cos' | 'tan'>('sin');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.03;

      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const w = rect.width || 650;
      const h = rect.height || 400;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const centerY = h / 2;

      // Draw Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      // Horizontal axis
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      // Vertical axis
      ctx.beginPath();
      ctx.moveTo(w / 4, 0);
      ctx.lineTo(w / 4, h);
      ctx.stroke();

      // Draw Unit Circle on left side (x: 100, y: centerY)
      const circleX = Math.min(100, w * 0.2);
      const circleRadius = amplitude;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(circleX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      const angle = time * frequency + phase;
      const pointX = circleX + circleRadius * Math.cos(angle);
      const pointY = centerY - circleRadius * Math.sin(angle);

      // Rotating vector line
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(circleX, centerY);
      ctx.lineTo(pointX, pointY);
      ctx.stroke();

      // Moving point dot
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Connecting projected line to wave
      const startWaveX = circleX + circleRadius + 20;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(pointX, pointY);
      ctx.lineTo(startWaveX, pointY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Wave Curve
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let x = startWaveX; x < w; x++) {
        const dx = (x - startWaveX) * 0.02;
        let yVal = 0;

        if (waveType === 'sin') {
          yVal = Math.sin(dx * frequency - time + phase);
        } else if (waveType === 'cos') {
          yVal = Math.cos(dx * frequency - time + phase);
        } else {
          yVal = Math.tan(dx * frequency - time + phase);
        }

        const yPos = centerY - yVal * amplitude;
        if (x === startWaveX) ctx.moveTo(x, yPos);
        else ctx.lineTo(x, yPos);
      }
      ctx.stroke();

      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [amplitude, frequency, phase, waveType]);

  const handleReset = () => {
    setAmplitude(60);
    setFrequency(1);
    setPhase(0);
    if (onCompleteStep) onCompleteStep();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white border border-sky-100 rounded-2xl p-5 shadow-xs">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Trigonometric Wave & Unit Circle Plotter</span>
          </div>
          <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-full font-mono font-bold uppercase">
            f(x) = {amplitude} · {waveType}({frequency}x + {phase.toFixed(1)})
          </span>
        </div>

        <div className="relative w-full h-[400px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col justify-between bg-sky-50/50 border border-sky-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-3 border-b border-sky-200 pb-2">
            Wave Function Selector
          </h3>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['sin', 'cos', 'tan'] as const).map((wt) => (
              <button
                key={wt}
                onClick={() => setWaveType(wt)}
                className={`py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
                  waveType === wt
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                }`}
              >
                {wt}(x)
              </button>
            ))}
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1 text-slate-700 font-semibold">
                <span>Amplitude (A):</span>
                <span className="text-sky-700 font-mono font-bold">{amplitude}</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={amplitude}
                onChange={(e) => setAmplitude(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-700 font-semibold">
                <span>Frequency (ω):</span>
                <span className="text-sky-700 font-mono font-bold">{frequency}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Wave Parameters
        </button>
      </div>
    </div>
  );
}
