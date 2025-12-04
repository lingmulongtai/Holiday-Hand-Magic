import { Point3D } from '../types';

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper to mix colors
const mixColor = (base: number[], noise: number): [number, number, number] => {
  return [
    Math.min(1, Math.max(0, base[0] + (Math.random() - 0.5) * noise)),
    Math.min(1, Math.max(0, base[1] + (Math.random() - 0.5) * noise)),
    Math.min(1, Math.max(0, base[2] + (Math.random() - 0.5) * noise))
  ];
};

// Generate points for a Cone (Tree) with Ornaments
export const generateTreePoints = (count: number): Point3D[] => {
  const points: Point3D[] = [];
  for (let i = 0; i < count; i++) {
    const height = Math.random() * 3 - 1.5; // -1.5 to 1.5
    const radius = (1.5 - height) * 0.4;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    
    // Base Green
    let color: [number, number, number] = [0.1, 0.6 + Math.random() * 0.2, 0.2];

    // Ornaments (10% chance)
    if (Math.random() < 0.1 && r > radius * 0.8) {
       const ornamentType = Math.random();
       if (ornamentType < 0.33) color = [1, 0.1, 0.1]; // Red
       else if (ornamentType < 0.66) color = [1, 0.8, 0.1]; // Gold
       else color = [0.2, 0.5, 1]; // Blue
    }

    // Star at top
    if (height > 1.4) {
        color = [1, 1, 0.5];
    }

    points.push({
      x: Math.cos(angle) * r,
      y: height,
      z: Math.sin(angle) * r,
      color
    });
  }
  return points;
};

// Generate points for a Sphere (generic helper)
export const generateSpherePoints = (count: number, radius = 1, yOffset = 0, baseColor: [number, number, number] = [1,1,1]): Point3D[] => {
  const points: Point3D[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * radius; 
    
    points.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta) + yOffset,
      z: r * Math.cos(phi),
      color: mixColor(baseColor, 0.1)
    });
  }
  return points;
};

// Generate points for a Cube (Present) with Ribbon and Pattern
export const generatePresentPoints = (count: number): Point3D[] => {
  const points: Point3D[] = [];
  const size = 1.3;
  const half = size / 2;
  
  // Reserve particles for the bow
  const bowCount = Math.floor(count * 0.15);
  const boxCount = count - bowCount;

  for (let i = 0; i < boxCount; i++) {
    const face = Math.floor(Math.random() * 6);
    const u = (Math.random() - 0.5) * size;
    const v = (Math.random() - 0.5) * size;
    let x = 0, y = 0, z = 0;

    // Distribute on surface
    if (face === 0) { x = half; y = u; z = v; }       // Right
    else if (face === 1) { x = -half; y = u; z = v; } // Left
    else if (face === 2) { y = half; x = u; z = v; }  // Top
    else if (face === 3) { y = -half; x = u; z = v; } // Bottom
    else if (face === 4) { z = half; x = u; y = v; }  // Front
    else { z = -half; x = u; y = v; }                 // Back

    // Add slight noise for particle volume feel
    x += (Math.random() - 0.5) * 0.03;
    y += (Math.random() - 0.5) * 0.03;
    z += (Math.random() - 0.5) * 0.03;

    // Base Color: Red
    let color: [number, number, number] = [0.9, 0.1, 0.1];

    // Pattern: White Polka Dots on the paper
    const freq = 6.0;
    // Check sine pattern in 3D space
    if ((Math.sin(x * freq) * Math.sin(y * freq) * Math.sin(z * freq)) > 0.5) {
        color = [1, 1, 1];
    }

    // Ribbon Logic (Gold Cross)
    const ribbonWidth = 0.25;
    let isRibbon = false;

    // Ribbon wraps the box in two loops (Vertical and Horizontal center)
    // Loop 1: Parallel to Y-axis (wraps Front, Back, Top, Bottom) -> X is near 0
    // Loop 2: Parallel to X-axis (wraps Left, Right, Top, Bottom) -> Z is near 0
    
    if (Math.abs(x) < ribbonWidth && (face !== 0 && face !== 1)) isRibbon = true; 
    if (Math.abs(z) < ribbonWidth && (face !== 4 && face !== 5)) isRibbon = true;

    if (isRibbon) {
        color = [1, 0.84, 0]; // Gold
    }

    points.push({ x, y, z, color });
  }

  // Generate Bow on Top
  for (let i = 0; i < bowCount; i++) {
      // Create a flower/bow shape using parametric curves
      const t = Math.random() * Math.PI * 2;
      const t2 = Math.random() * Math.PI;
      
      // 4-petal flower shape for bow loops
      const r = Math.sin(2 * t) * 0.5 * Math.sin(t2); 
      
      const bx = Math.cos(t) * r;
      const bz = Math.sin(t) * r;
      const by = half + 0.05 + Math.abs(r) * 0.5 + Math.random()*0.1; // Lift up

      points.push({
          x: bx, 
          y: by, 
          z: bz, 
          color: [1, 0.9, 0.2] // Bright Gold
      });
  }

  return points;
};

