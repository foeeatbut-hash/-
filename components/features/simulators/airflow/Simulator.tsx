
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, useDragControls } from 'motion/react';
import { Play, Pause, Power, Info, Menu, GripVertical, Grid as GridIcon, Thermometer, Box, Scan, MousePointer2, MousePointerClick, Ruler, Eye, HelpCircle, Layers, Maximize, Square, GripHorizontal, Download, SplitSquareHorizontal, RotateCw } from 'lucide-react';
import { SimulatorLeftPanel } from './SimulatorLeftPanel';
import { SimulatorRightPanel } from './SimulatorRightPanel';
import DiffuserCanvas from './DiffuserCanvas';
import { useScientificSimulation, calculateScientificPerformanceResult, calculateSimulationField, analyzeField } from '../../../../hooks/useSimulation';
import { PlacedDiffuser, Probe, ToolMode, SliceState } from '../../../../types';
import { GlassButton } from '../../../ui/Shared';
import { DIFFUSER_CATALOG, getDiffuserFlowType, getDiffuserPerformanceFlowType } from '../../../../constants';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

const buildPlacedDiffuserPerformance = (
    diffuser: Pick<PlacedDiffuser, 'modelId' | 'modeIdx' | 'diameter' | 'volume' | 'temperature'>,
    roomTemp: number,
    diffuserHeight: number,
    workZoneHeight: number
) => {
    const performanceFlowType = getDiffuserPerformanceFlowType(diffuser.modelId, diffuser.modeIdx ?? 0);
    return calculateScientificPerformanceResult(
        diffuser.modelId,
        performanceFlowType,
        diffuser.diameter,
        diffuser.volume,
        diffuser.temperature,
        roomTemp,
        diffuserHeight,
        workZoneHeight
    );
};

const INITIAL_PARAMS = {
    modelId: 'dpu-m',
    diameter: 200 as number | string,
    volume: 600,
    temperature: 20,
    roomTemp: 24,
    roomWidth: 6,
    roomLength: 6,
    roomHeight: 3.5,
    diffuserHeight: 3.5,
    workZoneHeight: 1.5,
    modeIdx: 0,
    isCeilingMounted: true
};

