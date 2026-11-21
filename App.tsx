import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MagicParticles } from './components/MagicParticles';
import { WebcamHandler } from './components/WebcamHandler';
import { AppMode, Point3D, ShapeDefinition } from './types';
import * as MathUtils from './utils/math';
import { generateGeminiShape, detectGesture } from './services/geminiService';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronDown,
  Hand,
  Loader2,
  SendHorizontal,
} from 'lucide-react';
import clsx from 'clsx';

const PARTICLE_COUNT = 6000;

const DEFAULT_SHAPES: ShapeDefinition[] = [
  { id: 'tree', name: 'Festive Tree', points: MathUtils.generateTreePoints(PARTICLE_COUNT), description: 'Point up or use arrows to switch' },
  { id: 'present', name: 'Gift Box', points: MathUtils.generatePresentPoints(PARTICLE_COUNT), description: 'Open hand to scatter, fist to form' },
  { id: 'wreath', name: 'Winter Wreath', points: MathUtils.generateWreathPoints(PARTICLE_COUNT), description: 'Concentric evergreen ring' },
  { id: 'cane', name: 'Candy Cane', points: MathUtils.generateCandyCanePoints(PARTICLE_COUNT), description: 'Curved peppermint lattice' },
  { id: 'santa_hat', name: 'Winter Cap', points: MathUtils.generateSantaHatPoints(PARTICLE_COUNT), description: 'Tapered fleece silhouette' },
  { id: 'snowman', name: 'Snowman', points: MathUtils.generateSnowmanPoints(PARTICLE_COUNT), description: 'Three-sphere frost figure' },
  { id: 'star', name: 'North Star', points: MathUtils.generateStarPoints(PARTICLE_COUNT), description: 'Eight-point celestial star' },
];

