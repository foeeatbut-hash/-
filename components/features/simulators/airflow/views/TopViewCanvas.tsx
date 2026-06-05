
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult, PlacedDiffuser, Probe, ToolMode, GridPoint, SliceState } from '../../../../../types';
import { Trash2, Move, Copy, X } from 'lucide-react';
import { calculateProbeData } from '../../../../../hooks/useSimulation';
import { DIFFUSER_CATALOG } from '../../../../../constants';

interface TopViewCanvasProps {
  width: number; 
  height: number;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  placedDiffusers?: PlacedDiffuser[];
  selectedDiffuserIds?: string[];
  showGrid: boolean;
  simulationField?: GridPoint[][];
  snapToGrid?: boolean;
  gridSnapSize?: number;
  gridStep?: number;
  dragPreview?: {x: number, y: number, width: number, height: number} | null;
  onUpdateDiffuserPos?: (id: string, x: number, y: number) => void;
  onSelectDiffuser?: (id: string | null, multi?: boolean) => void;
  onRemoveDiffuser?: (id: string) => void;
  onDuplicateDiffuser?: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  // Tool Props
  activeTool?: ToolMode;
  setActiveTool?: (mode: ToolMode) => void;
  placementMode?: 'single' | 'multi';
  onAddDiffuserAt?: (x: number, y: number) => void;
  slice?: SliceState;
  onUpdateSlice?: (slice: SliceState) => void;
  // Probe Props
  probes?: Probe[];
  onAddProbe?: (x: number, y: number) => void;
  onRemoveProbe?: (id: string) => void;
  onUpdateProbePos?: (id: string, pos: {x?: number, y?: number, z?: number}) => void;
  
  roomTemp?: number;
  supplyTemp?: number;
  workZoneHeight?: number;
}

const drawRealisticDiffuser2D = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radiusPx: number, modelId: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    
    const strokeColor = ctx.strokeStyle;
    
    ctx.lineWidth = 1.5;
    
    switch (modelId) {
        case 'dpu-m':
        case 'dpu-k':
            ctx.beginPath();
            ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, radiusPx * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, radiusPx * 0.2, 0, Math.PI * 2);
            ctx.stroke();
            
            for (let i = 0; i < 3; i++) {
                const angle = (i * 120 * Math.PI) / 180 - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * (radiusPx * 0.2), Math.sin(angle) * (radiusPx * 0.2));
                ctx.lineTo(Math.cos(angle) * radiusPx, Math.sin(angle) * radiusPx);
                ctx.stroke();
            }
            break;
            
        case 'dpu-v':
            ctx.beginPath();
            ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, radiusPx * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();
            
            const numSlots = 10;
            for (let i = 0; i < numSlots; i++) {
                const angle = (i * Math.PI * 2) / numSlots;
                const startR = radiusPx * 0.4;
                const endR = radiusPx * 0.9;
                const x1 = Math.cos(angle) * startR;
                const y1 = Math.sin(angle) * startR;
                const x2 = Math.cos(angle + 0.4) * endR;
                const y2 = Math.sin(angle + 0.4) * endR;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            break;
            
        case 'dpu-s':
            ctx.beginPath();
            ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, radiusPx * 0.3, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            ctx.stroke();
            break;
            
        default:
            ctx.beginPath();
            ctx.rect(-radiusPx, -radiusPx, radiusPx * 2, radiusPx * 2);
            ctx.fill();
            ctx.stroke();
            break;
    }
    
    ctx.restore();
};

const getTopLayout = (w: number, h: number, rw: number, rl: number) => {
    const padding = 60; 
    const availW = Math.max(10, w - padding * 2);
    const availH = Math.max(10, h - padding * 2);
    const ppm = Math.max(0.1, Math.min(availW / rw, availH / rl));
    const roomPixW = rw * ppm;
    const roomPixH = rl * ppm;
    const originX = (w - roomPixW) / 2;
    const originY = (h - roomPixH) / 2;
    return { ppm, originX, originY };
};

const SLICE_HIT_RADIUS = 15;

const getDiffuserHitSize = (diffuser: PlacedDiffuser, ppm: number) =>
    Math.max((((diffuser.performance?.spec?.A || 0) / 1000) * ppm) || 0, 40);

