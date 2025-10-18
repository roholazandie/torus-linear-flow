import React, { useEffect, useRef, useState } from 'react';

const TorusLinearFlow = () => {
  const canvasRef = useRef(null);
  const [p, setP] = useState(3);
  const [q, setQ] = useState(5);
  const [numParticles, setNumParticles] = useState(12);
  const [speed, setSpeed] = useState(3);
  const [isRunning, setIsRunning] = useState(true);
  const animationRef = useRef(null);
  const stateRef = useRef({ t: 0 });
  const cameraRef = useRef({ 
    theta: 0,      // Horizontal angle (azimuth)
    phi: Math.PI / 3,  // Vertical angle (elevation)
    distance: 400,  // Distance from origin
    minDistance: 100,
    maxDistance: 1000
  });
  const mouseRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });

  const CANVAS_SIZE = 600;
  const R = 120; // Major radius
  const r = 50;  // Minor radius

  // Helper function to convert angles to 3D coordinates
  const toXYZ = (theta1, theta2) => {
    const x = (R + r * Math.cos(theta1)) * Math.cos(theta2);
    const y = (R + r * Math.cos(theta1)) * Math.sin(theta2);
    const z = r * Math.sin(theta1);
    return { x, y, z };
  };

  // Project 3D to 2D with camera position
  const project = (x, y, z) => {
    const { theta, phi, distance } = cameraRef.current;
    
    // Camera position in spherical coordinates
    const camX = distance * Math.sin(phi) * Math.cos(theta);
    const camY = distance * Math.sin(phi) * Math.sin(theta);
    const camZ = distance * Math.cos(phi);
    
    // Calculate view direction (from camera to origin)
    const viewX = -camX;
    const viewY = -camY;
    const viewZ = -camZ;
    const viewLength = Math.sqrt(viewX * viewX + viewY * viewY + viewZ * viewZ);
    const viewDirX = viewX / viewLength;
    const viewDirY = viewY / viewLength;
    const viewDirZ = viewZ / viewLength;
    
    // Calculate right vector (cross product of view direction and world up)
    const upX = 0, upY = 0, upZ = 1;
    let rightX = viewDirY * upZ - viewDirZ * upY;
    let rightY = viewDirZ * upX - viewDirX * upZ;
    let rightZ = viewDirX * upY - viewDirY * upX;
    const rightLength = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
    rightX /= rightLength;
    rightY /= rightLength;
    rightZ /= rightLength;
    
    // Calculate up vector (cross product of right and view direction)
    const upVecX = rightY * viewDirZ - rightZ * viewDirY;
    const upVecY = rightZ * viewDirX - rightX * viewDirZ;
    const upVecZ = rightX * viewDirY - rightY * viewDirX;
    
    // Translate point relative to camera
    const relX = x - camX;
    const relY = y - camY;
    const relZ = z - camZ;
    
    // Transform to camera space
    const camSpaceX = relX * rightX + relY * rightY + relZ * rightZ;
    const camSpaceY = relX * upVecX + relY * upVecY + relZ * upVecZ;
    const camSpaceZ = relX * viewDirX + relY * viewDirY + relZ * viewDirZ;
    
    // Perspective projection
    const fov = 600;
    const scale = fov / (fov + camSpaceZ);
    
    return {
      x: camSpaceX * scale + CANVAS_SIZE / 2,
      y: -camSpaceY * scale + CANVAS_SIZE / 2,
      z: camSpaceZ
    };
  };

  // Generate colors for particles
  const getParticleColor = (index, total) => {
    const hue = (index / total) * 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw torus mesh
      const meshRes = 40;
      const torusPoints = [];

      // Generate torus mesh points
      for (let i = 0; i <= meshRes; i++) {
        const u = (i / meshRes) * 2 * Math.PI;
        const row = [];
        for (let j = 0; j <= meshRes; j++) {
          const v = (j / meshRes) * 2 * Math.PI;
          const { x, y, z } = toXYZ(u, v);
          const proj = project(x, y, z);
          row.push(proj);
        }
        torusPoints.push(row);
      }

      // Fill torus with semi-transparent blue
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      for (let i = 0; i < meshRes; i++) {
        for (let j = 0; j < meshRes; j++) {
          ctx.beginPath();
          ctx.moveTo(torusPoints[i][j].x, torusPoints[i][j].y);
          ctx.lineTo(torusPoints[i+1][j].x, torusPoints[i+1][j].y);
          ctx.lineTo(torusPoints[i+1][j+1].x, torusPoints[i+1][j+1].y);
          ctx.lineTo(torusPoints[i][j+1].x, torusPoints[i][j+1].y);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw pink mesh lines
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.lineWidth = 0.5;

      // Longitudinal lines
      for (let i = 0; i < torusPoints.length; i += 4) {
        ctx.beginPath();
        for (let j = 0; j < torusPoints[i].length; j++) {
          const p = torusPoints[i][j];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Meridional lines
      for (let j = 0; j < torusPoints[0].length; j += 4) {
        ctx.beginPath();
        for (let i = 0; i < torusPoints.length; i++) {
          const p = torusPoints[i][j];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Draw particles and their traces
      const ratio = p / q;
      const t = stateRef.current.t;

      for (let i = 0; i < numParticles; i++) {
        // Starting phase distributed evenly
        const startPhase = (i / numParticles) * 2 * Math.PI;
        const color = getParticleColor(i, numParticles);

        // Draw trace
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();

        const tracePoints = 200;
        for (let j = 0; j <= tracePoints; j++) {
          const traceT = (j / tracePoints) * t;
          const theta1 = startPhase + traceT;
          const theta2 = ratio * traceT;
          
          const { x, y, z } = toXYZ(theta1, theta2);
          const proj = project(x, y, z);

          if (j === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        }
        ctx.stroke();

        // Draw particle
        ctx.globalAlpha = 1.0;
        const theta1 = startPhase + t;
        const theta2 = ratio * t;
        const { x, y, z } = toXYZ(theta1, theta2);
        const pos = project(x, y, z);

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
    };

    const animate = () => {
      if (isRunning) {
        stateRef.current.t += speed * 0.01;
      }
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [p, q, numParticles, speed, isRunning]);

  // Mouse/touch handlers - camera orbit control
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e) => {
      e.preventDefault();
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.clientX || e.touches?.[0]?.clientX;
      mouseRef.current.lastY = e.clientY || e.touches?.[0]?.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e) => {
      if (!mouseRef.current.isDragging) return;
      e.preventDefault();

      const clientX = e.clientX || e.touches?.[0]?.clientX;
      const clientY = e.clientY || e.touches?.[0]?.clientY;

      const deltaX = clientX - mouseRef.current.lastX;
      const deltaY = clientY - mouseRef.current.lastY;

      // Update camera angles - horizontal drag rotates around Z axis (theta)
      // vertical drag changes elevation (phi)
      cameraRef.current.theta -= deltaX * 0.01;
      cameraRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRef.current.phi - deltaY * 0.01));

      mouseRef.current.lastX = clientX;
      mouseRef.current.lastY = clientY;
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      mouseRef.current.isDragging = false;
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (e) => {
      e.preventDefault();
      // Enhanced zoom with more range and smoother control
      const zoomSpeed = 1.0; // Adjust sensitivity
      const delta = e.deltaY;
      
      // Zoom in/out with mouse wheel - exponential for smoother feel
      const zoomFactor = 1 + (delta * zoomSpeed * 0.001);
      const newDistance = cameraRef.current.distance * zoomFactor;
      
      cameraRef.current.distance = Math.max(
        cameraRef.current.minDistance, 
        Math.min(cameraRef.current.maxDistance, newDistance)
      );
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
    canvas.addEventListener('touchmove', handleMouseMove, { passive: false });
    canvas.addEventListener('touchend', handleMouseUp, { passive: false });

    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleMouseDown);
      canvas.removeEventListener('touchmove', handleMouseMove);
      canvas.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  const handleReset = () => {
    stateRef.current.t = 0;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Torus Linear Flow</h1>
        <p className="text-slate-400 mb-6">
          Multiple particles following rational closed loops (p/q) on a 3D torus with different starting points
        </p>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full border-2 border-slate-700 rounded-lg"
          />
        </div>

        <div className="bg-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-lg font-semibold mb-4">Rational Ratio (p/q)</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                p (numerator): {p}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={p}
                onChange={(e) => setP(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                q (denominator): {q}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={q}
                onChange={(e) => setQ(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          <div className="text-center text-lg font-mono bg-slate-700 rounded p-3">
            {p}/{q} = {(p/q).toFixed(6)}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-lg font-semibold mb-4">Flow Controls</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Number of Particles: {numParticles}
              </label>
              <input
                type="range"
                min="3"
                max="24"
                value={numParticles}
                onChange={(e) => setNumParticles(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Speed: {speed}x
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition ${
              isRunning
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isRunning ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-3 px-6 rounded-lg font-semibold bg-slate-600 hover:bg-slate-700 transition"
          >
            ↺ Reset
          </button>
        </div>

        <div className="mt-6 bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">About</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Each colored particle follows a closed rational loop on the torus with the same p/q ratio
            but different starting points (evenly distributed using linspace logic). The path wraps around
            the major circle q times and the minor circle p times before closing.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">
            <strong>Controls:</strong> Click and drag to orbit camera • Scroll to zoom (100-1000 units) • Get close to see particle details!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TorusLinearFlow;
