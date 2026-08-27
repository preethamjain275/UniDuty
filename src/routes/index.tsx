// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CalendarClock,
  ShieldCheck,
  Sparkles,
  Trophy,
  RefreshCw,
  AlertTriangle,
  Zap,
  Play,
  Keyboard,
  MousePointerClick,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sapthagiri NPS University — Exam Invigilation Management System" },
      {
        name: "description",
        content:
          "Official Sapthagiri NPS University Examination Cell Portal with an interactive 3D invigilation simulator, duty allocation, seating charts, and emergency complaint desk.",
      },
      { property: "og:title", content: "Sapthagiri NPS University — Exam Invigilation System" },
      {
        property: "og:description",
        content: "Institutional examination management, seating charts, and faculty duty allocation with 3D simulator.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "One-click allocation",
    body: "Assign every hall in seconds with rotating room duty and gap compliance checks.",
  },
  {
    icon: Building2,
    title: "Official A, B & Tenancy Forms",
    body: "Institutional printable forms for floorwise faculty duties, room student attendance, and August 2026 tenancy.",
  },
  {
    icon: ShieldCheck,
    title: "Master Seating Chart",
    body: "Complete room-wise student roll number (SRN) seating allocation matching institutional PDF charts.",
  },
  {
    icon: CalendarClock,
    title: "Emergency Complaint Desk",
    body: "Real-time classroom issue messaging and complaint resolution directly connected to Admin Control Desk.",
  },
];

// Mock Incidents array to feed the simulator
const INCIDENT_TYPES = [
  { text: "Extra sheet requested", color: "#eab308" },
  { text: "Question paper clarification", color: "#3b82f6" },
  { text: "Calculator malfunction", color: "#a855f7" },
  { text: "Medical emergency request", color: "#ef4444" },
  { text: "Student identity verification", color: "#10b981" },
];

