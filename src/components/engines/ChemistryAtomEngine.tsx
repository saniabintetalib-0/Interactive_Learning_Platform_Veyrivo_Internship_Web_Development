'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Atom, Sparkles, CheckCircle2 } from 'lucide-react';

interface EngineProps {
  topic?: any;
  onCompleteStep?: () => void;
}

interface ElementData {
  name: string;
  symbol: string;
  z: number;
  protons: number;
  neutrons: number;
  shells: number[];
  color: string;
}

export default function ChemistryAtomEngine({ topic, onCompleteStep }: EngineProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedElementKey, setSelectedElementKey] = useState<string>('C');
  const [builtMolecule, setBuiltMolecule] = useState<string | null>(null);

  const elementsData: Record<string, ElementData> = {
    H: { name: 'Hydrogen', symbol: 'H', z: 1, protons: 1, neutrons: 0, shells: [1], color: '#38bdf8' },
    C: { name: 'Carbon', symbol: 'C', z: 6, protons: 6, neutrons: 6, shells: [2, 4], color: '#f59e0b' },
    N: { name: 'Nitrogen', symbol: 'N', z: 7, protons: 7, neutrons: 7, shells: [2, 5], color: '#8b5cf6' },
    O: { name: 'Oxygen', symbol: 'O', z: 8, protons: 8, neutrons: 8, shells: [2, 6], color: '#ef4444' },
    Na: { name: 'Sodium', symbol: 'Na', z: 11, protons: 11, neutrons: 12, shells: [2, 8, 1], color: '#10b981' }
  };

  const activeElement = elementsData[selectedElementKey] || elementsData.C;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const atomGroup = new THREE.Group();
    scene.add(atomGroup);

    // Nucleus
    const nucleusGroup = new THREE.Group();
    const totalParticles = activeElement.protons + activeElement.neutrons;
    const particleRadius = 0.22;

    for (let i = 0; i < Math.min(totalParticles, 24); i++) {
      const isProton = i < activeElement.protons;
      const sphereGeo = new THREE.SphereGeometry(particleRadius, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isProton ? 0xef4444 : 0x94a3b8,
        roughness: 0.3,
        emissive: isProton ? 0x991b1b : 0x334155,
        emissiveIntensity: 0.2
      });
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);

      const phi = Math.acos(-1 + (2 * i) / totalParticles);
      const theta = Math.sqrt(totalParticles * Math.PI) * phi;
      const r = 0.6 * Math.cbrt(Math.random());

      mesh.position.set(
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi)
      );
      nucleusGroup.add(mesh);
    }
    atomGroup.add(nucleusGroup);

    // Shells & Electrons
    const electronMeshes: any[] = [];

    activeElement.shells.forEach((electronCount, shellIdx) => {
      const shellRadius = 2.2 + shellIdx * 1.6;

      const ringGeo = new THREE.RingGeometry(shellRadius - 0.02, shellRadius + 0.02, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.5 + shellIdx * 0.3;
      ringMesh.rotation.y = shellIdx * 0.4;
      atomGroup.add(ringMesh);

      for (let e = 0; e < electronCount; e++) {
        const eGeo = new THREE.SphereGeometry(0.16, 16, 16);
        const eMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.8
        });
        const eMesh = new THREE.Mesh(eGeo, eMat);

        atomGroup.add(eMesh);
        electronMeshes.push({
          mesh: eMesh,
          ringMesh: ringMesh,
          radius: shellRadius,
          angleOffset: (e / electronCount) * Math.PI * 2,
          speed: 1.5 / (shellIdx + 1)
        });
      }
    });

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      nucleusGroup.rotation.y = elapsedTime * 0.3;
      nucleusGroup.rotation.x = elapsedTime * 0.2;

      electronMeshes.forEach((e) => {
        const currentAngle = elapsedTime * e.speed + e.angleOffset;
        const localX = e.radius * Math.cos(currentAngle);
        const localY = e.radius * Math.sin(currentAngle);

        const posVector = new THREE.Vector3(localX, localY, 0);
        posVector.applyEuler(e.ringMesh.rotation);
        e.mesh.position.copy(posVector);
      });

      renderer.render(scene, camera);
    };

    animate();

    const domElement = renderer.domElement;

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [selectedElementKey]);

  const handleBuildWaterMolecule = () => {
    setBuiltMolecule('H₂O Water');
    if (onCompleteStep) onCompleteStep();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white border border-sky-100 rounded-2xl p-5 shadow-xs">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Atom className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">3D Atomic Structure & Orbital Lab</span>
          </div>
          <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-full font-mono font-bold">
            Interactive Bohr Model
          </span>
        </div>

        <div className="relative w-full h-[400px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center">
          <div ref={mountRef} className="w-full h-full flex items-center justify-center" />

          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-center min-w-[100px] shadow-md">
            <span className="text-2xl font-black text-white block">{activeElement.symbol}</span>
            <span className="text-xs font-bold text-cyan-400 block">{activeElement.name}</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col justify-between bg-sky-50/50 border border-sky-100 rounded-2xl p-5 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-3 border-b border-sky-200 pb-2">
            Element Selector
          </h3>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.keys(elementsData).map((key) => {
              const el = elementsData[key];
              const isSelected = selectedElementKey === key;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedElementKey(key)}
                  className={`p-2.5 rounded-xl flex flex-col items-center border transition-all ${
                    isSelected
                      ? 'bg-sky-600 border-sky-600 text-white shadow-xs font-bold scale-105'
                      : 'bg-white border-sky-200 text-slate-700 hover:bg-sky-50'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-mono">Z={el.z}</span>
                  <span className="text-lg font-black">{el.symbol}</span>
                  <span className="text-[10px] text-slate-500 truncate max-w-full">{el.name}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-sky-100 text-xs space-y-2 mb-4 shadow-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Protons (🔴):</span>
              <span className="text-rose-600 font-bold">{activeElement.protons}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Neutrons (⚪):</span>
              <span className="text-slate-700 font-bold">{activeElement.neutrons}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Electron Shell Config:</span>
              <span className="text-sky-700 font-mono font-bold">{activeElement.shells.join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-sky-200">
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Interactive Molecule Challenge
          </h4>

          <button
            onClick={handleBuildWaterMolecule}
            className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-200 flex items-center justify-center gap-2 transition-all"
          >
            🧪 Connect 2x H + 1x O → Form Water (H₂O)
          </button>

          {builtMolecule && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Successfully synthesized <b>{builtMolecule}</b> molecule!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
