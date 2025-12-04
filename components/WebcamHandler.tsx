import React, { useRef, useEffect } from 'react';

interface WebcamHandlerProps {
  onMotion: (intensity: number) => void;
  onFrame?: (base64: string) => void; // Optional hook for AI vision
  deviceId?: string;
  onCamerasFound?: (devices: MediaDeviceInfo[]) => void;
}

export const WebcamHandler: React.FC<WebcamHandlerProps> = ({ 
  onMotion, 
  onFrame, 
  deviceId, 
  onCamerasFound 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

  // Handle stream start/stop and device switching
  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    
    const startWebcam = async () => {
      try {
        // Stop previous tracks if the effect is re-running due to ID change
        if (videoRef.current && videoRef.current.srcObject) {
             const oldStream = videoRef.current.srcObject as MediaStream;
             oldStream.getTracks().forEach(t => t.stop());
        }

        const constraints: MediaStreamConstraints = {
            video: deviceId 
                ? { deviceId: { exact: deviceId }, width: 320, height: 240, frameRate: 30 }
                : { width: 320, height: 240, frameRate: 30 }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Enumerate devices once permission is granted and stream is active
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        if (onCamerasFound) {
            onCamerasFound(videoDevices);
        }

      } catch (err) {
        console.error("Webcam access denied or error", err);
      }
    };

    startWebcam();

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === 4) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Draw video to canvas
          ctx.drawImage(video, 0, 0, 64, 48); // Downscale for performance
          const imageData = ctx.getImageData(0, 0, 64, 48);
          const data = imageData.data;

          // Simple Motion Detection
          let diffScore = 0;
          if (prevFrameRef.current) {
            const prev = prevFrameRef.current;
            for (let i = 0; i < data.length; i += 4) {
               // Compare simplified grayscale or green channel
               const diff = Math.abs(data[i+1] - prev[i+1]); 
               if (diff > 20) diffScore++;
            }
          }
          
          prevFrameRef.current = data; // Store current as prev

          // Normalize score (threshold determined experimentally)
          const pixelCount = 64 * 48;
          const normalizedMotion = Math.min(diffScore / (pixelCount * 0.1), 1);
          
          onMotion(normalizedMotion);
        }
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
         stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [onMotion, deviceId, onCamerasFound]);

  // Expose a method to capture high-quality frame for AI
  useEffect(() => {
      if (!onFrame) return;
      // Interval set to 4000ms to avoid 429 Resource Exhausted errors
      const interval = setInterval(() => {
          if (videoRef.current && canvasRef.current) {
               const canvas = document.createElement('canvas');
               canvas.width = 320;
               canvas.height = 240;
               const ctx = canvas.getContext('2d');
               if (ctx) {
                   ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                   const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                   onFrame(base64);
               }
          }
      }, 4000); 
      return () => clearInterval(interval);
  }, [onFrame]);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-36 md:w-48 aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-black transition-all">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover scale-x-[-1] opacity-90" 
      />
      <canvas ref={canvasRef} className="hidden" width="64" height="48" />
    </div>
  );
};