const Simulator = ({ onBack, onHome }: any) => {
    const dragControls = useDragControls();
    const toolbarRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = toolbarRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        // Also enable touch sliding
        let touchStartX = 0;
        let scrollStartX = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
            scrollStartX = el.scrollLeft;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const touchX = e.touches[0].clientX;
            const diff = touchStartX - touchX;
            el.scrollLeft = scrollStartX + diff;
        };
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: true });
        return () => {
            el.removeEventListener('wheel', handleWheel);
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    // --- STATE ---
    const [params, setParams] = useLocalStorage<typeof INITIAL_PARAMS>('hvac-sim-params', INITIAL_PARAMS);

    const [viewMode, setViewMode] = useState<'front' | 'right' | 'top' | '3d'>('top');
    const [isPowerOn, setIsPowerOn] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    
    // Tools
    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const [placementMode, setPlacementMode] = useState<'single' | 'multi'>('single');

    // Objects
    const [placedDiffusers, setPlacedDiffusers] = useLocalStorage<PlacedDiffuser[]>('hvac-sim-diffusers', []);
    
    useEffect(() => {
        if (placedDiffusers.length === 0 && viewMode !== 'top') {
            setViewMode('top');
        }
    }, [placedDiffusers.length, viewMode]);

    const [selectedDiffuserIds, setSelectedDiffuserIds] = useState<string[]>([]);
    const [probes, setProbes] = useLocalStorage<Probe[]>('hvac-sim-probes', []);
    const [slice, setSlice] = useLocalStorage<SliceState>('hvac-sim-slice', {
        isActive: false,
        axis: 'y',
        position: INITIAL_PARAMS.roomLength / 2,
        depth: 1.5,
        direction: 1
    });

    // UI State
    const [openSection, setOpenSection] = useState<string | null>('distributor');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
    const [sizeSelected, setSizeSelected] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const [viewSize, setViewSize] = useState({ w: 800, h: 600 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateViewSize = () => {
            const rect = container.getBoundingClientRect();
            const nextSize = {
                w: Math.max(1, Math.floor(rect.width)),
                h: Math.max(1, Math.floor(rect.height))
            };

            setViewSize(prev => (prev.w === nextSize.w && prev.h === nextSize.h ? prev : nextSize));
        };

        updateViewSize();

        const observer = new ResizeObserver(updateViewSize);
        observer.observe(container);
        window.addEventListener('resize', updateViewSize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateViewSize);
        };
    }, []);

    const visualFlowType = useMemo(
        () => getDiffuserFlowType(params.modelId, params.modeIdx),
        [params.modelId, params.modeIdx]
    );
    const performanceFlowType = useMemo(
        () => getDiffuserPerformanceFlowType(params.modelId, params.modeIdx),
        [params.modelId, params.modeIdx]
    );

    const physics = useScientificSimulation(
        params.modelId,
        performanceFlowType,
        params.diameter,
        params.volume,
        params.temperature,
        params.roomTemp,
        params.diffuserHeight,
        params.workZoneHeight
    );


    // 2. Simulation Field (Top View Grid)
    const simulationField = useMemo(() => {
        if (placedDiffusers.length === 0) return [];

        return calculateSimulationField(
            params.roomWidth,
            params.roomLength,
            placedDiffusers,
            params.diffuserHeight,
            params.workZoneHeight,
            0.5,
            params.temperature,
            params.roomTemp,
            params.isCeilingMounted
        );
    }, [
        placedDiffusers,
        params.roomWidth,
        params.roomLength,
        params.diffuserHeight,
        params.workZoneHeight,
        params.temperature,
        params.roomTemp,
        params.isCeilingMounted
    ]);

    // 3. Global Stats
    const topViewStats = useMemo(() => {
        const analysis = analyzeField(simulationField);
        const totalNoisePower = placedDiffusers.reduce((acc, d) => acc + Math.pow(10, d.performance.noise / 10), 0);
        const maxNoise = totalNoisePower > 0 ? 10 * Math.log10(totalNoisePower) : 0;

        let tSum = 0;
        let count = 0;
        // Реальная область пересечения потока с рабочей зоной (v ≥ 0.2 м/с).
        const WZ_THRESHOLD = 0.2;
        const cellArea = 0.5 * 0.5; // шаг сетки calculateSimulationField
        let coveredCells = 0;
        let wzVSum = 0;
        let wzVMax = 0;
        simulationField.flat().forEach(pt => {
            if (pt) {
                tSum += pt.t;
                count++;
                if (pt.v >= WZ_THRESHOLD) {
                    coveredCells++;
                    wzVSum += pt.v;
                    if (pt.v > wzVMax) wzVMax = pt.v;
                }
            }
        });
        const avgTemp = count > 0 ? tSum / count : params.roomTemp;
        const roomArea = params.roomWidth * params.roomLength;
        const workzoneArea = coveredCells * cellArea;

        return {
            maxNoise,
            calcTemp: avgTemp,
            coverage: analysis.totalCoverage,
            adpi: analysis.adpi,
            avgVelocity: analysis.avgVelocity,
            comfortZones: analysis.comfortZones,
            warningZones: analysis.warningZones,
            draftZones: analysis.draftZones,
            deadZones: analysis.deadZones,
            // Метрики «реальной области» рабочей зоны (едины с планом).
            workzoneArea,
            workzoneCoveragePct: roomArea > 0 ? (workzoneArea / roomArea) * 100 : 0,
            workzoneVAvg: coveredCells > 0 ? wzVSum / coveredCells : 0,
            workzoneVMax: wzVMax
        };
    }, [simulationField, placedDiffusers, params.roomTemp]);

    // Динамический пересчет физики всех диффузоров при изменении параметров помещения
    useEffect(() => {
        if (placedDiffusers.length === 0) return;
        
        setPlacedDiffusers(prev => prev.map(d => ({
            ...d,
            performance: buildPlacedDiffuserPerformance(
                d, // диффузор сохраняет свои личные настройки температуры, расхода и модели
                params.roomTemp, // новая глобальная температура комнаты
                params.diffuserHeight, // новая высота
                params.workZoneHeight
            )
        })));
    }, [params.roomTemp, params.diffuserHeight, params.workZoneHeight]);

    // --- HANDLERS ---
    // Clamp placed objects and section lines to room bounds
    useEffect(() => {
        const margin = 0.5;

        setPlacedDiffusers(prev => prev.map(d => ({
            ...d,
            x: Math.min(Math.max(d.x, margin), params.roomWidth - margin),
            y: Math.min(Math.max(d.y, margin), params.roomLength - margin)
        })));

        setProbes(prev => prev.map(p => ({
            ...p,
            x: Math.min(Math.max(p.x, 0.1), params.roomWidth - 0.1),
            y: Math.min(Math.max(p.y, 0.1), params.roomLength - 0.1)
        })));

        setSlice(prev => ({
            ...prev,
            position: Math.min(Math.max(prev.position, 0), prev.axis === 'x' ? params.roomWidth : params.roomLength)
        }));
    }, [params.roomWidth, params.roomLength]);

    // Удаление выделенных объектов клавишей Delete / Backspace
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Игнорируем нажатия, если пользователь печатает в input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedDiffuserIds.length > 0) {
                    setPlacedDiffusers(prev => prev.filter(d => !selectedDiffuserIds.includes(d.id)));
                    setSelectedDiffuserIds([]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDiffuserIds]);

    const handleParameterChange = (key: keyof typeof INITIAL_PARAMS, value: any) => {
        // 1. Всегда обновляем UI-стейт панели
        setParams(prev => ({ ...prev, [key]: value }));

        // 2. Если есть выделенные объекты — применяем изменения к ним
        if (selectedDiffuserIds.length > 0) {
            setPlacedDiffusers(prev => prev.map(d => {
                if (selectedDiffuserIds.includes(d.id)) {
                    const updatedDiffuser = { ...d, [key]: value };
                    updatedDiffuser.performance = buildPlacedDiffuserPerformance(
                        updatedDiffuser,
                        params.roomTemp,
                        params.diffuserHeight,
                        params.workZoneHeight
                    );
                    return updatedDiffuser;
                }
                return d;
            }));
        }
    };

    const handleSelectDiffuser = (id: string | null, multi: boolean = false) => {
        if (!id) {
            // Клик в пустоту - снимаем выделение
            setSelectedDiffuserIds([]);
            return;
        }

        if (multi) {
            setSelectedDiffuserIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedDiffuserIds([id]);
            
            // Синхронизация левой панели с выбранным объектом
            const selected = placedDiffusers.find(d => d.id === id);
            if (selected) {
                setParams(prev => ({
                    ...prev,
                    modelId: selected.modelId,
                    modeIdx: selected.modeIdx ?? 0,
                    diameter: selected.diameter,
                    volume: selected.volume,
                    temperature: selected.temperature
                }));
            }
        }
    };

    const handleUpdateSlice = (newSlice: SliceState) => {
        setSlice(newSlice);
    };

    const addDiffuserAt = (x: number, y: number) => {
        const MIN_DIST = 0.05;
        
        // Защита от двойных кликов в одну точку (ближе 5 см)
        const hasCollision = placedDiffusers.some(d => Math.hypot(d.x - x, d.y - y) < MIN_DIST);
        if (hasCollision) return;

        // Читаем актуальные глобальные настройки прямо из localStorage
        const rawSettings = localStorage.getItem('hvac-global-settings');
        const parsedSettings = rawSettings ? JSON.parse(rawSettings) : null;
        const defaultParticleLimit = parsedSettings?.particleLimit || 8000;

        const id = `diff-${Date.now()}`;
        const newDiffuser: PlacedDiffuser = {
            id,
            index: placedDiffusers.length + 1,
            x,
            y,
            modelId: params.modelId,
            flowType: visualFlowType,
            modeIdx: params.modeIdx,
            diameter: params.diameter,
            volume: params.volume,
            temperature: params.temperature,
            // Применяем глобальный лимит к новому объекту:
            particleLimit: defaultParticleLimit, 
            performance: buildPlacedDiffuserPerformance(
                params,
                params.roomTemp,
                params.diffuserHeight,
                params.workZoneHeight
            )
        };

        setPlacedDiffusers(prev => [...prev, newDiffuser]);
        // ВАЖНО: Мы НЕ выделяем новый диффузор, чтобы пользователь мог кликать дальше (ставить штампы)
        if (activeTool !== 'stamp') {
            setSelectedDiffuserIds([id]);
        }
    };

    const addDiffuser = () => {
        setSelectedDiffuserIds([]); // Сбрасываем выделение, переходим в режим "Новых"
        // Активируем инструмент Штамп вместо случайного спавна
        setActiveTool('stamp' as ToolMode);
        if (viewMode !== 'top') setViewMode('top');
    };

    // Добавляем выход из инструмента по Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveTool('select');
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const updateDiffuserPosition = (id: string, x: number, y: number) => {
        setPlacedDiffusers(prev => {
            const MIN_DIST = 0.05; // Минимальное расстояние 5 см
            
            const hasCollision = prev.some(d => 
                d.id !== id && Math.hypot(d.x - x, d.y - y) < MIN_DIST
            );

            if (hasCollision) return prev; // Блокируем слияние центров

            // Если перемещается мультивыделение
            if (selectedDiffuserIds.includes(id) && selectedDiffuserIds.length > 1) {
                const target = prev.find(d => d.id === id);
                if (!target) return prev;
                
                const deltaX = x - target.x;
                const deltaY = y - target.y;

                return prev.map(d => {
                    if (selectedDiffuserIds.includes(d.id)) {
                        return { 
                            ...d, 
                            x: Math.max(0, Math.min(params.roomWidth, d.x + deltaX)), 
                            y: Math.max(0, Math.min(params.roomLength, d.y + deltaY)) 
                        };
                    }
                    return d;
                });
            } else {
                return prev.map(d => d.id === id ? { ...d, x, y } : d);
            }
        });
    };

    const removeDiffuser = (id: string) => {
        const nextDiffusers = placedDiffusers.filter(d => d.id !== id);
        setPlacedDiffusers(nextDiffusers);

        setSelectedDiffuserIds(prev => prev.filter(i => i !== id));
    };

    const duplicateDiffuser = (id: string) => {
        const source = placedDiffusers.find(d => d.id === id);
        if (!source) return;

        const MIN_DIST = 0.05;
        const VISUAL_STEP = 0.5; // Шаг для красивого визуального смещения
        let newX = source.x + VISUAL_STEP;
        let newY = source.y;

        // Ищем свободную точку (чтобы в радиусе 5 см никого не было)
        while (placedDiffusers.some(d => Math.hypot(d.x - newX, d.y - newY) < MIN_DIST)) {
            newX += VISUAL_STEP;
            if (newX > params.roomWidth - 0.5) {
                newX = 0.5;
                newY += VISUAL_STEP;
            }
        }

        if (newY > params.roomLength - 0.5) newY = source.y; 

        const newId = `diff-${Date.now()}`;
        const duplicatedDiffuser: PlacedDiffuser = {
            ...source,
            id: newId,
            x: newX,
            y: newY,
            index: placedDiffusers.length + 1,
            performance: buildPlacedDiffuserPerformance(
                source,
                params.roomTemp,
                params.diffuserHeight,
                params.workZoneHeight
            )
        };

        setPlacedDiffusers(prev => [...prev, duplicatedDiffuser]);
        setSelectedDiffuserIds([newId]);
        setParams(prev => ({
            ...prev,
            modelId: source.modelId,
            diameter: source.diameter,
            volume: source.volume,
            temperature: source.temperature,
            modeIdx: source.modeIdx ?? 0
        }));
    };

    // Probes
    const addProbeAtScreenClick = (clickX: number, clickY: number) => {
        let startX = params.roomWidth / 2;
        let startY = params.roomLength / 2;
        let startZ = params.workZoneHeight; // Default to workzone

        if (viewMode === 'top') {
            startX = clickX;
            startY = clickY;
        } else if (viewMode === 'front') {
            startX = clickX;
            startZ = clickY; 
        } else if (viewMode === 'right') {
            startY = clickX;
            startZ = clickY;
        }

        setProbes([...probes, { id: `p-${Date.now()}`, x: startX, y: startY, z: startZ }]);
    };
    
    const updateProbePos = (id: string, pos: {x?: number, y?: number, z?: number}) => {
        setProbes(prev => prev.map(p => p.id === id ? { ...p, ...pos } : p));
    };

    const removeProbe = (id: string) => {
        setProbes(prev => prev.filter(p => p.id !== id));
    };

    // UI Helpers
    const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);
    
    const resetAll = () => {
        setParams(INITIAL_PARAMS);
        setPlacedDiffusers([]);
        setSelectedDiffuserIds([]);
        setProbes([]);
        setIsPowerOn(true);
        setIsPlaying(true);
        setActiveTool('select');
        setPlacementMode('single');
        setOpenSection('distributor');
    };

    // Derived current flow type for passing to Canvas
    return (
        <div className="flex w-full min-h-screen bg-[#F5F5F7] dark:bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-900 dark:text-slate-200 overflow-hidden selection:bg-blue-500/30">
            {/* Left Panel */}
            <SimulatorLeftPanel 
                openSection={openSection} toggleSection={toggleSection}
                params={params} setParams={setParams}
                handleParameterChange={handleParameterChange}
                physics={physics}
                isPowerOn={isPowerOn} togglePower={() => setIsPowerOn(!isPowerOn)}
                viewMode={viewMode} isPlaying={isPlaying} setIsPlaying={setIsPlaying}
                sizeSelected={sizeSelected} setSizeSelected={setSizeSelected}
                onHome={onHome} onBack={onBack}
                isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}
                onAddDiffuser={addDiffuser}
                onReset={resetAll}
                placementMode={placementMode}
                setPlacementMode={setPlacementMode}
                selectedIds={selectedDiffuserIds}
            />

            {/* Center Content */}
            <div className="flex-1 flex flex-col relative h-[100dvh] lg:h-screen overflow-hidden p-0 lg:p-4 lg:pl-0">
                <div ref={containerRef} className="flex-1 lg:rounded-[48px] overflow-hidden relative shadow-2xl bg-white dark:bg-[#030304] border-b lg:border border-black/5 dark:border-white/5 ring-1 ring-black/5 dark:ring-white/5 group transition-colors duration-500">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 dark:from-blue-900/5 to-transparent pointer-events-none"></div>
                    
                    {/* Mobile Header Buttons */}
                    <div className="lg:hidden absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="pointer-events-auto p-3 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"><Menu size={20} /></button>
                        <button onClick={() => setIsMobileStatsOpen(true)} className="pointer-events-auto p-3 rounded-full bg-white/10 backdrop-blur-md text-slate-800 dark:text-white border border-white/10 active:scale-95 transition-transform"><Info size={20} /></button>
                    </div>
                    
                    <DiffuserCanvas 
                        width={viewSize.w} 
                        height={viewSize.h} 
                        physics={physics} 
                        isPowerOn={isPowerOn} 
                        isPlaying={isPlaying} 
                        temp={params.temperature} 
                        roomTemp={params.roomTemp} 
                        flowType={visualFlowType} 
                        modelId={params.modelId}
                        showGrid={showGrid} 
                        roomHeight={params.roomHeight} 
                        roomWidth={params.roomWidth} 
                        roomLength={params.roomLength}
                        diffuserHeight={params.diffuserHeight} 
                        workZoneHeight={params.workZoneHeight}
                        viewMode={viewMode} 
                        placedDiffusers={placedDiffusers} 
                        onUpdateDiffuserPos={updateDiffuserPosition} 
                        onSelectDiffuser={handleSelectDiffuser}
                        onRemoveDiffuser={removeDiffuser} 
                        onDuplicateDiffuser={duplicateDiffuser} 
                        selectedDiffuserIds={selectedDiffuserIds}
                        simulationField={simulationField} 
                        gridStep={0.5}
                        snapToGrid={snapToGrid} 
                        gridSnapSize={0.5}
                        activeTool={activeTool}
                        setActiveTool={setActiveTool}
                        placementMode={placementMode}
                        onAddDiffuserAt={addDiffuserAt}
                        slice={slice}
                        onUpdateSlice={handleUpdateSlice}
                        probes={probes}
                        onAddProbe={addProbeAtScreenClick}
                        onRemoveProbe={removeProbe}
                        onUpdateProbePos={updateProbePos}
                    />

                   {/* Desktop Toolbar (AutoCAD-like layout with Native App Style) */}
                    <div className="fixed inset-x-0 bottom-6 lg:bottom-8 z-[80] pointer-events-none flex justify-center">
                        <motion.div 
                            drag
                            dragMomentum={false}
                            dragListener={false}
                            dragControls={dragControls}
                            ref={toolbarRef}
                            className="flex items-center gap-1 p-1.5 rounded-2xl bg-white/90 dark:bg-[#0a0a0c]/90 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto transition-colors duration-500 max-w-[calc(100vw-2rem)] lg:max-w-max overflow-x-auto slim-scrollbar"
                        >
                            {/* Drag Handle */}
                            <div 
                                onPointerDown={(e) => dragControls.start(e)}
                                className="flex items-center justify-center px-1 text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-600 dark:hover:text-slate-300 shrink-0 select-none touch-none"
                            >
                                <GripVertical size={20} />
                            </div>
                            {/* Play/Pause */}
                            <div className="flex items-center gap-1 pr-2 border-r border-black/10 dark:border-white/10 shrink-0">
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)} 
                                className={`w-16 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 ${!isPlaying ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
                            >
                                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                <span className="text-[9px] font-bold uppercase tracking-wider">{isPlaying ? 'Пауза' : 'Пуск'}</span>
                            </button>
                        </div>

                        {/* View Modes */}
                        <div className="flex items-center gap-1 px-2 shrink-0">
                            {[
                                { id: 'front', label: 'РАЗРЕЗ', icon: <Layers size={18} strokeWidth={2} /> },
                                { id: 'top', label: 'План', icon: <Maximize size={18} strokeWidth={2} /> },
                                { id: '3d', label: '3D Вид', icon: <Box size={18} strokeWidth={2} /> },
                            ].map(view => {
                                const isDisabled = placedDiffusers.length === 0 && view.id !== 'top';
                                return (
                                <button 
                                    key={view.id}
                                    onClick={() => !isDisabled && setViewMode(view.id as any)}
                                    disabled={isDisabled}
                                    className={`w-[68px] h-14 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-all duration-300 ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''} ${viewMode === view.id ? 'bg-[#2563eb] text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : (!isDisabled ? 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5' : 'text-slate-500 dark:text-slate-400')}`}
                                >
                                    {view.icon}
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${viewMode === view.id ? 'text-white' : ''}`}>{view.label}</span>
                                </button>
                            )})}
                        </div>

                        {/* Tools */}
                        <div className="flex items-center gap-1 pl-2 border-l border-black/10 dark:border-white/10 shrink-0 overflow-hidden transition-all duration-500">
                                <button 
                                    onClick={() => setActiveTool('select')} 
                                    className={`w-[68px] h-14 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-all duration-300 ${activeTool === 'select' ? 'bg-black/10 dark:bg-white/15 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`} 
                                >
                                    <MousePointer2 size={18} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Выбор</span>
                                </button>
                                <button 
                                    onClick={() => setActiveTool('probe')} 
                                    className={`w-[68px] h-14 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-all duration-300 ${activeTool === 'probe' ? 'bg-black/10 dark:bg-white/15 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`} 
                                >
                                    <Thermometer size={18} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Датчик</span>
                                </button>
                                
                                <div className="w-px h-8 bg-black/10 dark:bg-white/10 mx-1 shrink-0"></div>
                                
                                <button 
                                    onClick={() => setShowGrid(!showGrid)} 
                                    disabled={viewMode === '3d'}
                                    className={`w-[68px] h-14 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-all duration-300 ${viewMode === '3d' ? 'opacity-30 cursor-not-allowed' : ''} ${showGrid && viewMode !== '3d' ? 'bg-black/10 dark:bg-white/15 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`} 
                                >
                                    <GridIcon size={18} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Сетка</span>
                                </button>
                                <button 
                                    onClick={() => setSnapToGrid(!snapToGrid)} 
                                    disabled={viewMode !== 'top'}
                                    className={`w-[68px] h-14 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-all duration-300 ${viewMode !== 'top' ? 'opacity-30 cursor-not-allowed' : ''} ${snapToGrid && viewMode === 'top' ? 'bg-black/10 dark:bg-white/15 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`} 
                                >
                                    <Scan size={18} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Привязка</span>
                                </button>
                                <button 
                                    onClick={() => setSlice(prev => ({ ...prev, isActive: !prev.isActive }))} 
                                    disabled={viewMode !== 'top'}
                                    className={`w-[68px] h-14 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-all duration-300 ${viewMode !== 'top' ? 'opacity-30 cursor-not-allowed' : ''} ${slice.isActive && viewMode === 'top' ? 'bg-black/10 dark:bg-white/15 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`} 
                                >
                                    <SplitSquareHorizontal size={18} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Срез</span>
                                </button>
                            </div>
                    </motion.div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <SimulatorRightPanel 
                viewMode={viewMode}
                physics={physics}
                params={params}
                placedDiffusers={placedDiffusers}
                topViewStats={topViewStats}
                isMobileStatsOpen={isMobileStatsOpen}
                setIsMobileStatsOpen={setIsMobileStatsOpen}
                selectedDiffuserIds={selectedDiffuserIds}
                probes={probes}
                onRemoveProbe={removeProbe}
            />
        </div>
    );
};

export default Simulator;
