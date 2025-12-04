import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MagicParticles } from './components/MagicParticles';
import { WebcamHandler } from './components/WebcamHandler';
import { AppMode, Point3D, ShapeDefinition } from './types';
import * as MathUtils from './utils/math';
import { generateGeminiShape, detectGesture } from './services/geminiService';
import { 
  Sparkles, 
  Hand, 
  ArrowRight, 
  Wand2, 
  Camera, 
  Loader2,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

// Increased particle count for more detailed models
const PARTICLE_COUNT = 6000;

const DEFAULT_SHAPES: ShapeDefinition[] = [
  { id: 'tree', name: 'Festive Tree', points: MathUtils.generateTreePoints(PARTICLE_COUNT), description: "Point Up or use buttons to change" },
  { id: 'present', name: 'Magic Present', points: MathUtils.generatePresentPoints(PARTICLE_COUNT), description: "Open Hand: Scatter | Fist: Form" },
  { id: 'wreath', name: 'Holiday Wreath', points: MathUtils.generateWreathPoints(PARTICLE_COUNT), description: "A circle of joy" },
  { id: 'cane', name: 'Candy Cane', points: MathUtils.generateCandyCanePoints(PARTICLE_COUNT), description: "Sweet winter treats" },
  { id: 'santa_hat', name: 'Santa Hat', points: MathUtils.generateSantaHatPoints(PARTICLE_COUNT), description: "Jolly accessories" },
  { id: 'snowman', name: 'Snowman', points: MathUtils.generateSnowmanPoints(PARTICLE_COUNT), description: "Do you want to build a snowman?" },
  { id: 'star', name: 'North Star', points: MathUtils.generateStarPoints(PARTICLE_COUNT), description: "Guiding light" },
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
  const [promptInput, setPromptInput] = useState("");
  const [aiStatus, setAiStatus] = useState("");

  const activeShape = useMemo(() => {
    if (customShapePoints && customShapeName) {
      return { 
        id: 'custom', 
        name: customShapeName, 
        points: customShapePoints, 
        color: '#00ccff', // Fallback for custom shapes
        description: "AI Generated Magic" 
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

  const handleGenerateShape = async () => {
    if (!promptInput.trim()) return;
    setAiLoading(true);
    setAiStatus("Summoning magic...");
    try {
      const points = await generateGeminiShape(promptInput, PARTICLE_COUNT);
      if (points.length > 0) {
        setCustomShapeName(promptInput);
        setCustomShapePoints(points);
        setAiStatus("Magic summoned!");
        setTimeout(() => setAiStatus(""), 3000);
      } else {
        setAiStatus("The spell fizzled.");
      }
    } catch (e) {
      console.error(e);
      setAiStatus("Connection error.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleVisionFrame = useCallback(async (base64: string) => {
    if (!isCameraActive) return;
    try {
        const gesture = await detectGesture(base64);
        
        if (gesture === 'OPEN_HAND') {
           setAiStatus("Gesture: Scatter!");
           // Note: Motion usually handles visual scatter, but this confirms AI sees it
        } else if (gesture === 'FIST') {
           setAiStatus("Gesture: Form Shape");
        } else if (gesture === 'POINTING_UP') {
           setAiStatus("Gesture: Next!");
           handleNextShape();
        } else {
            setAiStatus("");
        }
    } catch (e) {
        // Silently fail on 429 to avoid UI spam, or show subtle indicator
        console.warn("AI busy");
    }
  }, [isCameraActive, handleNextShape]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden text-white select-none">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 4.5], fov: 60 }}>
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

      {/* Webcam Handler (Invisible) */}
      {isCameraActive && (
        <WebcamHandler 
            onMotion={handleMotion} 
            onFrame={handleVisionFrame} 
            deviceId={selectedCameraId}
            onCamerasFound={handleCamerasFound}
        />
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="font-magic text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-100 to-yellow-200 drop-shadow-[0_0_10px_rgba(255,200,50,0.5)] animate-pulse">
            Holiday Hand Magic
          </h1>
          <p className="font-cinzel text-sm md:text-base text-blue-200 opacity-80 tracking-widest uppercase">
            {isCameraActive ? "Open Hand: Scatter • Fist: Form Shape • Point Up: Next" : "Hover Mouse to Scatter • Hold Click to Form"}
          </p>
        </div>

        {/* AI Status Indicator */}
        {aiStatus && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-xs font-mono text-cyan-300 transition-opacity duration-500">
                {aiStatus}
            </div>
        )}

        <div className="flex-1" />

        {/* Bottom Controls */}
        <div className="w-full max-w-4xl mx-auto space-y-6 pointer-events-auto">
          
          {/* Navigation & Shape Info */}
          <div className="flex items-center justify-between">
            <button 
              onClick={handlePrevShape}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm group"
            >
              <ArrowRight className="w-6 h-6 rotate-180 text-white/70 group-hover:text-white" />
            </button>

            <div className="text-center">
              <h2 className="font-magic text-4xl text-amber-100 drop-shadow-md">
                {activeShape.name}
              </h2>
              <p className="font-cinzel text-xs text-blue-200/60 mt-1">
                {activeShape.description}
              </p>
            </div>

            <button 
              onClick={handleNextShape}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm group"
            >
              <ArrowRight className="w-6 h-6 text-white/70 group-hover:text-white" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center bg-black/20 backdrop-blur-lg rounded-2xl p-4 border border-white/5">
            
            {/* Camera Controls Group */}
            <div className="flex gap-2">
                {/* Camera Toggle */}
                <button 
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-cinzel text-sm font-bold border whitespace-nowrap",
                    isCameraActive 
                      ? "bg-red-500/20 border-red-500/50 text-red-200 shadow-[0_0_15px_rgba(255,0,0,0.2)]" 
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  <Camera className="w-4 h-4" />
                  {isCameraActive ? "ON" : "Enable Camera"}
                </button>

                {/* Camera Selector (Only shows when active and multiple cams exist) */}
                {isCameraActive && cameras.length > 1 && (
                    <div className="relative">
                        <select 
                            value={selectedCameraId || ""} 
                            onChange={(e) => setSelectedCameraId(e.target.value)}
                            className="appearance-none h-full pl-3 pr-8 bg-black/40 border border-white/10 rounded-lg text-xs font-cinzel text-white focus:outline-none focus:border-amber-400/50 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <option value="">Default Camera</option>
                            {cameras.map((cam) => (
                                <option key={cam.deviceId} value={cam.deviceId} className="bg-slate-900">
                                    {cam.label || `Camera ${cam.deviceId.slice(0, 5)}...`}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* AI Generator Input */}
            <div className="flex-1 w-full flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Summon a shape (e.g. 'Sleigh', 'Bell')" 
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 font-cinzel"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateShape()}
                />
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-200/50" />
              </div>
              <button 
                onClick={handleGenerateShape}
                disabled={aiLoading}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg font-cinzel text-sm font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Genie
              </button>
            </div>

            {/* Interaction Hint (Mouse) */}
            <div 
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-cinzel cursor-help whitespace-nowrap"
                onMouseEnter={() => setMode(AppMode.SCATTER)}
                onMouseLeave={() => setMode(AppMode.FORM)}
                onMouseDown={() => setMode(AppMode.FORM)}
            >
                <Hand className="w-4 h-4" />
                <span>Hover Swirl</span>
            </div>

          </div>

          <div className="text-center">
            <p className="font-cinzel text-[10px] text-white/20">
               Powered by React Three Fiber & Gemini API
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
