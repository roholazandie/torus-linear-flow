// Global state variables
let canvas, ctx;
let p = 3, q = 5, numParticles = 12, speed = 3;
let isRunning = true;
let animationId = null;
let t = 0;

// Camera state
let camera = {
    theta: 0,      // Horizontal angle (azimuth)
    phi: Math.PI / 3,  // Vertical angle (elevation)
    distance: 400,  // Distance from origin
    minDistance: 50,
    maxDistance: 1200
};

// Mouse state
let mouse = {
    isDragging: false,
    lastX: 0,
    lastY: 0
};

// Constants
const CANVAS_SIZE = 600;
const R = 120; // Major radius
const r = 50;  // Minor radius

// Helper function to convert angles to 3D coordinates
function toXYZ(theta1, theta2) {
    const x = (R + r * Math.cos(theta1)) * Math.cos(theta2);
    const y = (R + r * Math.cos(theta1)) * Math.sin(theta2);
    const z = r * Math.sin(theta1);
    return { x, y, z };
}

// Project 3D to 2D with camera position
function project(x, y, z) {
    const { theta, phi, distance } = camera;
    
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
}

// Generate colors for particles
function getParticleColor(index, total) {
    const hue = (index / total) * 360;
    return `hsl(${hue}, 70%, 60%)`;
}

// Draw enhanced torus mesh
function drawTorusMesh() {
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
}

// Main draw function
function draw() {
    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw torus mesh
    drawTorusMesh();

    // Draw particles and their trails
    const ratio = p / q;
    const currentT = t * speed * 0.01;
    
    for (let i = 0; i < numParticles; i++) {
        // Starting phase distributed evenly
        const startPhase = (i / numParticles) * 2 * Math.PI;
        const color = getParticleColor(i, numParticles);

        // Draw trail
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();

        const tracePoints = 200;
        for (let j = 0; j <= tracePoints; j++) {
            const traceT = (j / tracePoints) * currentT;
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
        const theta1 = startPhase + currentT;
        const theta2 = ratio * currentT;
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
}

// Animation loop
function animate() {
    if (isRunning) {
        t += 1;
    }
    draw();
    animationId = requestAnimationFrame(animate);
}

// Mouse event handlers
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function handleMouseDown(e) {
    const pos = getMousePos(e);
    mouse.isDragging = true;
    mouse.lastX = pos.x;
    mouse.lastY = pos.y;
}

function handleMouseMove(e) {
    if (!mouse.isDragging) return;
    
    const pos = getMousePos(e);
    const deltaX = pos.x - mouse.lastX;
    const deltaY = pos.y - mouse.lastY;
    
    camera.theta += deltaX * 0.01;
    camera.phi = Math.max(0.1, Math.min(Math.PI - 0.1, camera.phi + deltaY * 0.01));
    
    mouse.lastX = pos.x;
    mouse.lastY = pos.y;
}

function handleMouseUp() {
    mouse.isDragging = false;
}

function handleWheel(e) {
    e.preventDefault();
    // Enhanced zoom with more range and smoother control
    const zoomSpeed = 1.0; // Adjust sensitivity
    const delta = e.deltaY;
    
    // Zoom in/out with mouse wheel - exponential for smoother feel
    const zoomFactor = 1 + (delta * zoomSpeed * 0.001);
    const newDistance = camera.distance * zoomFactor;
    
    camera.distance = Math.max(
        camera.minDistance, 
        Math.min(camera.maxDistance, newDistance)
    );
}

// Touch event handlers
function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const pos = getMousePos(touch);
        mouse.isDragging = true;
        mouse.lastX = pos.x;
        mouse.lastY = pos.y;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && mouse.isDragging) {
        const touch = e.touches[0];
        const pos = getMousePos(touch);
        const deltaX = pos.x - mouse.lastX;
        const deltaY = pos.y - mouse.lastY;
        
        camera.theta += deltaX * 0.01;
        camera.phi = Math.max(0.1, Math.min(Math.PI - 0.1, camera.phi + deltaY * 0.01));
        
        mouse.lastX = pos.x;
        mouse.lastY = pos.y;
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    mouse.isDragging = false;
}

// Update UI elements
function updateUI() {
    document.getElementById('pValue').textContent = p;
    document.getElementById('qValue').textContent = q;
    document.getElementById('particlesValue').textContent = numParticles;
    document.getElementById('speedValue').textContent = speed;
    document.getElementById('ratioDisplay').textContent = `${p}/${q} = ${(p/q).toFixed(6)}`;
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.textContent = isRunning ? '⏸ Pause' : '▶ Play';
    playPauseBtn.className = isRunning ? 'btn btn-orange' : 'btn btn-green';
}

// Snapshot functionality
function handleSnapshot() {
    if (!canvas) return;

    // Create a high-quality snapshot
    const tempCanvas = document.createElement('canvas');
    const scale = 2; // 2x resolution for higher quality
    tempCanvas.width = CANVAS_SIZE * scale;
    tempCanvas.height = CANVAS_SIZE * scale;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Scale up for higher quality
    tempCtx.scale(scale, scale);
    
    // Draw the current canvas content
    tempCtx.drawImage(canvas, 0, 0);
    
    // Convert to high-quality PNG
    tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `torus-flow-${p}-${q}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png', 1.0); // Maximum quality PNG
}

// Initialize the application
function init() {
    canvas = document.getElementById('torusCanvas');
    ctx = canvas.getContext('2d');
    
    // Set up event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Control event listeners
    document.getElementById('pSlider').addEventListener('input', (e) => {
        p = parseInt(e.target.value);
        updateUI();
    });
    
    document.getElementById('qSlider').addEventListener('input', (e) => {
        q = parseInt(e.target.value);
        updateUI();
    });
    
    document.getElementById('particlesSlider').addEventListener('input', (e) => {
        numParticles = parseInt(e.target.value);
        updateUI();
    });
    
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        speed = parseInt(e.target.value);
        updateUI();
    });
    
    document.getElementById('playPauseBtn').addEventListener('click', () => {
        isRunning = !isRunning;
        updateUI();
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        t = 0;
    });
    
    document.getElementById('snapshotBtn').addEventListener('click', handleSnapshot);
    
    // Initialize UI
    updateUI();
    
    // Start animation
    animate();
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', init);