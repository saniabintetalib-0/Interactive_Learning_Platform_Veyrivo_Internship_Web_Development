'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';

interface EngineProps {
  topic?: any;
  onCompleteStep?: () => void;
}

export default function PhysicsPendulumEngine({ topic, onCompleteStep }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [length, setLength] = useState<number>(200); // pixels
  const [mass, setMass] = useState<number>(25); // radius
  const [gravity, setGravity] = useState<number>(9.8);
  const [damping, setDamping] = useState<number>(0.999);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Physics Simulation State
  const stateRef = useRef({
    angle: Math.PI / 4, // 45 degrees initial
    angleVelocity: 0,
    angleAcceleration: 0,
    history: [] as number[]
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const w = rect.width || 600;
      const h = rect.height || 400;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const originX = w / 2;
      const originY = 50;

      if (isRunning) {
        // SHM Physics Equation: alpha = - (g / L) * sin(theta)
        const gConst = gravity * 0.05;
        stateRef.current.angleAcceleration = (-1 * gConst / (length / 20)) * Math.sin(stateRef.current.angle);
        stateRef.current.angleVelocity += stateRef.current.angleAcceleration;
        stateRef.current.angleVelocity *= damping;
        stateRef.current.angle += stateRef.current.angleVelocity;

        stateRef.current.history.push(stateRef.current.angle);
        if (stateRef.current.history.length > 200) {
          stateRef.current.history.shift();
        }
      }

      const bobX = originX + length * Math.sin(stateRef.current.angle);
      const bobY = originY + length * Math.cos(stateRef.current.angle);

      // Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, h);
      ctx.stroke();

      // Draw Support Pivot
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(originX, originY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw Rod
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      // Draw Bob
      const gradient = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, mass);
      gradient.addColorStop(0, '#38bdf8');
      gradient.addColorStop(1, '#0284c7');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bobX, bobY, mass, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Angle Waveform Graph (Bottom right)
      const graphX = 20;
      const graphY = h - 60;
      const graphW = w - 40;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(graphX, graphY - 40, graphW, 80);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(graphX, graphY - 40, graphW, 80);

      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (let i = 0; i < stateRef.current.history.length; i++) {
        const x = graphX + (i / 200) * graphW;
        const y = graphY - stateRef.current.history[i] * 35;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [length, mass, gravity, damping, isRunning]);

  const handleReset = () => {
    stateRef.current.angle = Math.PI / 4;
    stateRef.current.angleVelocity = 0;
    stateRef.current.angleAcceleration = 0;
    stateRef.current.history = [];
    if (onCompleteStep) onCompleteStep();
  };

  // Period T = 2π √(L/g)
  const periodT = (2 * Math.PI * Math.sqrt((length / 20) / gravity)).toFixed(2);

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white border border-sky-100 rounded-2xl p-5 shadow-xs">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Physics SHM Pendulum Simulator</span>
          </div>
          <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-full font-mono font-bold">
            T = {periodT}s
          </span>
        </div>

        <div className="relative w-full h-[400px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col justify-between bg-sky-50/50 border border-sky-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-sky-200 pb-2">
            Variable Controls
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1 text-slate-700 font-semibold">
                <span>Pendulum Length (L):</span>
                <span className="text-sky-700 font-mono font-bold">{length} px</span>
              </div>
              <input
                type="range"
                min="100"
                max="260"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-700 font-semibold">
                <span>Gravity Acceleration (g):</span>
                <span className="text-sky-700 font-mono font-bold">{gravity} m/s²</span>
              </div>
              <input
                type="range"
                min="1.6"
                max="24.8"
                step="0.1"
                value={gravity}
                onChange={(e) => setGravity(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-700 font-semibold">
                <span>Bob Radius / Mass:</span>
                <span className="text-sky-700 font-mono font-bold">{mass}</span>
              </div>
              <input
                type="range"
                min="15"
                max="35"
                value={mass}
                onChange={(e) => setMass(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={handleReset}
            className="py-2.5 px-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