function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game states
  const [score, setScore] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [gameStatus, setGameStatus] = useState("idle"); // idle, playing, completed
  const [isGridMode, setIsGridMode] = useState(true);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [controlsHint, setControlsHint] = useState("Use WASD/Arrows to pilot the drone, Space to resolve alerts.");

  // Refs for tracking interactive positions and engine variables to avoid closures inside game loop
  const gameStateRef = useRef({
    player: { x: 0, y: 0, z: 25 },
    targetPlayer: { x: 0, y: 0, z: 25 },
    camera: { pitch: 0.55, yaw: 0.6, zoom: 1 },
    targetCamera: { pitch: 0.55, yaw: 0.6 },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    desks: [] as any[],
    incidents: [] as any[],
    particles: [] as any[],
    score: 0,
    resolvedCount: 0,
    width: 600,
    height: 400,
    shake: 0,
    isGridMode: true
  });

  // Spawn random alerts
  const spawnIncident = () => {
    const state = gameStateRef.current;
    if (state.incidents.filter(inc => !inc.resolved).length >= 4) {
      toast.info("Active incident limit reached. Resolve some first!");
      return;
    }

    // Find a desk without an active incident
    const availableDesks = state.desks.filter(
      desk => !state.incidents.some(inc => !inc.resolved && inc.deskIndex === desk.index)
    );

    if (availableDesks.length === 0) return;

    const randomDesk = availableDesks[Math.floor(Math.random() * availableDesks.length)];
    const type = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];

    const newIncident = {
      id: Date.now() + Math.random(),
      deskIndex: randomDesk.index,
      x: randomDesk.x,
      y: randomDesk.y,
      z: 5,
      label: type.text,
      color: type.color,
      resolved: false,
      pulse: 0,
    };

    state.incidents.push(newIncident);
    setActiveAlerts([...state.incidents.filter(inc => !inc.resolved)]);
    toast.warning(`Incident Reported: "${type.text}" at Desk ${randomDesk.index + 1}`, {
      duration: 3000,
    });
    
    // Add warning particles
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x: randomDesk.x,
        y: randomDesk.y,
        z: 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        vz: Math.random() * 2 + 1,
        color: type.color,
        size: Math.random() * 3 + 2,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.02
      });
    }
  };

  // Pilot drone to specific alert location (teleport/pathfind style)
  const pilotToAlert = (alert: any) => {
    const state = gameStateRef.current;
    state.targetPlayer.x = alert.x;
    state.targetPlayer.y = alert.y + 15; // float slightly behind/next to the desk
    state.targetPlayer.z = 25;
    toast.info(`Autopilot routing to Desk ${alert.deskIndex + 1}...`);
  };

  // Action: Resolve Alert
  const handleResolveAlert = () => {
    const state = gameStateRef.current;
    
    // Find alerts within interaction radius
    const radius = 35;
    const unresolvedAlerts = state.incidents.filter(inc => !inc.resolved);
    
    let resolvedAny = false;

    unresolvedAlerts.forEach(alert => {
      const dx = state.player.x - alert.x;
      const dy = state.player.y - alert.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        alert.resolved = true;
        resolvedAny = true;
        
        // Increase points
        state.score += 150;
        state.resolvedCount += 1;
        setScore(state.score);
        setResolvedCount(state.resolvedCount);
        
        // Sparkle explosion particles
        for (let i = 0; i < 20; i++) {
          state.particles.push({
            x: alert.x,
            y: alert.y,
            z: 10,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            vz: (Math.random() - 0.3) * 4,
            color: "#10b981", // green success
            size: Math.random() * 4 + 3,
            life: 1.0,
            decay: Math.random() * 0.03 + 0.01
          });
        }

        // Floating dynamic score indicator
        state.particles.push({
          x: alert.x,
          y: alert.y,
          z: 20,
          vx: 0,
          vy: 0,
          vz: 1.5,
          color: "#10b981",
          size: 14, // treated as text size in renderer
          life: 1.0,
          decay: 0.02,
          isText: true,
          text: "+150 XP SECURED"
        });

        state.shake = 8;
        toast.success(`Success: Resolved Desk ${alert.deskIndex + 1} Incident!`);
      }
    });

    if (resolvedAny) {
      setActiveAlerts([...state.incidents.filter(inc => !inc.resolved)]);
    } else {
      toast.error("No active alerts within drone reach! Move closer to glowing desks.");
    }
  };

  // Initialize Game Environment
  useEffect(() => {
    const state = gameStateRef.current;
    
    // Generate desk grid
    const cols = 5;
    const rows = 4;
    const spacingX = 50;
    const spacingY = 60;
    const desksArray = [];
    
    let index = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        desksArray.push({
          index: index++,
          x: (c - (cols - 1) / 2) * spacingX,
          y: (r - (rows - 1) / 2) * spacingY,
          z: 0,
          // random student names
          student: `Student SRN${1020 + index}`,
          active: Math.random() > 0.15 // some empty desks
        });
      }
    }
    state.desks = desksArray;

    // Start with 2 initial mock alerts
    const timer = setTimeout(() => {
      spawnIncident();
      setTimeout(spawnIncident, 2500);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Update logic and render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const state = gameStateRef.current;

    // Key handlers
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(e.code)) {
        e.preventDefault(); // prevent scroll
      }
      keys[e.code] = true;
      keys[e.key.toLowerCase()] = true;
      
      if (e.code === "Space") {
        handleResolveAlert();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Mouse orbital rotation handler
    const handleMouseDown = (e: MouseEvent) => {
      state.mouse.isDown = true;
      state.mouse.lastX = e.clientX;
      state.mouse.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!state.mouse.isDown) return;
      const dx = e.clientX - state.mouse.lastX;
      const dy = e.clientY - state.mouse.lastY;
      
      state.targetCamera.yaw += dx * 0.007;
      state.targetCamera.pitch = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, state.targetCamera.pitch + dy * 0.007));
      
      state.mouse.lastX = e.clientX;
      state.mouse.lastY = e.clientY;
    };

    const handleMouseUp = () => {
      state.mouse.isDown = false;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Touch support for mobile dragging
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        state.mouse.isDown = true;
        state.mouse.lastX = e.touches[0].clientX;
        state.mouse.lastY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!state.mouse.isDown || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - state.mouse.lastX;
      const dy = e.touches[0].clientY - state.mouse.lastY;
      
      state.targetCamera.yaw += dx * 0.01;
      state.targetCamera.pitch = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, state.targetCamera.pitch + dy * 0.01));
      
      state.mouse.lastX = e.touches[0].clientX;
      state.mouse.lastY = e.touches[0].clientY;
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    canvas.addEventListener("touchend", handleMouseUp);

    // Game loop
    let tick = 0;
    const run = () => {
      tick++;
      
      // Update canvas measurements
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();
        const targetWidth = Math.floor(rect.width);
        const targetHeight = Math.max(340, Math.floor(rect.height));

        if (canvas.width !== targetWidth * dpr || canvas.height !== targetHeight * dpr) {
          canvas.width = targetWidth * dpr;
          canvas.height = targetHeight * dpr;
          canvas.style.width = `${targetWidth}px`;
          canvas.style.height = `${targetHeight}px`;
          ctx.scale(dpr, dpr);
          state.width = targetWidth;
          state.height = targetHeight;
        }
      }

      // 1. Physics & Movement updates
      let moveSpeed = 3.5;
      let moveX = 0;
      let moveY = 0;

      if (keys["KeyW"] || keys["ArrowUp"]) moveY -= 1;
      if (keys["KeyS"] || keys["ArrowDown"]) moveY += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) moveX -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) moveX += 1;

      // Normalize speed
      if (moveX !== 0 && moveY !== 0) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= len;
        moveY /= len;
      }

      // Drone movement logic
      state.targetPlayer.x += moveX * moveSpeed;
      state.targetPlayer.y += moveY * moveSpeed;

      // Constrain player within grid bounds
      const boundX = 140;
      const boundY = 130;
      state.targetPlayer.x = Math.max(-boundX, Math.min(boundX, state.targetPlayer.x));
      state.targetPlayer.y = Math.max(-boundY, Math.min(boundY, state.targetPlayer.y));

      // Lerp player coordinates
      state.player.x += (state.targetPlayer.x - state.player.x) * 0.18;
      state.player.y += (state.targetPlayer.y - state.player.y) * 0.18;
      state.player.z = 25 + Math.sin(tick * 0.08) * 3; // Float up and down

      // Lerp Camera angles
      state.camera.yaw += (state.targetCamera.yaw - state.camera.yaw) * 0.1;
      state.camera.pitch += (state.targetCamera.pitch - state.camera.pitch) * 0.1;
      state.camera.zoom = cameraZoom;

      // Spawn ambient particles
      if (Math.random() < 0.15 && state.particles.length < 150) {
        state.particles.push({
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 350,
          z: Math.random() * 20 - 10,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          vz: Math.random() * 0.4 + 0.2,
          color: Math.random() > 0.5 ? "rgba(104, 117, 245, 0.4)" : "rgba(224, 150, 62, 0.3)",
          size: Math.random() * 2.2 + 0.8,
          life: 1.0,
          decay: Math.random() * 0.015 + 0.005
        });
      }

      // Update active particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.life -= p.decay;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }

      // 2. Rendering the 3D Projection
      const w = state.width;
      const h = state.height;
      ctx.clearRect(0, 0, w, h);

      // Deep radial sci-fi workspace gradient background
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
      bgGrad.addColorStop(0, "#0c0d1b");
      bgGrad.addColorStop(0.5, "#07080f");
      bgGrad.addColorStop(1, "#020306");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Screen shaking camera feature
      ctx.save();
      if (state.shake > 0.1) {
        const sx = (Math.random() - 0.5) * state.shake;
        const sy = (Math.random() - 0.5) * state.shake;
        ctx.translate(sx, sy);
        state.shake *= 0.85; // damp shake
      }

      // 3D projection mathematical transformation helper
      const project = (x: number, y: number, z: number) => {
        // Rotate around Z axis (yaw)
        const rx = x * Math.cos(state.camera.yaw) - y * Math.sin(state.camera.yaw);
        const ry = x * Math.sin(state.camera.yaw) + y * Math.cos(state.camera.yaw);

        // Rotate around X axis (pitch)
        const rz = ry * Math.sin(state.camera.pitch) + z * Math.cos(state.camera.pitch);
        const depthY = ry * Math.cos(state.camera.pitch) - z * Math.sin(state.camera.pitch);

        // Standard perspective division
        const dist = 320;
        const scale = (dist / (dist + depthY + 280)) * state.camera.zoom;
        const px = w / 2 + rx * scale;
        const py = h / 2.1 + rz * scale;

        return { x: px, y: py, scale, zDepth: depthY };
      };

      // Gather render items to sort them by depth (Z-buffer style depth sorting)
      const renderQueue: any[] = [];

      // Grid Floor drawing lines
      if (state.isGridMode) {
        const gridSize = 140;
        const step = 20;
        
        // Draw grid axis lines
        for (let x = -gridSize; x <= gridSize; x += step) {
          renderQueue.push({
            type: "line",
            depth: (project(x, -gridSize, 0).zDepth + project(x, gridSize, 0).zDepth) / 2,
            draw: () => {
              const p1 = project(x, -gridSize, 0);
              const p2 = project(x, gridSize, 0);
              ctx.strokeStyle = x === 0 ? "rgba(104, 117, 245, 0.45)" : "rgba(104, 117, 245, 0.1)";
              ctx.lineWidth = x === 0 ? 1.8 : 0.8;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          });
        }
        for (let y = -gridSize; y <= gridSize; y += step) {
          renderQueue.push({
            type: "line",
            depth: (project(-gridSize, y, 0).zDepth + project(gridSize, y, 0).zDepth) / 2,
            draw: () => {
              const p1 = project(-gridSize, y, 0);
              const p2 = project(gridSize, y, 0);
              ctx.strokeStyle = y === 0 ? "rgba(104, 117, 245, 0.45)" : "rgba(104, 117, 245, 0.1)";
              ctx.lineWidth = y === 0 ? 1.8 : 0.8;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          });
        }
      }

      // Render Desks
      state.desks.forEach((desk) => {
        const p = project(desk.x, desk.y, desk.z);
        
        // Check if desk has active unresolved alert
        const activeAlert = state.incidents.find(inc => !inc.resolved && inc.deskIndex === desk.index);
        
        renderQueue.push({
          type: "desk",
          depth: p.zDepth,
          draw: () => {
            // Project 3D Box vertices
            const w = 15;
            const d = 10;
            const h = 10;
            const v0 = project(desk.x - w, desk.y - d, 0);
            const v1 = project(desk.x + w, desk.y - d, 0);
            const v2 = project(desk.x + w, desk.y + d, 0);
            const v3 = project(desk.x - w, desk.y + d, 0);
            
            const v4 = project(desk.x - w, desk.y - d, h);
            const v5 = project(desk.x + w, desk.y - d, h);
            const v6 = project(desk.x + w, desk.y + d, h);
            const v7 = project(desk.x - w, desk.y + d, h);

            // Set dynamic lighting based on alerts
            let deskColor = "rgba(104, 117, 245, 0.15)";
            let deskBorder = "rgba(104, 117, 245, 0.5)";
            
            if (activeAlert) {
              const glowPulse = Math.sin(tick * 0.15) * 0.5 + 0.5;
              deskColor = `rgba(239, 68, 68, ${0.1 + glowPulse * 0.2})`;
              deskBorder = `rgba(239, 68, 68, ${0.7 + glowPulse * 0.3})`;

              // Draw emergency floating ring/icon
              const floatY = project(desk.x, desk.y, h + 15 + Math.sin(tick * 0.1) * 2);
              ctx.beginPath();
              ctx.ellipse(floatY.x, floatY.y, 10 * floatY.scale, 5 * floatY.scale, 0, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
              ctx.fill();
              ctx.strokeStyle = activeAlert.color;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Draw alert warning sign (!)
              ctx.fillStyle = activeAlert.color;
              ctx.font = `bold ${Math.floor(10 * floatY.scale)}px sans-serif`;
              ctx.textAlign = "center";
              ctx.fillText("⚠️", floatY.x, floatY.y + 4);
              
              // Draw alert type label above warning sign
              ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
              ctx.font = `${Math.floor(8 * floatY.scale)}px "Space Grotesk"`;
              ctx.fillText(activeAlert.label, floatY.x, floatY.y - 12);
            }

            // Draw Desk Bottom Outline
            ctx.beginPath();
            ctx.moveTo(v0.x, v0.y);
            ctx.lineTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.lineTo(v3.x, v3.y);
            ctx.closePath();
            ctx.fillStyle = "rgba(7, 8, 15, 0.6)";
            ctx.fill();

            // Draw Box Columns/Legs
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 1;
            [v0, v1, v2, v3].forEach((bot, idx) => {
              const top = [v4, v5, v6, v7][idx];
              ctx.beginPath();
              ctx.moveTo(bot.x, bot.y);
              ctx.lineTo(top.x, top.y);
              ctx.stroke();
            });

            // Draw Box Top Face
            ctx.beginPath();
            ctx.moveTo(v4.x, v4.y);
            ctx.lineTo(v5.x, v5.y);
            ctx.lineTo(v6.x, v6.y);
            ctx.lineTo(v7.x, v7.y);
            ctx.closePath();
            ctx.fillStyle = deskColor;
            ctx.fill();
            ctx.strokeStyle = deskBorder;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Draw Student Sphere/Capsule inside desk
            if (desk.active) {
              const sp = project(desk.x, desk.y, h + 5);
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, 4.5 * sp.scale, 0, Math.PI * 2);
              ctx.fillStyle = activeAlert ? "rgba(239, 68, 68, 0.8)" : "rgba(224, 150, 62, 0.7)";
              ctx.shadowBlur = activeAlert ? 8 : 2;
              ctx.shadowColor = activeAlert ? "#ef4444" : "#e0963e";
              ctx.fill();
              ctx.shadowBlur = 0; // reset shadow
              
              // Draw small text naming the Desk Seat Index
              ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
              ctx.font = `${Math.floor(7 * sp.scale)}px monospace`;
              ctx.textAlign = "center";
              ctx.fillText(`D-${desk.index + 1}`, sp.x, sp.y + 12);
            }
          }
        });
      });

      // Render Player Invigilator Drone
      const plP = project(state.player.x, state.player.y, state.player.z);
      renderQueue.push({
        type: "player",
        depth: plP.zDepth,
        draw: () => {
          const size = 12;
          const px = plP.x;
          const py = plP.y;
          const scale = plP.scale;

          // Shadow projection on floor grid
          const shadowP = project(state.player.x, state.player.y, 0);
          ctx.beginPath();
          ctx.ellipse(shadowP.x, shadowP.y, size * shadowP.scale * 1.5, size * shadowP.scale * 0.75, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(7, 8, 15, 0.7)";
          ctx.fill();
          ctx.strokeStyle = "rgba(104, 117, 245, 0.2)";
          ctx.stroke();

          // Action radius ring guide
          ctx.beginPath();
          ctx.ellipse(shadowP.x, shadowP.y, 35 * shadowP.scale, 18 * shadowP.scale, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]); // clear dash

          // Glowing energy line down from drone to shadow
          ctx.strokeStyle = "rgba(104, 117, 245, 0.25)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(shadowP.x, shadowP.y);
          ctx.stroke();

          // Main Drone body - Double concentric ring structure
          ctx.shadowBlur = 12;
          ctx.shadowColor = "#e0963e";

          // Core body
          ctx.beginPath();
          ctx.arc(px, py, size * 0.4 * scale, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          // Outer revolving ring (Gold)
          ctx.beginPath();
          ctx.ellipse(px, py, size * scale, size * 0.5 * scale, tick * 0.05, 0, Math.PI * 2);
          ctx.strokeStyle = "#e0963e";
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Inner rotating cross wings
          const angle1 = tick * 0.12;
          const angle2 = tick * 0.12 + Math.PI / 2;
          const drawBlade = (ang: number) => {
            const bx = Math.cos(ang) * size * scale;
            const by = Math.sin(ang) * size * 0.5 * scale;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + bx, py + by);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Blade tip glows
            ctx.beginPath();
            ctx.arc(px + bx, py + by, 2 * scale, 0, Math.PI * 2);
            ctx.fillStyle = "#e0963e";
            ctx.fill();
          };
          drawBlade(angle1);
          drawBlade(angle1 + Math.PI);
          drawBlade(angle2);
          drawBlade(angle2 + Math.PI);

          ctx.shadowBlur = 0; // reset glow

          // Interaction Prompt overlay if close to any alert
          const isNear = state.incidents.some(inc => {
            if (inc.resolved) return false;
            const dx = state.player.x - inc.x;
            const dy = state.player.y - inc.y;
            return Math.sqrt(dx * dx + dy * dy) <= 35;
          });

          if (isNear) {
            ctx.fillStyle = "#10b981";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("[SPACE] TO RESOLVE", px, py - 20);
          }
        }
      });

      // Render Particles
      state.particles.forEach((p) => {
        const proj = project(p.x, p.y, p.z);
        renderQueue.push({
          type: "particle",
          depth: proj.zDepth,
          draw: () => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            
            if (p.isText) {
              // Draw rising font values
              ctx.font = `bold ${Math.floor(p.size * proj.scale)}px sans-serif`;
              ctx.textAlign = "center";
              ctx.fillText(p.text, proj.x, proj.y);
            } else {
              // Draw standard particle dot
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
              ctx.fill();
            }
            
            ctx.globalAlpha = 1.0; // reset transparency
          }
        });
      });

      // 3. Sort render queue by Z-depth (largest depth is drawn first)
      renderQueue.sort((a, b) => b.depth - a.depth);

      // 4. Render sorted elements
      renderQueue.forEach(item => item.draw());

      ctx.restore(); // restore translated shaking coordinates

      // UI text overlay on Canvas (Minimap & Instructions)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("INCIDENT LOCATOR v1.02", 15, 25);
      
      // Control center box
      ctx.strokeStyle = "rgba(104, 117, 245, 0.25)";
      ctx.strokeRect(10, 10, 130, 20);
      
      // HUD Compass
      const compX = w - 30;
      const compY = 30;
      ctx.beginPath();
      ctx.arc(compX, compY, 15, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(compX, compY);
      ctx.lineTo(compX + Math.cos(-state.camera.yaw) * 12, compY + Math.sin(-state.camera.yaw) * 12);
      ctx.strokeStyle = "#e0963e";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("N", compX + Math.cos(-state.camera.yaw) * 18, compY + Math.sin(-state.camera.yaw) * 18 + 3);

      animId = requestAnimationFrame(run);
    };

    // Run game loop
    run();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleMouseUp);
    };
  }, [cameraZoom]);

  return (
    <div className="min-h-dvh max-w-[100vw] overflow-x-clip bg-background">
      {/* App Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-4 sm:px-6 md:px-12" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src="/snpsu-logo.png" alt="Sapthagiri NPS University Logo" className="size-9 shrink-0 object-contain sm:size-10" />
          <div className="min-w-0">
            <span className="block truncate font-display text-sm font-bold leading-tight sm:text-lg">Sapthagiri NPS University</span>
            <span className="text-[11px] font-semibold text-muted-foreground">Examination Cell Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/auth">Faculty Access</Link>
          </Button>
          <Button asChild size="sm" className="btn-3d shrink-0">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Main Grid View featuring Interactive game on the right */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          
          {/* Typography Panel */}
          <div className="space-y-6 lg:col-span-5 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary sm:px-4 sm:text-xs">
              <Sparkles className="size-3.5 text-primary animate-pulse" />
              <span className="truncate">SAPTHAGIRI NPS UNIVERSITY EXAM SYSTEM</span>
            </div>
            
            <h1 className="text-balance font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Next-Gen Seating & Invigilation Control
            </h1>
            
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              Maintain institutional integrity with randomized layout matrices, auto-generated compliance forms (A, B, and Tenancy sheets), and immediate live-classroom emergency dispatching.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="btn-3d w-full sm:w-auto">
                <Link to="/auth">Open Control Centre</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/auth">Faculty Portal</Link>
              </Button>
            </div>

            {/* Quick Metrics display */}
            <div className="grid grid-cols-3 gap-4 border-t border-border/30 pt-6 mt-8">
              <div>
                <span className="block text-2xl font-bold font-display text-primary">100%</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gap Compliance</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-display text-primary">45+</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Halls</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-display text-primary">1-Click</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocation</span>
              </div>
            </div>
          </div>

          {/* Interactive 3D Simulator Game Panel */}
          <div className="lg:col-span-7">
            <div className="glass-strong overflow-hidden rounded-3xl p-3 sm:p-5 flex flex-col gap-4 border-primary/20 relative shadow-2xl">
              
              {/* HUD / Scoreboard Overlay */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                    <Trophy className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Invigilator Training Score</div>
                    <div className="text-sm sm:text-lg font-bold font-display text-foreground">{score} XP</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 rounded-md text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
                    <Zap className="size-3 animate-bounce" />
                    Resolved: {resolvedCount}
                  </div>
                  <div className="bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-md text-amber-500 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="size-3" />
                    Alerts: {activeAlerts.length}
                  </div>
                </div>
              </div>

              {/* Game Viewport Container */}
              <div className="relative rounded-2xl overflow-hidden border border-border/20 bg-[#07080f]">
                <canvas
                  ref={canvasRef}
                  className="block cursor-grab active:cursor-grabbing w-full"
                />

                {/* Keyboard controls tutorial helper box */}
                <div className="absolute bottom-3 left-3 right-3 glass-strong px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border-border/10">
                  <div className="flex items-center gap-2">
                    <Keyboard className="size-4 text-primary shrink-0" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{controlsHint}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-[9px] font-mono text-muted-foreground uppercase font-bold border border-border/20">W</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-[9px] font-mono text-muted-foreground uppercase font-bold border border-border/20">A</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-[9px] font-mono text-muted-foreground uppercase font-bold border border-border/20">S</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-[9px] font-mono text-muted-foreground uppercase font-bold border border-border/20">D</kbd>
                  </div>
                </div>
              </div>

              {/* Game Control Actions Dashboard Panel */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => spawnIncident()} 
                      className="text-xs h-8 gap-1.5 border-dashed"
                    >
                      <RefreshCw className="size-3.5" />
                      Spawn Incident
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsGridMode(prev => {
                          gameStateRef.current.isGridMode = !prev;
                          return !prev;
                        });
                      }}
                      className="text-xs h-8"
                    >
                      Toggle Grid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCameraZoom(prev => {
                          const next = prev === 1 ? 1.3 : prev === 1.3 ? 0.8 : 1;
                          return next;
                        });
                      }}
                      className="text-xs h-8"
                    >
                      Zoom ({cameraZoom}x)
                    </Button>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={handleResolveAlert}
                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                  >
                    <ShieldCheck className="size-3.5" />
                    Resolve Near Alert
                  </Button>
                </div>

                {/* Alerts dispatcher lists */}
                {activeAlerts.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/20 pt-3">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-left">Active Dispatch Queue (Click to Route Drone)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[85px] overflow-y-auto pr-1">
                      {activeAlerts.map(alert => (
                        <div
                          key={alert.id}
                          onClick={() => pilotToAlert(alert)}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50 border border-border/30 hover:border-primary/50 cursor-pointer transition text-left group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="size-2 rounded-full shrink-0 animate-pulse"
                              style={{ backgroundColor: alert.color }}
                            />
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-foreground truncate group-hover:text-primary transition">Desk {alert.deskIndex + 1}</div>
                              <div className="text-[9px] text-muted-foreground truncate">{alert.label}</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-primary group-hover:translate-x-0.5 transition shrink-0">ROUTE &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Core Modules Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-24">
        <h2 className="text-center font-display text-2xl font-bold mb-10 sm:text-3xl">Official Institutional Management Modules</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glass-hover rounded-2xl p-6 text-left space-y-3">
              <div className="bg-primary/10 p-2.5 rounded-xl inline-block text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-lg font-bold font-display">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Floating control desk mock footer info */}
      <footer className="border-t border-border/30 py-6 text-center text-xs text-muted-foreground bg-background/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sapthagiri NPS University examination duty management engine. For admin assistance contact central cell.</span>
          <span className="font-mono text-[10px]">SYSTEM STATUS: SECURE (v1.0.4)</span>
        </div>
      </footer>
    </div>
  );
}
