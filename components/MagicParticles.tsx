import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Point3D, AppMode } from '../types';

interface MagicParticlesProps {
  mode: AppMode;
  targetPoints: Point3D[];
  count: number;
  color?: string;
  motionIntensity: number; // 0 to 1, derived from webcam
}

export const MagicParticles: React.FC<MagicParticlesProps> = ({ 
  mode, 
  targetPoints, 
  count, 
  color = "#ffdd00",
  motionIntensity 
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Initialize particles with random positions
  const { positions, velocities, targetPositions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const targetPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const c = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      // Start in a loose sphere
      const r = Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      
      // Velocities
      velocities[i*3] = 0;
      velocities[i*3+1] = 0;
      velocities[i*3+2] = 0;
    }

    return { positions, velocities, targetPositions, colors };
  }, [count]); 

  // Update target positions and colors when the shape changes
  useEffect(() => {
    const defaultColor = new THREE.Color(color);
    
    for (let i = 0; i < count; i++) {
        let tx = 0, ty = 0, tz = 0;
        let r = defaultColor.r, g = defaultColor.g, b = defaultColor.b;

        if (targetPoints.length > 0) {
            // Wrap around if fewer points than particles
            const p = targetPoints[i % targetPoints.length];
            tx = p.x;
            ty = p.y;
            tz = p.z;
            
            if (p.color) {
                r = p.color[0];
                g = p.color[1];
                b = p.color[2];
            }
        }

        targetPositions[i * 3] = tx;
        targetPositions[i * 3 + 1] = ty;
        targetPositions[i * 3 + 2] = tz;

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
    }

    if (pointsRef.current?.geometry.attributes.color) {
        pointsRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [targetPoints, color, count, colors, targetPositions]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    
    // Physics constants
    const time = state.clock.elapsedTime;
    
    // Determine effective mode
    // If motionIntensity is high, trigger SCATTER behavior
    const isScatter = mode === AppMode.SCATTER || motionIntensity > 0.25;

    // Simulation Step
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];
      const z = positions[idx + 2];

      if (isScatter) {
        // --- VORTEX SCATTER PHYSICS ---
        
        // 1. Calculate cylindrical coordinates
        const distXZ = Math.sqrt(x*x + z*z);
        const angle = Math.atan2(z, x);

        // 2. Swirl Force (Tangential)
        // Rotate around Y axis. 
        // Direction is (-z, x)
        const swirlSpeed = 5.0; // How fast it spins
        const tanX = -Math.sin(angle);
        const tanZ = Math.cos(angle);
        
        velocities[idx] += tanX * swirlSpeed * delta;
        velocities[idx + 2] += tanZ * swirlSpeed * delta;

        // 3. Expansion Force (Radial)
        // Target radius expands based on noise or simply keeps them in a ring
        // "Open hand expands" -> we push them out to a larger radius
        const targetRadius = 3.5 + Math.sin(time * 2 + y) * 0.5;
        const radialForce = (targetRadius - distXZ) * 2.0; 
        
        velocities[idx] += Math.cos(angle) * radialForce * delta;
        velocities[idx + 2] += Math.sin(angle) * radialForce * delta;

        // 4. Vertical Float
        // Sine wave motion for height
        const targetY = Math.sin(time * 1.5 + distXZ) * 1.5;
        velocities[idx + 1] += (targetY - y) * 1.0 * delta;

        // 5. Drag/Damping
        velocities[idx] *= 0.92;
        velocities[idx + 1] *= 0.92;
        velocities[idx + 2] *= 0.92;

        // Apply
        positions[idx] += velocities[idx];
        positions[idx + 1] += velocities[idx + 1];
        positions[idx + 2] += velocities[idx + 2];

      } else {
        // --- FORM SHAPE PHYSICS ---
        
        const tx = targetPositions[idx];
        const ty = targetPositions[idx + 1];
        const tz = targetPositions[idx + 2];

        // Attraction Force to Target
        // Using a spring-like force
        const k = 4.0; // Spring stiffness
        
        // Add some noise to the target so it's not perfectly static (shimmer effect)
        const noiseAmp = 0.02;
        const nx = Math.sin(time * 3 + y) * noiseAmp;
        const ny = Math.cos(time * 2 + z) * noiseAmp;
        const nz = Math.sin(time * 4 + x) * noiseAmp;

        velocities[idx] += ((tx + nx) - x) * k * delta;
        velocities[idx + 1] += ((ty + ny) - y) * k * delta;
        velocities[idx + 2] += ((tz + nz) - z) * k * delta;
        
        // Damping (critical for stability)
        velocities[idx] *= 0.85;
        velocities[idx + 1] *= 0.85;
        velocities[idx + 2] *= 0.85;

        // Apply
        positions[idx] += velocities[idx];
        positions[idx + 1] += velocities[idx + 1];
        positions[idx + 2] += velocities[idx + 2];
      }
    }

    posAttr.needsUpdate = true;
    
    // Slow global rotation of the container for cinematic feel
    if (!isScatter) {
       pointsRef.current.rotation.y += 0.1 * delta;
    } else {
       // Spin faster when scattering
       pointsRef.current.rotation.y += 0.5 * delta;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      {/* Small, bright particles */}
      <pointsMaterial
        size={0.03} 
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};