// Generate points for a Star
export const generateStarPoints = (count: number): Point3D[] => {
  const points: Point3D[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI;
    const r = 1 + 0.6 * Math.sin(5 * u) * Math.sin(5 * v);
    
    const rad = r * 0.8;
    const isTip = r > 1.3;
    const color: [number, number, number] = isTip ? [1, 0.8, 0] : [1, 1, 0.8];

    points.push({
      x: rad * Math.sin(v) * Math.cos(u),
      y: rad * Math.sin(v) * Math.sin(u),
      z: rad * Math.cos(v) * 0.4,
      color
    });
  }
  return points;
};

// Generate Detailed Snowman
export const generateSnowmanPoints = (count: number): Point3D[] => {
  const points: Point3D[] = [];
  
  // Allocate particles
  const bodyCount = Math.floor(count * 0.65);
  const detailsCount = count - bodyCount;

  // 1. Body (3 Snowballs)
  const spheres = [
      { y: -1.2, r: 0.95 },  // Base
      { y: 0.2, r: 0.7 },    // Torso
      { y: 1.3, r: 0.5 }     // Head
  ];
  
  for(let i=0; i < bodyCount; i++) {
      const idx = Math.random() < 0.4 ? 0 : (Math.random() < 0.75 ? 1 : 2);
      const { y: cy, r: radius } = spheres[idx];
      
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI;
      const r = radius * Math.cbrt(Math.random()); 
      
      points.push({
          x: r * Math.sin(v) * Math.cos(u),
          y: r * Math.sin(v) * Math.sin(u) + cy,
          z: r * Math.cos(v),
          color: [0.95, 0.98, 1] // Snow white
      });
  }

  // 2. Details (Hat, Arms, Face)
  const features: {x:number, y:number, z:number, c:[number,number,number]}[] = [];

  // Bucket Hat (Cylinder on head)
  const hatBaseY = 1.65;
  const hatHeight = 0.5;
  const hatRadius = 0.35;
  
  // Add many points for Hat
  for (let j = 0; j < detailsCount * 0.4; j++) {
      const angle = Math.random() * Math.PI * 2;
      const h = Math.random() * hatHeight;
      const r = Math.sqrt(Math.random()) * hatRadius;
      
      features.push({
          x: Math.cos(angle) * r,
          y: hatBaseY + h,
          z: Math.sin(angle) * r,
          c: [0.4, 0.4, 0.45] // Grey bucket
      });
  }
  
  // Eyes (Coal)
  [-0.15, 0.15].forEach(ex => {
      features.push({ x: ex, y: 1.45, z: 0.42, c: [0.1, 0.1, 0.1] });
      // extra density
      for(let k=0; k<5; k++) features.push({ x: ex+(Math.random()-0.5)*0.05, y: 1.45+(Math.random()-0.5)*0.05, z: 0.42, c: [0.1, 0.1, 0.1] });
  });

  // Nose (Carrot Cone)
  for (let k = 0; k < 40; k++) {
      const t = k / 40; // 0 to 1
      const r = (1 - t) * 0.08;
      const angle = Math.random() * Math.PI * 2;
      features.push({
          x: Math.cos(angle) * r,
          y: 1.35,
          z: 0.45 + t * 0.4, // Stick out
          c: [1, 0.5, 0] // Orange
      });
  }

  // Mouth (Coal Dots)
  for (let k = 0; k < 5; k++) {
      const angle = Math.PI + (k / 4) * Math.PI; // Smile arc
      const mx = Math.cos(angle) * 0.15; 
      const my = 1.25 + Math.sin(angle) * 0.05;
      features.push({ x: mx, y: my, z: 0.45, c: [0.1, 0.1, 0.1] });
      // Density
      for(let d=0; d<4; d++) features.push({ x: mx+(Math.random()-0.5)*0.02, y: my+(Math.random()-0.5)*0.02, z: 0.45, c: [0.1, 0.1, 0.1] });
  }

  // Arms (Wood Stick)
  // Left (-X)
  for (let k = 0; k < 60; k++) {
      const t = k / 60;
      features.push({
          x: -0.6 - t * 0.6 + (Math.random()-0.5)*0.05,
          y: 0.4 + t * 0.4,
          z: (Math.random()-0.5)*0.05,
          c: [0.55, 0.35, 0.15] // Brown
      });
      // Right (+X)
      features.push({
          x: 0.6 + t * 0.6 + (Math.random()-0.5)*0.05,
          y: 0.4 + t * 0.4,
          z: (Math.random()-0.5)*0.05,
          c: [0.55, 0.35, 0.15]
      });
  }
  
  // Buttons
  [0.3, 0.0, -0.3].forEach(by => {
      for(let d=0; d<10; d++) {
        features.push({
            x: (Math.random()-0.5)*0.05, 
            y: by + 0.2, // Offset to torso
            z: 0.7, 
            c: [0.1,0.1,0.1]
        });
      }
  });

  // Distribute features into points array
  // Fill the remaining quota by cycling through defined feature points
  const remainingCount = detailsCount; 
  for (let i = 0; i < remainingCount; i++) {
      const f = features[i % features.length];
      if (f) {
        points.push({
            x: f.x + (Math.random() - 0.5) * 0.02,
            y: f.y + (Math.random() - 0.5) * 0.02,
            z: f.z + (Math.random() - 0.5) * 0.02,
            color: f.c
        });
      }
  }

  return points;
};

