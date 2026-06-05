import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult, PlacedDiffuser, Probe, ToolMode, SliceState } from '../../../../../types';
import { getDiffuserFlowType } from '../../../../../constants';
import { getDiffuserGeometry, getVerticalJetProfile } from '../utils/diffuserJetProfile';

const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 8000, 
  SPAWN_RATE_BASE: 12,
  SPAWN_RATE_MULTIPLIER: 0
};

// --- TYPES ---
interface Particle {
    active: boolean;
    x: number; 
    y: number; 
    vx: number; 
    vy: number; 
    buoyancy: number; 
    drag: number; 
    age: number; 
    life: number; 
    lastHistoryTime: number; 
    history: {x: number, y: number, age: number}[]; 
    color: string; 
    waveFreq: number; 
    wavePhase: number; 
    waveAmp: number; 
    isHorizontal: boolean; 
    isSuction: boolean;
}

interface SideViewCanvasProps {
  width: number; 
  height: number;
  physics: PerformanceResult;
  isPowerOn: boolean; 
  isPlaying: boolean;
  temp: number; 
  roomTemp: number;
  flowType: string; 
  modelId: string;
  showGrid: boolean;
  roomWidth: number;
  roomLength: number;
  roomHeight: number; 
  diffuserHeight: number; 
  workZoneHeight: number;
  placedDiffusers?: PlacedDiffuser[];
  selectedDiffuserIds?: string[];
  onSelectDiffuser?: (id: string | null, multi?: boolean) => void;
  onUpdateDiffuserPos?: (id: string, x: number, y: number) => void;
  viewType: 'front' | 'right';
  slice?: SliceState;
  activeTool?: ToolMode;
  probes?: Probe[];
  onAddProbe?: (x: number, y: number) => void;
  onUpdateProbePos?: (id: string, pos: {x?: number, y?: number, z?: number}) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// --- HELPERS ---
const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`; 
    if (t >= 28) return `255, 99, 132`; 
    if (t > 18 && t < 28) return `100, 255, 160`; 
    return `255, 255, 255`;
};

const getSideLayout = (w: number, h: number, rh: number, rw: number) => {
    const padding = 60;
    const availW = Math.max(10, w - padding * 2);
    const availH = Math.max(10, h - padding * 2);
    const ppm = Math.max(0.1, Math.min(availW / rw, availH / rh));
    const offsetX = (w - rw * ppm) / 2;
    const offsetY = (h - rh * ppm) / 2;
    return { ppm, offsetX, offsetY };
};

const sampleProjectedRing = (radius: number) => {
    const azimuth = Math.random() * Math.PI * 2;
    return {
        offset: Math.cos(azimuth) * radius,
        lateral: Math.cos(azimuth),
        tangent: Math.sin(azimuth)
    };
};

const sampleProjectedDisk = (radius: number) => {
    const azimuth = Math.random() * Math.PI * 2;
    const localRadius = Math.sqrt(Math.random()) * radius;
    return {
        offset: Math.cos(azimuth) * localRadius,
        lateral: Math.cos(azimuth),
        tangent: Math.sin(azimuth)
    };
};

const getProjectedPos = (viewType: 'front' | 'right', diffuser: Pick<PlacedDiffuser, 'x' | 'y'>) =>
    viewType === 'front' ? diffuser.x : diffuser.y;

const getDepthPos = (viewType: 'front' | 'right', diffuser: Pick<PlacedDiffuser, 'x' | 'y'>) =>
    viewType === 'front' ? diffuser.y : diffuser.x;

const getEffectiveViewType = (state: SideViewCanvasProps): 'front' | 'right' => {
    if (state.slice?.isActive) {
        return state.slice.axis === 'y' ? 'front' : 'right';
    }
    return state.viewType;
};

const getSliceOpacity = (dPos: number, state: SideViewCanvasProps) => {
    if (!state.slice?.isActive) return 1.0;
    
    const { position, depth, direction } = state.slice;
    const start = position;
    const end = position + depth * direction;
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    
    if (dPos >= min && dPos <= max) return 1.0;
    
    const distToBox = dPos < min ? min - dPos : dPos - max;
    if (distToBox <= 0.5) {
        return 1.0 - (distToBox / 0.5);
    }
    return 0.0;
};

const getSliceDiffusers = (state: SideViewCanvasProps) => {
    return (state.placedDiffusers || []).filter(d => {
        if (!isRenderableDiffuser(d)) return false;
        if (!state.slice?.isActive) return true;
        
        const { axis, position, depth, direction } = state.slice;
        const dPos = axis === 'y' ? d.y : d.x;
        
        const start = position;
        const end = position + depth * direction;
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        
        const fadeEnd = max + 0.5;
        const fadeStart = min - 0.5;
        
        return dPos >= fadeStart && dPos <= fadeEnd;
    });
};

const isRenderableDiffuser = (diffuser: PlacedDiffuser) =>
    !diffuser.performance?.error && !!diffuser.performance?.spec?.A;

const buildSideFlowResetKey = (state: SideViewCanvasProps) => JSON.stringify({
    viewType: getEffectiveViewType(state),
    room: [state.roomWidth, state.roomLength, state.roomHeight],
    slice: state.slice
});

const SideViewCanvas: React.FC<SideViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const simulationRef = useRef(props);
    const flowResetKeyRef = useRef(buildSideFlowResetKey(props));
    const particlePool = useRef<Particle[]>([]);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, z: 0 });
    const dragTargetRef = useRef<{ type: 'probe' | 'diffuser', id: string } | null>(null);

    // Init Pool
    useEffect(() => {
        if (particlePool.current.length === 0) {
            for (let i = 0; i < CONSTANTS.MAX_PARTICLES; i++) {
                particlePool.current.push({
                    active: false,
                    x: 0, y: 0, vx: 0, vy: 0,
                    buoyancy: 0, drag: 0, age: 0, life: 0,
                    lastHistoryTime: 0,
                    history: [], 
                    color: '255,255,255',
                    waveFreq: 0, wavePhase: 0, waveAmp: 0,
                    isHorizontal: false, isSuction: false
                });
            }
        }
    }, []);

    // Sync Props
    useEffect(() => {
        const nextFlowResetKey = buildSideFlowResetKey(props);
        const shouldResetParticles = getEffectiveViewType(simulationRef.current) !== getEffectiveViewType(props) || flowResetKeyRef.current !== nextFlowResetKey;

        if (shouldResetParticles) {
            particlePool.current.forEach(p => p.active = false);
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, props.width, props.height);
                    ctx.fillStyle = '#030304';
                    ctx.fillRect(0, 0, props.width, props.height);
                }
            }
        }

        flowResetKeyRef.current = nextFlowResetKey;
        simulationRef.current = props;
    }, [props]);

    const spawnParticle = (p: Particle, state: SideViewCanvasProps, ppm: number, offsetX: number, offsetY: number) => {
        // Determine Source
        let activeDiffuser: {
            x: number,
            performance: PerformanceResult,
            modelId: string,
            flowType?: string,
            modeIdx?: number,
            temperature: number
        };

        const sliceDiffusers = getSliceDiffusers(state);

        if (sliceDiffusers.length > 0) {
            const idx = Math.floor(Math.random() * sliceDiffusers.length);
            const d = sliceDiffusers[idx];
            const pos = getProjectedPos(getEffectiveViewType(state), d);
            activeDiffuser = {
                x: offsetX + pos * ppm,
                performance: d.performance,
                modelId: d.modelId,
                flowType: d.flowType,
                modeIdx: d.modeIdx,
                temperature: d.temperature
            };
        } else {
            return;
        }

        const { performance: physics, modelId, x: centerX, flowType: explicitFlowType, modeIdx, temperature: diffuserTemp } = activeDiffuser;
        const { roomHeight, diffuserHeight } = state;
        
        if (physics.error) return;
        const spec = physics.spec;
        if (!spec || !spec.A) return;

        const flowType = explicitFlowType || state.flowType || 'vertical-conical';

        const nozzleW = (spec.A / 1000) * ppm;
        const geometry = getDiffuserGeometry(modelId, spec, ppm);

        const mountedHeight = Math.max(0, Math.min(diffuserHeight, roomHeight));
        const diffuserYPos = offsetY + (roomHeight - mountedHeight) * ppm;
        let startY = diffuserYPos + geometry.outletOffset;

        const pxSpeed = (physics.v0 || 0) * ppm * 0.8;

        let startX = centerX;
        let vx = 0, vy = 0;
        let drag = 0.96;
        let waveAmp = 5;
        let waveFreq = 4 + Math.random() * 4;
        let isHorizontal = false;
        let isSuction = false;

        const physicsAr = physics.Ar || 0; 
        const visualGain = 50.0; 
        const buoyancy = -physicsAr * (physics.v0 * physics.v0) * ppm * visualGain;

        if (flowType === 'suction') {
            isSuction = true;
            const roomDim = getEffectiveViewType(state) === 'front' ? state.roomWidth : state.roomLength;
            startX = offsetX + Math.random() * roomDim * ppm;
            const spawnY = offsetY + Math.random() * state.roomHeight * ppm;
            const targetX = centerX;
            const targetY = diffuserYPos;
            const dx = targetX - startX;
            const dy = targetY - spawnY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const force = ((physics.v0 || 0) * 500) / (dist + 10);
            vx = (dx / dist) * force;
            vy = (dy / dist) * force;
            drag = 1.0; waveAmp = 0;
            p.life = 3.0; 
            p.color = '150, 150, 150';
        } else {
            const verticalProfile = getVerticalJetProfile(modelId, flowType);

            if (verticalProfile) {
                const emitterRadius = nozzleW * (verticalProfile.radiusFactor + Math.random() * verticalProfile.radiusJitter);
                const projection = verticalProfile.emitter === 'ring'
                    ? sampleProjectedRing(emitterRadius)
                    : sampleProjectedDisk(emitterRadius);
                const coneAngle = (verticalProfile.coneMinDeg + Math.random() * verticalProfile.coneJitterDeg) * (Math.PI / 180);
                const horizontalSpeed = Math.sin(coneAngle) * pxSpeed * verticalProfile.horizontalFactor;
                const radialDirection = 1 - 2 * verticalProfile.inwardFactor;

                startX = centerX + projection.offset;
                vx = projection.lateral * horizontalSpeed * radialDirection + projection.tangent * pxSpeed * verticalProfile.tangentialFactor;
                vy = Math.cos(coneAngle) * pxSpeed * verticalProfile.speedFactor;
                waveAmp = verticalProfile.waveAmp;
                waveFreq = verticalProfile.waveFreq;
                drag = verticalProfile.drag;
            } else {
                // Страховочный профиль (если нет данных)
                const projection = sampleProjectedDisk(nozzleW * 0.8);
                startX = centerX + projection.offset;
                const coneAngle = (15 + Math.random() * 15) * (Math.PI / 180);
                vx = projection.lateral * Math.sin(coneAngle) * pxSpeed * 0.6;
                vy = Math.cos(coneAngle) * pxSpeed;
                waveAmp = 4; drag = 0.98;
            }

            p.life = 6.0 + Math.random() * 4.0;
            p.color = getGlowColor(diffuserTemp);
        }

        p.x = startX; p.y = startY; p.vx = vx; p.vy = vy; 
        p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
        p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
        p.isHorizontal = isHorizontal; p.isSuction = isSuction;
        p.active = true;
        p.lastHistoryTime = 0;
        p.history.length = 0; 
        p.history.push({ x: startX, y: startY, age: 0 });
    };

    const drawDiffuserSideProfile = (
        ctx: CanvasRenderingContext2D, 
        cx: number, 
        ppm: number, 
        offsetY: number,
        state: SideViewCanvasProps,
        overridePerf?: PerformanceResult,
        overrideModelId?: string
    ) => {
        const perf = overridePerf || state.physics;
        const modelId = overrideModelId || state.modelId;
        const isSelected = state.selectedDiffuserIds?.includes(state.placedDiffusers?.find(d => d.performance === perf)?.id || '');
        const spec = perf.spec;
        if (!spec || !spec.A) return;

        const scale = ppm / 1000;
        const faceDiameter = (spec.B || spec.A || 0) * scale;
        const neckDiameter = (spec.A || 0) * scale;
        const geometry = getDiffuserGeometry(modelId, spec, ppm);
        const r = faceDiameter / 2;
        const nR = neckDiameter / 2;
        const mountedHeight = Math.max(0, Math.min(state.diffuserHeight, state.roomHeight));
        const yPos = offsetY + (state.roomHeight - mountedHeight) * ppm;
        const lip = Math.max(2, 6 * scale);
        const bodyFill = isSelected ? '#3b82f6' : '#d9e1ea';
        const detailFill = isSelected ? '#60a5fa' : '#bcc8d6';
        const accentFill = isSelected ? '#93c5fd' : '#8d9daf';

        ctx.save();
        ctx.translate(cx, yPos);
        
        if (isSelected) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
        }
        
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = isSelected ? '#2563eb' : '#8fa0b2';
        ctx.fillStyle = bodyFill;

        // Draw the main body first
        switch (modelId) {
            case 'dpu-m': {
                ctx.beginPath();
                ctx.moveTo(-r * 0.95, lip);
                ctx.quadraticCurveTo(-r * 0.95, geometry.bodyDepth * 0.34, -nR, geometry.bodyDepth * 0.72);
                ctx.lineTo(nR, geometry.bodyDepth * 0.72);
                ctx.quadraticCurveTo(r * 0.95, geometry.bodyDepth * 0.34, r * 0.95, lip);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Dark throat
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.moveTo(-nR * 0.8, geometry.bodyDepth * 0.72);
                ctx.lineTo(nR * 0.8, geometry.bodyDepth * 0.72);
                ctx.lineTo(nR * 0.6, geometry.bodyDepth * 0.4);
                ctx.lineTo(-nR * 0.6, geometry.bodyDepth * 0.4);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = detailFill;
                ctx.beginPath();
                ctx.moveTo(-r * 0.56, geometry.bodyDepth * 0.62);
                ctx.quadraticCurveTo(0, geometry.bodyDepth * 1.08, r * 0.56, geometry.bodyDepth * 0.62);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = '#6e8094';
                ctx.beginPath();
                ctx.moveTo(0, lip);
                ctx.lineTo(0, geometry.bodyDepth * 0.93);
                ctx.moveTo(-nR, geometry.bodyDepth * 0.72);
                ctx.lineTo(-r * 0.56, geometry.bodyDepth * 0.62);
                ctx.moveTo(nR, geometry.bodyDepth * 0.72);
                ctx.lineTo(r * 0.56, geometry.bodyDepth * 0.62);
                ctx.stroke();
                break;
            }
            case 'dpu-k': {
                ctx.beginPath();
                ctx.moveTo(-r * 0.95, lip);
                ctx.quadraticCurveTo(-r * 0.95, geometry.bodyDepth * 0.34, -nR, geometry.bodyDepth * 0.68);
                ctx.lineTo(nR, geometry.bodyDepth * 0.68);
                ctx.quadraticCurveTo(r * 0.95, geometry.bodyDepth * 0.34, r * 0.95, lip);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Dark throat
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.moveTo(-nR * 0.8, geometry.bodyDepth * 0.68);
                ctx.lineTo(nR * 0.8, geometry.bodyDepth * 0.68);
                ctx.lineTo(nR * 0.6, geometry.bodyDepth * 0.3);
                ctx.lineTo(-nR * 0.6, geometry.bodyDepth * 0.4);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#6e8094';
                [0.42, 0.56, 0.70].forEach((ratio, idx) => {
                    const span = r * (0.72 - idx * 0.15);
                    const y = geometry.bodyDepth * ratio;
                    ctx.beginPath();
                    ctx.moveTo(-span, y);
                    ctx.lineTo(span, y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-span, y);
                    ctx.lineTo(0, y - geometry.bodyDepth * 0.1);
                    ctx.moveTo(span, y);
                    ctx.lineTo(0, y - geometry.bodyDepth * 0.1);
                    ctx.stroke();
                });

                ctx.beginPath();
                ctx.moveTo(0, lip);
                ctx.lineTo(0, geometry.bodyDepth * 0.75);
                ctx.stroke();
                break;
            }
            case 'dpu-v': {
                ctx.beginPath();
                ctx.moveTo(-r * 0.95, lip);
                ctx.quadraticCurveTo(-r * 0.95, geometry.bodyDepth * 0.28, -nR, geometry.bodyDepth * 0.62);
                ctx.lineTo(nR, geometry.bodyDepth * 0.62);
                ctx.quadraticCurveTo(r * 0.95, geometry.bodyDepth * 0.28, r * 0.95, lip);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Dark throat
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.moveTo(-nR * 0.8, geometry.bodyDepth * 0.62);
                ctx.lineTo(nR * 0.8, geometry.bodyDepth * 0.62);
                ctx.lineTo(nR * 0.6, geometry.bodyDepth * 0.2);
                ctx.lineTo(-nR * 0.6, geometry.bodyDepth * 0.2);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = accentFill;
                ctx.beginPath();
                ctx.roundRect(-r * 0.62, geometry.bodyDepth * 0.2, r * 1.24, geometry.bodyDepth * 0.26, lip / 2);
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = '#e9f0f8';
                for (let i = -3; i <= 3; i++) {
                    const bx = i * r * 0.16;
                    ctx.beginPath();
                    ctx.moveTo(bx - r * 0.06, geometry.bodyDepth * 0.2);
                    ctx.lineTo(bx + r * 0.06, geometry.bodyDepth * 0.46);
                    ctx.stroke();
                }
                break;
            }
            case 'dpu-s': {
                ctx.beginPath();
                ctx.moveTo(-r * 0.92, lip);
                ctx.quadraticCurveTo(-r * 0.9, geometry.bodyDepth * 0.48, -nR, geometry.bodyDepth);
                ctx.lineTo(nR, geometry.bodyDepth);
                ctx.quadraticCurveTo(r * 0.9, geometry.bodyDepth * 0.48, r * 0.92, lip);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = detailFill;
                ctx.beginPath();
                ctx.moveTo(-r * 0.72, lip);
                ctx.quadraticCurveTo(-r * 0.68, geometry.bodyDepth * 0.44, -nR * 0.5, geometry.bodyDepth * 1.02);
                ctx.lineTo(nR * 0.5, geometry.bodyDepth * 1.02);
                ctx.quadraticCurveTo(r * 0.68, geometry.bodyDepth * 0.44, r * 0.72, lip);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            }
            default:
                ctx.beginPath();
                ctx.roundRect(-r * 0.8, lip, r * 1.6, geometry.bodyDepth * 0.7, lip / 2);
                ctx.fill();
                ctx.stroke();
                break;
        }

        // Draw the lip on top
        ctx.fillStyle = bodyFill;
        ctx.beginPath();
        ctx.roundRect(-r * 0.92, 0, r * 1.84, lip, lip / 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    };

    const drawAllDiffusers = (ctx: CanvasRenderingContext2D, ppm: number, offsetX: number, offsetY: number, state: SideViewCanvasProps) => {
        if (state.placedDiffusers && state.placedDiffusers.length > 0) {
            state.placedDiffusers.forEach(d => {
                const screenX = offsetX + getProjectedPos(getEffectiveViewType(state), d) * ppm;
                const dPos = getDepthPos(getEffectiveViewType(state), d);

                ctx.save();
                ctx.globalAlpha = getSliceOpacity(dPos, state);
                drawDiffuserSideProfile(ctx, screenX, ppm, offsetY, state, d.performance, d.modelId);
                ctx.restore();
            });
        }
    }

    const drawProbes = (ctx: CanvasRenderingContext2D, ppm: number, offsetX: number, offsetY: number, state: SideViewCanvasProps) => {
        if (!state.probes) return;

        state.probes.forEach(p => {
            const dPos = getEffectiveViewType(state) === 'front' ? p.y : p.x;
            
            const opacity = getSliceOpacity(dPos, state);
            if (opacity <= 0) return;

            const pos = getEffectiveViewType(state) === 'front' ? p.x : p.y;
            const px = offsetX + pos * ppm;
            const py = offsetY + (state.roomHeight - p.z) * ppm; // Vertical height Z
            
            ctx.save();
            ctx.globalAlpha = opacity;
            
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#34d399'; // Green probe color
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Height label
            ctx.fillStyle = '#fff';
            ctx.font = '10px Inter';
            const depthLabel = getEffectiveViewType(state) === 'front' ? `y: ${p.y.toFixed(1)}m` : `x: ${p.x.toFixed(1)}m`;
            ctx.fillText(`z: ${p.z.toFixed(1)}m | ${depthLabel}`, px + 10, py);
            
            ctx.restore();
        });
    }

    const drawSideViewGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, ppm: number, offsetX: number, offsetY: number, state: SideViewCanvasProps) => {
        const roomDim = getEffectiveViewType(state) === 'front' ? state.roomWidth : state.roomLength;
        const roomPixW = roomDim * ppm;
        const roomPixH = state.roomHeight * ppm;

        // Draw room outline
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, roomPixW, roomPixH);
        
        // Fill room background slightly lighter
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(offsetX, offsetY, roomPixW, roomPixH);

        if (!state.showGrid) return;
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        const step = 0.5 * ppm;
        
        ctx.beginPath();
        for (let x = 0; x <= roomPixW; x += step) { 
            ctx.moveTo(offsetX + x, offsetY); 
            ctx.lineTo(offsetX + x, offsetY + roomPixH); 
        }
        for (let y = 0; y <= roomPixH; y += step) { 
            ctx.moveTo(offsetX, offsetY + y); 
            ctx.lineTo(offsetX + roomPixW, offsetY + y); 
        }
        ctx.stroke();
        
        if (state.workZoneHeight > 0) {
            const wzY = offsetY + (state.roomHeight - state.workZoneHeight) * ppm;
            ctx.beginPath();
            ctx.setLineDash([10, 5]);
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.moveTo(offsetX, wzY);
            ctx.lineTo(offsetX + roomPixW, wzY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
            ctx.font = 'bold 10px Inter';
            ctx.fillText(`РАБОЧАЯ ЗОНА (${state.workZoneHeight}м)`, offsetX + 10, wzY - 5);
        }
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, roomHeight } = state;
        const mountedHeight = Math.max(0, Math.min(state.diffuserHeight, state.roomHeight));
        
        const dt = CONSTANTS.BASE_TIME_STEP;
        const roomDim = getEffectiveViewType(state) === 'front' ? state.roomWidth : state.roomLength;
        const { ppm, offsetX, offsetY } = getSideLayout(width, height, roomHeight, roomDim);

        if (!isPowerOn) {
                ctx.clearRect(0, 0, width, height);
                ctx.fillStyle = '#030304';
                ctx.fillRect(0, 0, width, height);
                drawSideViewGrid(ctx, width, height, ppm, offsetX, offsetY, state);
                drawAllDiffusers(ctx, ppm, offsetX, offsetY, state);
                drawProbes(ctx, ppm, offsetX, offsetY, state);
                requestRef.current = requestAnimationFrame(animate);
                return;
        }

        ctx.fillStyle = 'rgba(3, 3, 4, 0.3)'; 
        ctx.fillRect(0, 0, width, height);
        
        drawSideViewGrid(ctx, width, height, ppm, offsetX, offsetY, state);

        const pool = particlePool.current;
        
        // 1. SPAWN
        const sliceDiffusers = getSliceDiffusers(state);
        if (isPowerOn && isPlaying && sliceDiffusers.length > 0) {
            const diffusersCount = sliceDiffusers.length;
            const spawnRate = CONSTANTS.SPAWN_RATE_BASE * diffusersCount;
            
            let spawnedCount = 0;
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) {
                    spawnParticle(pool[i], state, ppm, offsetX, offsetY);
                    spawnedCount++;
                    if (spawnedCount >= spawnRate) break;
                }
            }
        }

        // 2. PHYSICS
        const maxH = height;
        const batches: Record<string, Particle[]> = {};
        const QUANTIZE = 20;

        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;

            if (isPowerOn && isPlaying) {
                p.age += dt;
                if (p.age > p.life) {
                    p.active = false;
                    continue;
                }

                if (p.isSuction) {
                    p.x += p.vx * dt; 
                    p.y += p.vy * dt;
                    const diffY = offsetY + (state.roomHeight - mountedHeight) * ppm;
                    if (p.y > diffY - 10) p.active = false; 
                } else {
                    p.vy += p.buoyancy * dt;
                    
                    if (!p.isHorizontal) {
                        const turb = 2.0 * ppm * dt;
                        p.vx += (Math.random() - 0.5) * turb;
                    }
                    
                    p.vx *= p.drag;
                    p.vy *= p.drag;
                    p.x += p.vx * dt; p.y += p.vy * dt;
                }

                // Collisions
                // Floor
                if (p.y >= offsetY + roomHeight * ppm) {
                    p.y = offsetY + roomHeight * ppm;
                    if (!p.isHorizontal) {
                        p.isHorizontal = true;
                        const energyLoss = 0.6;
                        const impactSpeed = Math.abs(p.vy) * energyLoss;
                        p.vy = 0;
                        
                        const currentSpeed = Math.abs(p.vx);
                        if (currentSpeed > 0.1) {
                            p.vx += Math.sign(p.vx) * impactSpeed;
                        } else {
                            p.vx += (Math.random() > 0.5 ? 1 : -1) * impactSpeed;
                        }
                        p.drag = 0.95;
                    }
                }
                // Ceiling
                if (p.y < offsetY) {
                    p.y = offsetY;
                    p.vy = Math.max(0, p.vy * -0.05);
                }
                // Left Wall
                if (p.x < offsetX) {
                    p.x = offsetX;
                    p.active = false;
                    continue;
                }
                // Right Wall
                if (p.x > offsetX + roomDim * ppm) {
                    p.x = offsetX + roomDim * ppm;
                    p.active = false;
                    continue;
                }

                if (p.age - p.lastHistoryTime >= CONSTANTS.HISTORY_RECORD_INTERVAL) {
                    if (p.history.length > 20) p.history.shift();
                    p.history.push({ x: p.x, y: p.y, age: p.age });
                    p.lastHistoryTime = p.age;
                }
            }

            if (p.history.length > 1) {
                const ageRatio = p.age / p.life;
                let rawAlpha = 0;
                
                if (ageRatio < 0.05) {
                    // Fade-in
                    rawAlpha = ageRatio / 0.05;
                } else {
                    // Parabolic fade-out
                    const fadeRatio = (ageRatio - 0.05) / 0.95;
                    rawAlpha = 1.0 - Math.pow(fadeRatio, 2);
                }
                
                if (p.isHorizontal) {
                    rawAlpha *= 0.35;
                }
                
                rawAlpha *= 0.7; // Overall brightness multiplier
                
                const alpha = Math.ceil(rawAlpha * QUANTIZE) / QUANTIZE;
                if (alpha <= 0) continue;

                const key = `${p.color}|${alpha}`;
                if (!batches[key]) batches[key] = [];
                batches[key].push(p);
            }
        }

        // 3. DRAW PARTICLES
        ctx.globalCompositeOperation = 'screen';
        ctx.lineWidth = 0.8; 
        ctx.lineCap = 'round';

        for (const key in batches) {
            const [color, alphaStr] = key.split('|');
            ctx.strokeStyle = `rgba(${color}, ${alphaStr})`;
            ctx.beginPath();
            
            const particles = batches[key];
            for (let k = 0; k < particles.length; k++) {
                const p = particles[k];
                const waveVal = Math.sin(p.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(p.age, 1.0);
                const wx = (p.isHorizontal && !p.isSuction) ? 0 : waveVal;
                const wy = (p.isHorizontal && !p.isSuction) ? waveVal : 0;
                
                ctx.moveTo(p.x + wx, p.y + wy);
                
                for (let j = p.history.length - 1; j >= 0; j--) {
                    const h = p.history[j];
                    const hWave = Math.sin(h.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(h.age, 1.0);
                    const hwx = (p.isHorizontal && !p.isSuction) ? 0 : hWave;
                    const hwy = (p.isHorizontal && !p.isSuction) ? hWave : 0;
                    ctx.lineTo(h.x + hwx, h.y + hwy);
                }
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
        drawAllDiffusers(ctx, ppm, offsetX, offsetY, state);
        drawProbes(ctx, ppm, offsetX, offsetY, state);

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    // Interaction Handlers for Dragging Probes Vertically
    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        let clientX, clientY;
        if ('touches' in e) {
             clientX = e.touches[0].clientX;
             clientY = e.touches[0].clientY;
        } else {
             clientX = (e as React.MouseEvent).clientX;
             clientY = (e as React.MouseEvent).clientY;
        }
        const scaleX = props.width / rect.width;
        const scaleY = props.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        // Only allow dragging if activeTool is Select or Probe
        if (props.activeTool !== 'select' && props.activeTool !== 'probe') return;

        const { x: mouseX, y: mouseY } = getMousePos(e);
        const roomDim = getEffectiveViewType(props) === 'front' ? props.roomWidth : props.roomLength;
        const { ppm, offsetX, offsetY } = getSideLayout(props.width, props.height, props.roomHeight, roomDim);

        // Check Diffusers
        if (props.activeTool === 'select') {
            const diffusers = props.placedDiffusers || [];
            const mountedHeight = Math.max(0, Math.min(props.diffuserHeight, props.roomHeight));
            const yPos = offsetY + (props.roomHeight - mountedHeight) * ppm;

            for (let i = diffusers.length - 1; i >= 0; i--) {
                const d = diffusers[i];
                const pos = getProjectedPos(getEffectiveViewType(props), d);
                const px = offsetX + pos * ppm;
                const py = yPos;
                
                // Diffuser hit area
                const spec = d.performance.spec;
                const r = ((spec?.A || 150) / 2000) * ppm;
                
                if (Math.abs(mouseX - px) < Math.max(20, r) && Math.abs(mouseY - py) < 30) {
                    setIsDragging(true);
                    dragTargetRef.current = { type: 'diffuser', id: d.id };
                    setDragOffset({ x: mouseX - px, z: mouseY - py });
                    props.onSelectDiffuser && props.onSelectDiffuser(d.id, (e as React.MouseEvent).shiftKey);
                    props.onDragStart && props.onDragStart();
                    return;
                }
            }
            
            // If clicked empty space, deselect
            if (props.onSelectDiffuser) props.onSelectDiffuser(null);
        }

        // Check Probes
        const probes = props.probes || [];
        for (let i = probes.length - 1; i >= 0; i--) {
            const p = probes[i];
            const pos = getEffectiveViewType(props) === 'front' ? p.x : p.y;
            const px = offsetX + pos * ppm;
            const py = offsetY + (props.roomHeight - p.z) * ppm;
            
            if (Math.hypot(mouseX - px, mouseY - py) < 15) {
                setIsDragging(true);
                dragTargetRef.current = { type: 'probe', id: p.id };
                setDragOffset({ x: mouseX - px, z: mouseY - py });
                props.onDragStart && props.onDragStart();
                return;
            }
        }

        if (props.activeTool === 'probe' && props.onAddProbe) {
            let newPos = (mouseX - offsetX) / ppm;
            let newZ = props.roomHeight - ((mouseY - offsetY) / ppm);
            
            newPos = Math.max(0, Math.min(roomDim, newPos));
            newZ = Math.max(0, Math.min(props.roomHeight, newZ));
            
            props.onAddProbe(newPos, newZ);
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragTargetRef.current) return;
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const roomDim = getEffectiveViewType(props) === 'front' ? props.roomWidth : props.roomLength;
        const { ppm, offsetX, offsetY } = getSideLayout(props.width, props.height, props.roomHeight, roomDim);

        // Map mouse to X and Z
        let newPos = (mouseX - dragOffset.x - offsetX) / ppm;
        let newScreenY = (mouseY - dragOffset.z);
        // Convert screen Y back to Z (height from floor)
        // screenY = offsetY + (roomH - z) * ppm => z = roomH - (screenY - offsetY)/ppm
        let newZ = props.roomHeight - ((newScreenY - offsetY) / ppm);

        // Clamping
        newPos = Math.max(0, Math.min(roomDim, newPos));
        newZ = Math.max(0, Math.min(props.roomHeight, newZ));

        if (dragTargetRef.current.type === 'probe' && props.onUpdateProbePos) {
            if (getEffectiveViewType(props) === 'front') {
                props.onUpdateProbePos(dragTargetRef.current.id, { x: newPos, z: newZ });
            } else {
                props.onUpdateProbePos(dragTargetRef.current.id, { y: newPos, z: newZ });
            }
        } else if (dragTargetRef.current.type === 'diffuser' && props.onUpdateDiffuserPos) {
            const d = props.placedDiffusers?.find(df => df.id === dragTargetRef.current?.id);
            if (d) {
                if (getEffectiveViewType(props) === 'front') {
                    props.onUpdateDiffuserPos(d.id, newPos, d.y);
                } else {
                    props.onUpdateDiffuserPos(d.id, d.x, newPos);
                }
            }
        }
    };

    const handleEnd = () => {
        if (isDragging) {
            setIsDragging(false);
            dragTargetRef.current = null;
            props.onDragEnd && props.onDragEnd();
        }
    };

    const hasRenderablePlacedDiffuser = (props.placedDiffusers || []).some(isRenderableDiffuser);
    const showUnavailableOverlay = !hasRenderablePlacedDiffuser && !!props.physics.error;

    return (
        <div className="relative w-full h-full">
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className={`block w-full h-full touch-none ${props.activeTool === 'select' || props.activeTool === 'probe' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                style={{ touchAction: 'none' }}
            />
            {showUnavailableOverlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-4 p-8 border border-red-500/30 bg-red-500/5 rounded-3xl text-red-200">
                        <span className="font-bold text-xl tracking-tight">ТИПОРАЗМЕР НЕДОСТУПЕН</span>
                        <span className="text-sm opacity-70">Для выбранной модели нет данных для этого размера</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(SideViewCanvas);