function App() {
  const [currentShapeIdx, setCurrentShapeIdx] = useState(0);
  const [customShapePoints, setCustomShapePoints] = useState<Point3D[] | null>(null);
  const [customShapeName, setCustomShapeName] = useState<string | null>(null);

  const [mode, setMode] = useState<AppMode>(AppMode.FORM);
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);

  const [aiLoading, setAiLoading] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [aiStatus, setAiStatus] = useState('');

  const activeShape = useMemo(() => {
    if (customShapePoints && customShapeName) {
      return {
        id: 'custom',
        name: customShapeName,
        points: customShapePoints,
        color: '#e2b76e',
        description: 'Custom generated sculpture',
      };
    }
    return DEFAULT_SHAPES[currentShapeIdx];
  }, [currentShapeIdx, customShapePoints, customShapeName]);

  const handleMotion = useCallback((intensity: number) => {
    setMotionIntensity(intensity);
  }, []);

  const handleCamerasFound = useCallback((devices: MediaDeviceInfo[]) => {
    setCameras(devices);
  }, []);

  const handleNextShape = useCallback(() => {
    setCustomShapePoints(null);
    setCustomShapeName(null);
    setCurrentShapeIdx((prev) => (prev + 1) % DEFAULT_SHAPES.length);
  }, []);

  const handlePrevShape = useCallback(() => {
    setCustomShapePoints(null);
    setCustomShapeName(null);
    setCurrentShapeIdx((prev) => (prev - 1 + DEFAULT_SHAPES.length) % DEFAULT_SHAPES.length);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
      if (event.key === 'ArrowRight') handleNextShape();
      if (event.key === 'ArrowLeft') handlePrevShape();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNextShape, handlePrevShape]);

  const handleGenerateShape = async () => {
    if (!promptInput.trim()) return;
    setAiLoading(true);
    setAiStatus('Generating point cloud...');
    try {
      const points = await generateGeminiShape(promptInput, PARTICLE_COUNT);
      if (points.length > 0) {
        setCustomShapeName(promptInput.trim());
        setCustomShapePoints(points);
        setAiStatus('Shape ready');
        setTimeout(() => setAiStatus(''), 3000);
      } else {
        setAiStatus('Unable to generate points');
      }
    } catch (e) {
      console.error(e);
      setAiStatus('Connection error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleVisionFrame = useCallback(async (base64: string) => {
    if (!isCameraActive) return;
    try {
      const gesture = await detectGesture(base64);
      if (gesture === 'OPEN_HAND') {
        setAiStatus('Gesture: Scatter');
      } else if (gesture === 'FIST') {
        setAiStatus('Gesture: Form');
      } else if (gesture === 'POINTING_UP') {
        setAiStatus('Gesture: Next shape');
        handleNextShape();
      } else {
        setAiStatus('');
      }
    } catch {
      console.warn('AI busy');
    }
  }, [isCameraActive, handleNextShape]);

  const shapeCounter = customShapePoints
    ? 'Custom'
    : `${String(currentShapeIdx + 1).padStart(2, '0')} / ${String(DEFAULT_SHAPES.length).padStart(2, '0')}`;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0b0c0e] text-[#ededed] select-none">
      {/* 3D Particle Stage */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0.25, 4.9], fov: 56 }}>
          <ambientLight intensity={0.5} />
          <MagicParticles
            mode={mode}
            targetPoints={activeShape.points}
            count={PARTICLE_COUNT}
            color={activeShape.color}
            motionIntensity={isCameraActive ? motionIntensity : 0}
          />
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
        </Canvas>
      </div>

      {/* Webcam Handler */}
      {isCameraActive && (
        <WebcamHandler
          onMotion={handleMotion}
          onFrame={handleVisionFrame}
          deviceId={selectedCameraId}
          onCamerasFound={handleCamerasFound}
        />
      )}

      {/* UI Chrome Overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
        {/* Quiet Top Header */}
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-xl font-normal tracking-tight text-[#ededed] sm:text-2xl">
              Holiday Hand Magic
            </h1>
            <span className="hidden font-mono-num text-xs text-[#a1a1aa] sm:inline">
              6,000 particles
            </span>
          </div>
          <p className="text-right text-xs text-[#a1a1aa]">
            {isCameraActive
              ? 'Open hand: scatter · Fist: form · Point up: next'
              : 'Drag to orbit · Hold swirl to scatter'}
          </p>
        </header>

        {/* Status Toast */}
        {aiStatus && (
          <div className="pointer-events-none fixed left-1/2 top-20 -translate-x-1/2 rounded-lg border border-white/10 bg-[#141518]/90 px-3 py-1.5 font-mono-num text-xs text-[#e2b76e] backdrop-blur-md">
            {aiStatus}
          </div>
        )}

        <div className="flex-1" />

        {/* Grounded Bottom Dock (separated cleanly from 3D sculpture) */}
        <footer className="pointer-events-auto mx-auto w-full max-w-4xl">
          <div className="rounded-xl border border-white/10 bg-[#121316]/90 p-3 backdrop-blur-md sm:p-4">
            {/* Row 1: Sculpture Navigation */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={handlePrevShape}
                aria-label="Previous shape"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#18191d] text-[#a1a1aa] transition-colors hover:border-white/20 hover:text-[#ededed]"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <div className="min-w-0 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono-num text-xs text-[#e2b76e]">{shapeCounter}</span>
                  <h2 className="truncate font-display text-lg font-normal text-[#ededed] sm:text-xl">
                    {activeShape.name}
                  </h2>
                </div>
                <p className="truncate text-xs text-[#a1a1aa]">
                  {activeShape.description}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextShape}
                aria-label="Next shape"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#18191d] text-[#a1a1aa] transition-colors hover:border-white/20 hover:text-[#ededed]"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Row 2: Camera, Gemini Generator & Scatter Control */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={clsx(
                    'flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors',
                    isCameraActive
                      ? 'border-[#e2b76e]/50 bg-[#e2b76e]/15 text-[#f6e3ba]'
                      : 'border-white/10 bg-[#18191d] text-[#ededed] hover:border-white/20',
                  )}
                >
                  <Camera className="h-4 w-4" strokeWidth={1.5} />
                  <span>{isCameraActive ? 'Camera on' : 'Camera'}</span>
                </button>

                {isCameraActive && cameras.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedCameraId || ''}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="h-10 cursor-pointer appearance-none rounded-lg border border-white/10 bg-[#18191d] pl-3 pr-8 text-xs text-[#ededed] focus:border-[#e2b76e] focus:outline-none"
                    >
                      <option value="">Default camera</option>
                      {cameras.map((cam) => (
                        <option key={cam.deviceId} value={cam.deviceId} className="bg-[#18191d]">
                          {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a1a1aa]" strokeWidth={1.5} />
                  </div>
                )}
              </div>

              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Describe a shape (sleigh, bell, deer)"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0d0e11] px-3 text-xs text-[#ededed] placeholder-[#71717a] focus:border-[#e2b76e] focus:outline-none sm:text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateShape()}
                />
                <button
                  type="button"
                  onClick={handleGenerateShape}
                  disabled={aiLoading}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#e2b76e] px-3.5 text-xs font-medium text-[#111215] transition-colors hover:bg-[#e9c484] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <SendHorizontal className="h-4 w-4" strokeWidth={1.5} />}
                  <span>Generate</span>
                </button>
              </div>

              <button
                type="button"
                className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-[#18191d] px-3 text-xs font-medium text-[#a1a1aa] transition-colors hover:border-white/20 hover:text-[#ededed] md:inline-flex"
                onMouseEnter={() => setMode(AppMode.SCATTER)}
                onMouseLeave={() => setMode(AppMode.FORM)}
                onMouseDown={() => setMode(AppMode.FORM)}
              >
                <Hand className="h-4 w-4" strokeWidth={1.5} />
                <span>Hover scatter</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