// Generate Candy Cane
export const generateCandyCanePoints = (count: number): Point3D[] => {
    const points: Point3D[] = [];
    for (let i = 0; i < count; i++) {
        const t = Math.random(); 
        const theta = Math.random() * Math.PI * 2;
        const radius = 0.25;

        let x, y, z;
        let isStripe = false;

        if (t < 0.7) {
            // Straight part
            y = (t / 0.7) * 2.5 - 1.5; // -1.5 to 1.0
            x = Math.cos(theta) * radius;
            z = Math.sin(theta) * radius;
            isStripe = Math.sin(y * 10 + Math.atan2(z, x)) > 0;
        } else {
            // Curved part
            const curveT = (t - 0.7) / 0.3; // 0 to 1
            const curveAngle = curveT * Math.PI;
            const hookRadius = 0.5;
            
            const cx = -0.5;
            const cy = 1.0;
            const tubeX = Math.cos(theta) * radius;
            const tubeZ = Math.sin(theta) * radius;

            x = cx + (hookRadius + tubeX) * Math.cos(curveAngle);
            y = cy + (hookRadius + tubeX) * Math.sin(curveAngle);
            z = tubeZ;
            
            isStripe = Math.sin(curveAngle * 10 + Math.atan2(z, tubeX)) > 0;
        }

        points.push({
            x, y, z,
            color: isStripe ? [1, 0.1, 0.1] : [1, 1, 1]
        });
    }
    return points;
}

// Generate Wreath
export const generateWreathPoints = (count: number): Point3D[] => {
    const points: Point3D[] = [];
    const R = 1.2; 
    const r = 0.4; 

    for (let i = 0; i < count; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const r_fluff = r + (Math.random() - 0.5) * 0.2;

        const x = (R + r_fluff * Math.cos(v)) * Math.cos(u);
        const y = (R + r_fluff * Math.cos(v)) * Math.sin(u);
        const z = r_fluff * Math.sin(v);

        let color: [number, number, number] = [0.1, 0.5 + Math.random() * 0.3, 0.1]; 
        if (Math.random() < 0.05) {
            color = [1, 0.1, 0.1];
        }

        points.push({ x, y, z, color });
    }
    return points;
}

// Generate Santa Hat
export const generateSantaHatPoints = (count: number): Point3D[] => {
    const points: Point3D[] = [];
    for (let i = 0; i < count; i++) {
        const h = Math.random() * 2; 
        const angle = Math.random() * Math.PI * 2;
        
        let x, y, z;
        let color: [number, number, number] = [0.9, 0.1, 0.1]; 

        if (h < 0.3) {
            const r = 1.0 + (Math.random() - 0.5) * 0.2;
            x = Math.cos(angle) * r;
            z = Math.sin(angle) * r;
            y = h - 1.0; 
            color = [1, 1, 1];
        } else if (h > 1.8) {
            const tipX = 0.5; 
            y = 0.8 + (Math.random()-0.5)*0.3;
            x = 0.6 + (Math.random()-0.5)*0.3;
            z = (Math.random()-0.5)*0.3;
            color = [1, 1, 1];
        } else {
            const bend = Math.pow((h - 0.3) / 1.5, 2) * 0.5;
            const r = (1.0 - (h-0.3)/1.7) * 0.9;
            x = Math.cos(angle) * r + bend;
            z = Math.sin(angle) * r;
            y = h - 1.0;
        }
        points.push({x, y, z, color});
    }
    return points;
}