const TopViewCanvas: React.FC<TopViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isOffscreenDirty = useRef<boolean>(true);
    const simulationRef = useRef(props);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [isStickyDrag, setIsStickyDrag] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0, initialThickness: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
    
    // Drag Target Type
    const dragTargetRef = useRef<{ type: 'diffuser' | 'probe' | 'slice-move' | 'slice-depth', id?: string } | null>(null);

    // Sync Props
    useEffect(() => {
        const prevProps = simulationRef.current;
        simulationRef.current = props;

        if (
            prevProps.width !== props.width ||
            prevProps.height !== props.height ||
            prevProps.roomWidth !== props.roomWidth ||
            prevProps.roomLength !== props.roomLength ||
            prevProps.showGrid !== props.showGrid ||
            prevProps.simulationField !== props.simulationField ||
            prevProps.probes !== props.probes
        ) {
            isOffscreenDirty.current = true;
        }
    }, [props]);

    const updateOffscreenCanvas = (state: TopViewCanvasProps) => {
        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        const cvs = offscreenCanvasRef.current;
        if (cvs.width !== state.width || cvs.height !== state.height) {
            cvs.width = state.width;
            cvs.height = state.height;
        }
        const ctx = cvs.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.fillStyle = '#030304'; 
        ctx.fillRect(0, 0, state.width, state.height);

        const { ppm, originX, originY } = getTopLayout(state.width, state.height, state.roomWidth, state.roomLength);

        const roomPixW = state.roomWidth * ppm;
        const roomPixL = state.roomLength * ppm;
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(originX, originY, roomPixW, roomPixL);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(originX, originY, roomPixW, roomPixL);

        if (state.showGrid) {
            const rw = state.roomWidth;
            const rl = state.roomLength;
            const gStep = state.gridStep || 0.1;

            if (gStep < 0.2) {
                ctx.beginPath();
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                for (let x = 0; x <= rw; x += 0.1) {
                    if (Math.abs(x % 1) > 0.01) { 
                        const px = x * ppm;
                        ctx.moveTo(originX + px, originY);
                        ctx.lineTo(originX + px, originY + roomPixL);
                    }
                }
                for (let y = 0; y <= rl; y += 0.1) {
                    if (Math.abs(y % 1) > 0.01) {
                        const py = y * ppm;
                        ctx.moveTo(originX, originY + py);
                        ctx.lineTo(originX + roomPixW, originY + py);
                    }
                }
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; 
            for (let x = 0; x <= rw; x += 1) {
                const px = x * ppm;
                ctx.moveTo(originX + px, originY);
                ctx.lineTo(originX + px, originY + roomPixL);
            }
            for (let y = 0; y <= rl; y += 1) {
                const py = y * ppm;
                ctx.moveTo(originX, originY + py);
                ctx.lineTo(originX + roomPixW, originY + py);
            }
            ctx.stroke();
        }
        
        isOffscreenDirty.current = false;
    };

    const drawProbe = (ctx: CanvasRenderingContext2D, probe: Probe, ppm: number, originX: number, originY: number, state: TopViewCanvasProps) => {
        const cx = originX + probe.x * ppm;
        const cy = originY + probe.y * ppm;
        
        const data = calculateProbeData(
            probe, 
            state.placedDiffusers || [], 
            state.roomTemp || 24, 
            state.supplyTemp || 20,
            state.roomWidth,
            state.roomLength,
            state.roomHeight
        );
        
        let color = '#34d399'; 
        if (data.dr >= 15) color = '#fbbf24'; 
        if (data.dr >= 25) color = '#f87171'; 

        // Draw Arrow Vector
        if (data.v > 0.05) {
            const arrowLen = 20 + data.v * 10;
            const endX = cx + Math.cos(data.angle) * arrowLen;
            const endY = cy + Math.sin(data.angle) * arrowLen;
            
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            const headLen = 6;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headLen * Math.cos(data.angle - Math.PI / 6), endY - headLen * Math.sin(data.angle - Math.PI / 6));
            ctx.lineTo(endX - headLen * Math.cos(data.angle + Math.PI / 6), endY - headLen * Math.sin(data.angle + Math.PI / 6));
            ctx.fillStyle = color;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        const badgeW = 96;
        const badgeH = 36;
        const bx = cx + 12;
        const by = cy - 36;
        
        // Make probe semi-transparent if it's far from the current work zone height slice
        const zDiff = Math.abs(probe.z - (state.workZoneHeight || 1.5));
        ctx.globalAlpha = zDiff > 0.5 ? 0.5 : 1.0;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; 
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 10px Inter, sans-serif';
        
        ctx.fillStyle = '#94a3b8';
        ctx.fillText("V:", bx + 8, by + 14);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${data.v.toFixed(2)} м/с`, bx + 28, by + 14);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText("T:", bx + 8, by + 28);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${data.t.toFixed(1)}°C`, bx + 28, by + 28);
        
        ctx.globalAlpha = 1.0; // Reset alpha
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height } = state;

        if (isOffscreenDirty.current) {
            updateOffscreenCanvas(state);
        }

        if (offscreenCanvasRef.current) {
            ctx.drawImage(offscreenCanvasRef.current, 0, 0);
        } else {
            ctx.fillStyle = '#030304';
            ctx.fillRect(0, 0, width, height);
        }

        const { ppm, originX, originY } = getTopLayout(width, height, state.roomWidth, state.roomLength);

        state.placedDiffusers?.forEach(d => {
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;

            const rPx = Math.max(0, (d.performance?.coverageRadius || 0) * ppm);
            const v = d.performance?.workzoneVelocity || 0;

            let fillStyle = 'rgba(16, 185, 129, 0.15)';
            let strokeStyle = 'rgba(16, 185, 129, 0.4)';

            if (v > 0.5) {
                fillStyle = 'rgba(239, 68, 68, 0.15)';
                strokeStyle = 'rgba(239, 68, 68, 0.4)';
            } else if (v > 0.25) {
                fillStyle = 'rgba(245, 158, 11, 0.15)';
                strokeStyle = 'rgba(245, 158, 11, 0.4)';
            }

            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(0, rPx), 0, Math.PI * 2);
            ctx.fillStyle = fillStyle;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();

            const dSize = ((d.performance?.spec?.B || d.performance?.spec?.A || 0) / 1000) * ppm || 20;

            if (state.selectedDiffuserIds?.includes(d.id)) {
                ctx.fillStyle = '#3b82f6';
                ctx.strokeStyle = '#fff';
            } else {
                ctx.fillStyle = '#475569';
                ctx.strokeStyle = '#94a3b8';
            }

            drawRealisticDiffuser2D(ctx, cx, cy, dSize / 2, d.modelId);
        });

        if (state.slice?.isActive) {
            const { axis, position, depth, direction } = state.slice;
            const posPx = (axis === 'x' ? originX : originY) + position * ppm;
            const depthPx = depth * ppm;
            
            ctx.save();
            
            // UI Constants for slice
            const accentColor = '#3b82f6';
            const btnRadius = 12;

            const drawSliceUI = (isVertical: boolean) => {
                const length = (isVertical ? state.roomLength : state.roomWidth) * ppm;
                const start = isVertical ? originY : originX;
                const end = start + length;
                const fixedPos = posPx;

                // 1. Depth Zone (Extremely transparent)
                ctx.fillStyle = 'rgba(59, 130, 246, 0.02)'; // Even more subtle
                if (isVertical) {
                    ctx.fillRect(Math.min(fixedPos, fixedPos + depthPx * direction), originY, Math.abs(depthPx), length);
                } else {
                    ctx.fillRect(originX, Math.min(fixedPos, fixedPos + depthPx * direction), length, Math.abs(depthPx));
                }

                // 2. Depth Boundary Line (Dashed)
                ctx.beginPath();
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                ctx.lineWidth = 1;
                const boundaryPos = fixedPos + depthPx * direction;
                if (isVertical) {
                    ctx.moveTo(boundaryPos, start);
                    ctx.lineTo(boundaryPos, end);
                } else {
                    ctx.moveTo(start, boundaryPos);
                    ctx.lineTo(end, boundaryPos);
                }
                ctx.stroke();
                ctx.setLineDash([]);

                // 3. Main Slice Line
                ctx.beginPath();
                ctx.strokeStyle = accentColor;
                ctx.lineWidth = 2;
                if (isVertical) {
                    ctx.moveTo(fixedPos, start);
                    ctx.lineTo(fixedPos, end);
                } else {
                    ctx.moveTo(start, fixedPos);
                    ctx.lineTo(end, fixedPos);
                }
                ctx.stroke();

                // 4. Buttons at ends
                const drawButton = (bx: number, by: number, type: 'flip' | 'rotate') => {
                    // Button Circle
                    ctx.beginPath();
                    ctx.arc(bx, by, btnRadius, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(0,0,0,0.12)';
                    ctx.fill();
                    ctx.strokeStyle = accentColor;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Icon
                    ctx.save();
                    ctx.translate(bx, by);
                    ctx.strokeStyle = accentColor;
                    ctx.fillStyle = accentColor;
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    if (type === 'flip') {
                        // Arrow icon
                        const arrowDir = direction;
                        if (isVertical) {
                            ctx.rotate(arrowDir === 1 ? 0 : Math.PI);
                        } else {
                            ctx.rotate(arrowDir === 1 ? Math.PI / 2 : -Math.PI / 2);
                        }
                        ctx.beginPath();
                        ctx.moveTo(-3, -2);
                        ctx.lineTo(3, -2);
                        ctx.lineTo(0, 3);
                        ctx.closePath();
                        ctx.fill();
                    } else {
                        // Rotate icon (more elegant)
                        ctx.beginPath();
                        ctx.arc(0, 0, 4, 0, Math.PI * 1.6);
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.moveTo(2, -5);
                        ctx.lineTo(5, -3);
                        ctx.lineTo(2, -1);
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.restore();
                };

                const margin = 40;
                const spacing = 35;
                if (isVertical) {
                    drawButton(fixedPos, start + margin, 'flip');
                    drawButton(fixedPos, start + margin + spacing, 'rotate');
                    drawButton(fixedPos, end - margin, 'flip');
                    drawButton(fixedPos, end - margin - spacing, 'rotate');
                } else {
                    drawButton(start + margin, fixedPos, 'flip');
                    drawButton(start + margin + spacing, fixedPos, 'rotate');
                    drawButton(end - margin, fixedPos, 'flip');
                    drawButton(end - margin - spacing, fixedPos, 'rotate');
                }
            };

            if (axis === 'y') {
                drawSliceUI(false);
            } else {
                drawSliceUI(true);
            }

            ctx.restore();
        }

        state.probes?.forEach(p => {
            drawProbe(ctx, p, ppm, originX, originY, state);
        });

        if (state.dragPreview) {
            const cx = originX + state.dragPreview.x * ppm;
            const cy = originY + state.dragPreview.y * ppm;
            const wPx = state.dragPreview.width * ppm; 
            const hPx = state.dragPreview.height * ppm;
            
            ctx.beginPath();
            ctx.rect(cx - wPx/2, cy - hPx/2, wPx, hPx);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

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

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (props.activeTool !== 'select') return;

        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getTopLayout(props.width, props.height, props.roomWidth, props.roomLength);

        let hitId = null;
        const diffusers = props.placedDiffusers || [];
        for (let i = diffusers.length - 1; i >= 0; i--) {
            const d = diffusers[i];
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            const hitSize = getDiffuserHitSize(d, ppm); 
            
            if (mouseX >= cx - hitSize/2 && mouseX <= cx + hitSize/2 && 
                mouseY >= cy - hitSize/2 && mouseY <= cy + hitSize/2) {
                hitId = d.id;
                break;
            }
        }

        if (hitId) {
            setContextMenu({ x: e.clientX, y: e.clientY, id: hitId });
            props.onSelectDiffuser && props.onSelectDiffuser(hitId);
        } else {
            setContextMenu(null);
        }
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if ('button' in e && e.button !== 0) return;
        
        if (isStickyDrag) {
            setIsDragging(false);
            setIsStickyDrag(false);
            props.onDragEnd && props.onDragEnd();
            setContextMenu(null);
            dragTargetRef.current = null;
            return;
        }

        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getTopLayout(props.width, props.height, props.roomWidth, props.roomLength);

        if (props.slice?.isActive && props.onUpdateSlice) {
            const { axis, position, depth, direction } = props.slice;
            const posPx = (axis === 'x' ? originX : originY) + position * ppm;
            const depthPx = depth * ppm;
            
            const SLICE_HIT_RADIUS = 10;
            const EDGE_HIT_RADIUS = 10;

            if (axis === 'y') {
                const startY = posPx;
                const endY = posPx + depthPx * direction;
                const margin = 40;
                const spacing = 35;
                
                // Check click on direction arrows (flip)
                const arrowX1 = originX + margin;
                const arrowX2 = originX + props.roomWidth * ppm - margin;
                if (Math.abs(mouseY - startY) <= 15 && (Math.abs(mouseX - arrowX1) <= 15 || Math.abs(mouseX - arrowX2) <= 15)) {
                    props.onUpdateSlice({ ...props.slice, direction: direction === 1 ? -1 : 1 });
                    return;
                }

                // Check click on rotation icons
                const rotX1 = originX + margin + spacing;
                const rotX2 = originX + props.roomWidth * ppm - margin - spacing;
                if (Math.abs(mouseY - startY) <= 15 && (Math.abs(mouseX - rotX1) <= 15 || Math.abs(mouseX - rotX2) <= 15)) {
                    props.onUpdateSlice({ 
                        ...props.slice, 
                        axis: 'x',
                        position: props.roomWidth / 2
                    });
                    return;
                }

                // Check depth edge
                if (Math.abs(mouseY - endY) <= EDGE_HIT_RADIUS) {
                    setIsDragging(true);
                    dragTargetRef.current = { type: 'slice-depth' };
                    setDragOffset({ x: 0, y: mouseY - endY, initialThickness: depth });
                    return;
                }

                // Check slice line
                if (Math.abs(mouseY - startY) <= SLICE_HIT_RADIUS) {
                    setIsDragging(true);
                    dragTargetRef.current = { type: 'slice-move' };
                    setDragOffset({ x: 0, y: mouseY - startY, initialThickness: 0 });
                    return;
                }
            } else {
                const startX = posPx;
                const endX = posPx + depthPx * direction;
                const margin = 40;
                const spacing = 35;

                // Check click on direction arrows (flip)
                const arrowY1 = originY + margin;
                const arrowY2 = originY + props.roomLength * ppm - margin;
                if (Math.abs(mouseX - startX) <= 15 && (Math.abs(mouseY - arrowY1) <= 15 || Math.abs(mouseY - arrowY2) <= 15)) {
                    props.onUpdateSlice({ ...props.slice, direction: direction === 1 ? -1 : 1 });
                    return;
                }

                // Check click on rotation icons
                const rotY1 = originY + margin + spacing;
                const rotY2 = originY + props.roomLength * ppm - margin - spacing;
                if (Math.abs(mouseX - startX) <= 15 && (Math.abs(mouseY - rotY1) <= 15 || Math.abs(mouseY - rotY2) <= 15)) {
                    props.onUpdateSlice({ 
                        ...props.slice, 
                        axis: 'y',
                        position: props.roomLength / 2
                    });
                    return;
                }

                // Check depth edge
                if (Math.abs(mouseX - endX) <= EDGE_HIT_RADIUS) {
                    setIsDragging(true);
                    dragTargetRef.current = { type: 'slice-depth' };
                    setDragOffset({ x: mouseX - endX, y: 0, initialThickness: depth });
                    return;
                }

                // Check slice line
                if (Math.abs(mouseX - startX) <= SLICE_HIT_RADIUS) {
                    setIsDragging(true);
                    dragTargetRef.current = { type: 'slice-move' };
                    setDragOffset({ x: mouseX - startX, y: 0, initialThickness: 0 });
                    return;
                }
            }
        }

        switch (props.activeTool) {
            case 'select':
            case 'probe': {
                if (props.activeTool === 'select' && props.placementMode === 'multi' && props.onAddDiffuserAt) {
                    let newX = (mouseX - originX) / ppm;
                    let newY = (mouseY - originY) / ppm;
                    
                    if (props.snapToGrid && props.gridSnapSize) {
                        newX = Math.round(newX / props.gridSnapSize) * props.gridSnapSize;
                        newY = Math.round(newY / props.gridSnapSize) * props.gridSnapSize;
                    }
                    
                    if (newX >= 0 && newX <= props.roomWidth && newY >= 0 && newY <= props.roomLength) {
                        props.onAddDiffuserAt(newX, newY);
                        return;
                    }
                }

                const probes = props.probes || [];
                for (let i = probes.length - 1; i >= 0; i--) {
                    const p = probes[i];
                    const cx = originX + p.x * ppm;
                    const cy = originY + p.y * ppm;
                    if (Math.hypot(mouseX - cx, mouseY - cy) < 15) { 
                        dragTargetRef.current = { type: 'probe', id: p.id };
                        setIsDragging(true);
                        setDragOffset({ x: mouseX - cx, y: mouseY - cy, initialThickness: 0 });
                        return;
                    }
                }

                if (props.activeTool === 'probe') {
                    if (props.onAddProbe) {
                        const newX = (mouseX - originX) / ppm;
                        const newY = (mouseY - originY) / ppm;
                        if (newX >= 0 && newX <= props.roomWidth && newY >= 0 && newY <= props.roomLength) {
                            props.onAddProbe(newX, newY);
                        }
                    }
                    return;
                }

                let hitId = null;
                const diffusers = props.placedDiffusers || [];
                for (let i = diffusers.length - 1; i >= 0; i--) {
                    const d = diffusers[i];
                    const cx = originX + d.x * ppm;
                    const cy = originY + d.y * ppm;
                    const hitSize = getDiffuserHitSize(d, ppm); 
                    
                    if (mouseX >= cx - hitSize/2 && mouseX <= cx + hitSize/2 && 
                        mouseY >= cy - hitSize/2 && mouseY <= cy + hitSize/2) {
                        hitId = d.id;
                        break;
                    }
                }

                if (hitId) {
                    props.onSelectDiffuser && props.onSelectDiffuser(hitId, 'shiftKey' in e ? e.shiftKey : false);
                    setIsDragging(true);
                    props.onDragStart && props.onDragStart();
                    dragTargetRef.current = { type: 'diffuser', id: hitId };
                    const d = diffusers.find(d => d.id === hitId);
                    if(d) {
                        const cx = originX + d.x * ppm;
                        const cy = originY + d.y * ppm;
                        setDragOffset({ x: mouseX - cx, y: mouseY - cy, initialThickness: 0 });
                    }
                } else {
                    props.onSelectDiffuser && props.onSelectDiffuser(null); 
                }
                break;
            }

            case 'stamp': {
                if (props.onAddDiffuserAt) {
                    let newX = (mouseX - originX) / ppm;
                    let newY = (mouseY - originY) / ppm;
                    
                    if (props.snapToGrid && props.gridSnapSize) {
                        newX = Math.round(newX / props.gridSnapSize) * props.gridSnapSize;
                        newY = Math.round(newY / props.gridSnapSize) * props.gridSnapSize;
                    }
                    
                    if (newX >= 0 && newX <= props.roomWidth && newY >= 0 && newY <= props.roomLength) {
                        props.onAddDiffuserAt(newX, newY);
                        // Не сбрасываем activeTool, позволяем ставить еще
                    }
                }
                break;
            }

            case 'measure': {
                console.log('Measure tool clicked at', mouseX, mouseY);
                break;
            }

            case 'pipette': {
                console.log('Pipette tool clicked at', mouseX, mouseY);
                break;
            }
        }
        
        setContextMenu(null);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getTopLayout(props.width, props.height, props.roomWidth, props.roomLength);

        if (!isDragging) {
            if (props.slice?.isActive && canvasRef.current) {
                const { axis, position, depth, direction } = props.slice;
                const posPx = (axis === 'x' ? originX : originY) + position * ppm;
                const depthPx = depth * ppm;
                
                const SLICE_HIT_RADIUS = 10;
                const EDGE_HIT_RADIUS = 10;

                let cursor = '';

                if (axis === 'y') {
                    const startY = posPx;
                    const endY = posPx + depthPx * direction;
                    const margin = 40;
                    const spacing = 35;
                    
                    const arrowX1 = originX + margin;
                    const arrowX2 = originX + props.roomWidth * ppm - margin;
                    const rotX1 = originX + margin + spacing;
                    const rotX2 = originX + props.roomWidth * ppm - margin - spacing;
                    
                    if (Math.abs(mouseY - startY) <= 15 && (
                        Math.abs(mouseX - arrowX1) <= 15 || 
                        Math.abs(mouseX - arrowX2) <= 15 ||
                        Math.abs(mouseX - rotX1) <= 15 ||
                        Math.abs(mouseX - rotX2) <= 15
                    )) {
                        cursor = 'pointer';
                    } else if (Math.abs(mouseY - endY) <= EDGE_HIT_RADIUS) {
                        cursor = 'ns-resize';
                    } else if (Math.abs(mouseY - startY) <= SLICE_HIT_RADIUS) {
                        cursor = 'ns-resize';
                    }
                } else {
                    const startX = posPx;
                    const endX = posPx + depthPx * direction;
                    const margin = 40;
                    const spacing = 35;
                    
                    const arrowY1 = originY + margin;
                    const arrowY2 = originY + props.roomLength * ppm - margin;
                    const rotY1 = originY + margin + spacing;
                    const rotY2 = originY + props.roomLength * ppm - margin - spacing;
                    
                    if (Math.abs(mouseX - startX) <= 15 && (
                        Math.abs(mouseY - arrowY1) <= 15 || 
                        Math.abs(mouseY - arrowY2) <= 15 ||
                        Math.abs(mouseY - rotY1) <= 15 ||
                        Math.abs(mouseY - rotY2) <= 15
                    )) {
                        cursor = 'pointer';
                    } else if (Math.abs(mouseX - endX) <= EDGE_HIT_RADIUS) {
                        cursor = 'ew-resize';
                    } else if (Math.abs(mouseX - startX) <= SLICE_HIT_RADIUS) {
                        cursor = 'ew-resize';
                    }
                }
                
                canvasRef.current.style.cursor = cursor;
            }
            return;
        }

        if (!dragTargetRef.current) return;
        
        const rw = props.roomWidth;
        const rl = props.roomLength;

        const SNAP_RADIUS = 0.4;

        if (dragTargetRef.current.type === 'slice-move' && props.slice && props.onUpdateSlice) {
            const { axis } = props.slice;
            let newPos = 0;
            
            if (axis === 'y') {
                newPos = Math.max(0, Math.min(rl, (mouseY - dragOffset.y - originY) / ppm));
                if (props.placedDiffusers) {
                    for (const d of props.placedDiffusers) {
                        if (Math.abs(d.y - newPos) < SNAP_RADIUS) {
                            newPos = d.y;
                            break;
                        }
                    }
                }
            } else {
                newPos = Math.max(0, Math.min(rw, (mouseX - dragOffset.x - originX) / ppm));
                if (props.placedDiffusers) {
                    for (const d of props.placedDiffusers) {
                        if (Math.abs(d.x - newPos) < SNAP_RADIUS) {
                            newPos = d.x;
                            break;
                        }
                    }
                }
            }
            
            props.onUpdateSlice({ ...props.slice, position: newPos });
            return;
        }

        if (dragTargetRef.current.type === 'slice-depth' && props.slice && props.onUpdateSlice) {
            const { axis, position, direction } = props.slice;
            let newDepth = 0;
            
            if (axis === 'y') {
                const newEndY = (mouseY - dragOffset.y - originY) / ppm;
                newDepth = (newEndY - position) * direction;
            } else {
                const newEndX = (mouseX - dragOffset.x - originX) / ppm;
                newDepth = (newEndX - position) * direction;
            }
            
            newDepth = Math.max(0.2, newDepth); // Minimum depth
            props.onUpdateSlice({ ...props.slice, depth: newDepth });
            return;
        }

        let newX = (mouseX - dragOffset.x - originX) / ppm;
        let newY = (mouseY - dragOffset.y - originY) / ppm;

        if (props.snapToGrid && props.gridSnapSize) {
            newX = Math.round(newX / props.gridSnapSize) * props.gridSnapSize;
            newY = Math.round(newY / props.gridSnapSize) * props.gridSnapSize;
        }
        
        newX = Math.max(0, Math.min(rw, newX));
        newY = Math.max(0, Math.min(rl, newY));

        if (dragTargetRef.current.type === 'diffuser' && dragTargetRef.current.id && props.onUpdateDiffuserPos) {
            props.onUpdateDiffuserPos(dragTargetRef.current.id, newX, newY);
        } else if (dragTargetRef.current.type === 'probe' && dragTargetRef.current.id && props.onUpdateProbePos) {
            props.onUpdateProbePos(dragTargetRef.current.id, { x: newX, y: newY });
        }
    };

    const handleEnd = () => {
        if (!isStickyDrag) {
            setIsDragging(false);
            dragTargetRef.current = null;
            props.onDragEnd && props.onDragEnd();
        }
    };

    const handleContextAction = (action: 'move' | 'delete' | 'duplicate') => {
        if (!contextMenu) return;
        
        if (action === 'move') {
            props.onSelectDiffuser && props.onSelectDiffuser(contextMenu.id);
            setIsDragging(true);
            setIsStickyDrag(true);
            dragTargetRef.current = { type: 'diffuser', id: contextMenu.id };
            props.onDragStart && props.onDragStart();
            setDragOffset({ x: 0, y: 0, initialThickness: 0 }); 
        } else if (action === 'delete' && props.onRemoveDiffuser) {
            props.onRemoveDiffuser(contextMenu.id);
        } else if (action === 'duplicate' && props.onDuplicateDiffuser) {
            props.onDuplicateDiffuser(contextMenu.id);
            // Убрали авто-захват (isDragging), так как мы не знаем ID нового объекта в этом контексте.
            // Объект просто появится рядом, и пользователь сможет сам его захватить.
        }
        setContextMenu(null);
    };

    const getCursorStyle = () => {
        switch (props.activeTool) {
            case 'probe': return 'cursor-crosshair';
            case 'measure': return 'cursor-text'; 
            case 'pipette': return 'cursor-help';
            case 'select': return isDragging ? 'cursor-grabbing' : 'cursor-default';
            default: return 'cursor-default';
        }
    };

    const getDiffuserLabel = (modelId: string) => {
        const model = DIFFUSER_CATALOG.find(m => m.id === modelId);
        return model ? model.series : modelId;
    };

    return (
        <div className="relative w-full h-full">
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className={`block w-full h-full touch-none ${getCursorStyle()}`}
                onContextMenu={handleContextMenu}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                style={{ touchAction: 'none' }}
            />

            {contextMenu && (
                <div 
                    className="fixed z-50 bg-[#1a1b26]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 flex flex-col min-w-[200px] animate-in zoom-in-95 duration-200 origin-top-left backdrop-blur-xl"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {/* INFO SECTION (Merged into Menu) */}
                    {(() => {
                        const d = props.placedDiffusers?.find(x => x.id === contextMenu.id);
                        if (!d) return null;
                        const model = DIFFUSER_CATALOG.find(m => m.id === d.modelId);
                        return (
                            <div className="p-3 bg-white/5 rounded-xl mb-1.5 border border-white/5 mx-1.5 mt-1.5">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">{model?.series}</div>
                                        <div className="text-sm font-black text-white leading-none">Ø{d.diameter} <span className="text-[10px] text-slate-400 font-medium">мм</span></div>
                                    </div>
                                    <div className="text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded-lg border border-white/5">{d.volume} м³/ч</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                                    <div>
                                        <div className="text-[9px] text-slate-500 font-bold uppercase">Скорость</div>
                                        <div className="text-xs font-bold text-white">{d.performance.v0.toFixed(2)} м/с</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-slate-500 font-bold uppercase">Т° Потока</div>
                                        <div className="text-xs font-bold text-white">{typeof d.temperature === 'number' ? d.temperature.toFixed(1) : (props.supplyTemp || 0).toFixed(1)}°C</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="px-3 py-1.5 border-b border-white/5 mb-1 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Действия</span>
                        <button onClick={() => setContextMenu(null)} className="text-slate-500 hover:text-white transition-colors"><X size={12}/></button>
                    </div>
                    
                    <button onClick={() => handleContextAction('duplicate')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left mx-1">
                        <Copy size={14} className="text-emerald-400" />
                        <span>Дублировать</span>
                    </button>
                    <button onClick={() => handleContextAction('delete')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors text-left mx-1 mb-1">
                        <Trash2 size={14} />
                        <span>Удалить</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default React.memo(TopViewCanvas);
