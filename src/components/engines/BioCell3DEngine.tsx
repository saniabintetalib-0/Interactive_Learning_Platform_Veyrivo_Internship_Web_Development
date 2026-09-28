'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Info, RotateCw, ZoomIn, Layers, CheckCircle2, Sparkles } from 'lucide-react';

interface EngineProps {
  topic?: any;
  onCompleteStep?: () => void;
}

interface OrganelleInfo {
  name: string;
  color: string;
  function: string;
  analogy: string;
  fact: string;
}

export default function BioCell3DEngine({ topic, onCompleteStep }: EngineProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedPart, setSelectedPart] = useState<string>('nucleus');
  const [explodedView, setExplodedView] = useState<boolean>(false);
  const [animating, setAnimating] = useState<boolean>(true);
  const [identifiedParts, setIdentifiedParts] = useState<string[]>([]);
  const [quizScore, setQuizScore] = useState<number>(0);

  const partsInfo: Record<string, OrganelleInfo> = {
    nucleus: {
      name: 'Nucleus & Nucleolus',
      color: '#ec4899',
      function: 'Houses genetic material (DNA & RNA) and directs cellular activities like growth and reproduction.',
      analogy: 'The City Hall & Central Library',
      fact: 'Contains almost all of the cell’s genomic DNA!'
    },
    mitochondria: {
      name: 'Mitochondria (Powerhouse)',
      color: '#f59e0b',
      function: 'Converts glucose and oxygen into ATP chemical energy via cellular respiration.',
      analogy: 'The Power Plant',
      fact: 'Mitochondria have their own independent DNA and double-membranes!'
    },
    ribosomes: {
      name: 'Ribosomes & Endoplasmic Reticulum',
      color: '#3b82f6',
      function: 'Rough ER is studded with ribosomes for protein synthesis; Smooth ER produces lipids and detoxifies.',
      analogy: 'Automated Factory Assembly Lines',
      fact: 'A single human cell can contain millions of active ribosomes!'
    },
    membrane: {
      name: 'Cell Membrane (Plasma Membrane)',
      color: '#10b981',
      function: 'Phospholipid bilayer that regulates movement of substances in and out of the cell.',
      analogy: 'Guarded Border Security Gate',
      fact: 'It is only about 7.5 to 10 nanometers thick!'
    },
    cytoplasm: {
      name: 'Cytoplasm & Cytosol',
      color: '#8b5cf6',
      function: 'Jelly-like fluid supporting organelles and providing a site for metabolic reactions.',
      analogy: 'The Infrastructure & Atmosphere',
      fact: 'Consists of 80% water, salts, and suspended organic molecules.'
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 13.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf472b6, 0.8);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    const cellGroup = new THREE.Group();
    cellGroup.position.set(0, 0.4, 0);
    scene.add(cellGroup);

    // 1. Membrane
    const membraneGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const membraneMat = new THREE.MeshPhongMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.25,
      wireframe: false,
      shininess: 90
    });
    const membraneMesh = new THREE.Mesh(membraneGeo, membraneMat);
    cellGroup.add(membraneMesh);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.15 });
    const wireMesh = new THREE.Mesh(membraneGeo, wireMat);
    cellGroup.add(wireMesh);

    // 2. Nucleus
    const nucleusGeo = new THREE.SphereGeometry(1.2, 24, 24);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x831843,
      emissiveIntensity: 0.3
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    cellGroup.add(nucleusMesh);

    const nucleolusGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const nucleolusMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xf472b6 });
    const nucleolusMesh = new THREE.Mesh(nucleolusGeo, nucleolusMat);
    nucleusMesh.add(nucleolusMesh);

    // 3. Mitochondria
    const mitoMeshes: THREE.Group[] = [];
    const createMitochondria = (pos: THREE.Vector3) => {
      const mitoGroup = new THREE.Group();
      const capGeo = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.4,
        emissive: 0xd97706,
        emissiveIntensity: 0.2
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.rotation.z = Math.PI / 4;
      mitoGroup.add(capMesh);

      mitoGroup.position.copy(pos);
      cellGroup.add(mitoGroup);
      mitoMeshes.push(mitoGroup);
    };

    createMitochondria(new THREE.Vector3(1.8, 0.9, 0.6));
    createMitochondria(new THREE.Vector3(-1.6, -0.8, 0.9));
    createMitochondria(new THREE.Vector3(1.2, -1.6, -0.8));

    // 4. Ribosomes / ER
    const erGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const torusGeo = new THREE.TorusGeometry(1.5 + i * 0.35, 0.07, 8, 24, Math.PI * 1.2);
      const torusMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      const torusMesh = new THREE.Mesh(torusGeo, torusMat);
      torusMesh.rotation.x = Math.PI / 3 + i * 0.2;
      torusMesh.rotation.y = i * 0.5;
      erGroup.add(torusMesh);
    }
    cellGroup.add(erGroup);

    // Ribosomes Floating Particles
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 80;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 5;
      posArray[i + 1] = (Math.random() - 0.5) * 5;
      posArray[i + 2] = (Math.random() - 0.5) * 5;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({ size: 0.08, color: 0x60a5fa, transparent: true, opacity: 0.8 });
    const particleSystem = new THREE.Points(particlesGeo, particleMat);
    cellGroup.add(particleSystem);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (animating) {
        cellGroup.rotation.y = elapsedTime * 0.2;
        cellGroup.rotation.x = Math.sin(elapsedTime * 0.1) * 0.1;
      }

      mitoMeshes.forEach((m, idx) => {
        m.scale.setScalar(1 + Math.sin(elapsedTime * 3 + idx) * 0.05);
      });

      const targetMitoOffset = explodedView ? 1.4 : 1.0;
      mitoMeshes.forEach(m => {
        m.position.lerpVectors(m.position.clone().normalize().multiplyScalar(1.8), m.position.clone().normalize().multiplyScalar(2.8 * targetMitoOffset), 0.05);
      });

      renderer.render(scene, camera);
    };

    animate();

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cellGroup.rotation.y += deltaX * 0.008;
      cellGroup.rotation.x += deltaY * 0.008;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.min(Math.max(camera.position.z + e.deltaY * 0.01, 6), 22);
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [explodedView, animating]);

  const handleSelectPart = (partKey: string) => {
    setSelectedPart(partKey);
    if (!identifiedParts.includes(partKey)) {
      const updated = [...identifiedParts, partKey];
      setIdentifiedParts(updated);
      setQuizScore(updated.length * 20);
      if (updated.length >= 4 && onCompleteStep) {
        onCompleteStep();
      }
    }
  };

  const activeInfo = partsInfo[selectedPart] || partsInfo.nucleus;

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white border border-sky-100 rounded-2xl p-5 shadow-xs relative overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">3D Real-time WebGL Engine (Next.js + TS)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAnimating(!animating)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                animating ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${animating ? 'animate-spin' : ''}`} />
              {animating ? 'Auto Rotate On' : 'Rotate Paused'}
            </button>

            <button
              onClick={() => setExplodedView(!explodedView)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                explodedView ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {explodedView ? 'Exploded View ON' : 'Explode Parts'}
            </button>
          </div>
        </div>

        <div className="relative w-full h-[400px] lg:h-[460px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 cursor-grab active:cursor-grabbing group shadow-inner flex items-center justify-center">
          <div ref={mountRef} className="w-full h-full flex items-center justify-center" />

          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs text-slate-200 flex items-center gap-2 pointer-events-none shadow-xs">
            <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
            <span>Click & Drag to rotate 3D Cell</span>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 justify-center bg-slate-950/80 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 shadow-md">
            {Object.keys(partsInfo).map((key) => {
              const part = partsInfo[key];
              const isSelected = selectedPart === key;
              const isExplored = identifiedParts.includes(key);

              return (
                <button
                  key={key}
                  onClick={() => handleSelectPart(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md scale-105'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: part.color }}></span>
                  {part.name.split(' ')[0]}
                  {isExplored && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col justify-between bg-sky-50/50 border border-sky-100 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-sky-200">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: activeInfo.color }}></span>
              <h3 className="text-base font-bold text-slate-900">{activeInfo.name}</h3>
            </div>
            <span className="text-[10px] bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-mono font-bold">
              Class 9 Bio
            </span>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-sky-600" /> Biological Function
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-sky-100 shadow-xs">
              {activeInfo.function}
            </p>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Real-world Analogy
            </h4>
            <div className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
              {activeInfo.analogy}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              💡 Did You Know?
            </h4>
            <p className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              {activeInfo.fact}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-sky-200">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-600 font-medium">Interactive Exploration</span>
            <span className="text-emerald-700 font-bold">{identifiedParts.length} / 5 Explored</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
            <div
              className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(identifiedParts.length / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
