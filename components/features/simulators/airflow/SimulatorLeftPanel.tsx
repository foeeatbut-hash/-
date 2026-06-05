
import React from 'react';
import { Fan, ScanLine, Wind, Thermometer, Home, AlertTriangle, Power, PlusCircle, X, ChevronLeft, CheckCircle2, Shapes, Layers, Trash2, Flame } from 'lucide-react';
import { SPECS, DIFFUSER_CATALOG, getDiffuserMode, getDiffuserPerformanceFlowType } from '../../../../constants';
import { calculatePerformance } from '../../../../hooks/useSimulation';
import { GlassButton, GlassSlider } from '../../../ui/Shared';
import { AccordionItem } from './SimulatorUI';

export const SimulatorLeftPanel = ({ 
    openSection, toggleSection, 
    params, setParams, handleParameterChange,
    physics,
    isPowerOn, togglePower, 
    viewMode, isPlaying, setIsPlaying, 
    sizeSelected, setSizeSelected,
    onHome, onBack, isMobileMenuOpen, setIsMobileMenuOpen,
    onAddDiffuser,
    onReset,
    placementMode,
    setPlacementMode,
    selectedIds
}: any) => {

    const handleModelChange = (id: string) => {
        const mode = getDiffuserMode(id, 0);
        if (!mode) return;
        
        const currentDiameterValid = calculatePerformance(id, getDiffuserPerformanceFlowType(id, 0, mode.performanceFlowType), params.diameter, params.volume) !== null;
        
        let newDiameter = params.diameter;
        if (!currentDiameterValid) {
            const validDiameter = Object.keys(SPECS).find(d => {
                const val = !isNaN(Number(d)) ? Number(d) : d;
                const testVol = SPECS[d].min || 100;
                return calculatePerformance(id, getDiffuserPerformanceFlowType(id, 0, mode.performanceFlowType), val, testVol) !== null;
            });
            newDiameter = validDiameter ? (!isNaN(Number(validDiameter)) ? Number(validDiameter) : validDiameter) : params.diameter;
        }
        
        let newVol = params.volume;
        if (newDiameter && SPECS[newDiameter]) {
             const { min, max } = SPECS[newDiameter];
             if (newVol < min) newVol = min;
             if (newVol > max) newVol = max;
        }
        handleParameterChange('modelId', id);
        handleParameterChange('modeIdx', 0);
        handleParameterChange('diameter', newDiameter);
        handleParameterChange('volume', newVol);
        setSizeSelected(!!newDiameter);
    };

    const handleSizeSelect = (d: string | number) => {
        let newVol = params.volume;
        if (d && SPECS[d]) {
             const { min, max } = SPECS[d];
             if (newVol < min) newVol = min;
             if (newVol > max) newVol = max;
        }
        handleParameterChange('diameter', d);
        handleParameterChange('volume', newVol);
        setSizeSelected(true);
    };

    const getMinRoomHeight = (workZoneHeight: number) => Number((workZoneHeight + 0.1).toFixed(1));

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 z-[60] lg:hidden backdrop-blur-sm transition-opacity" 
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            
            <div className={`
                fixed inset-y-0 left-0 bg-white lg:bg-transparent lg:static w-[85vw] md:w-[420px] lg:w-[420px] h-[100dvh] lg:h-screen shrink-0 transition-transform duration-300 ease-out dark:bg-[#0a0a0f]
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                z-[70]
                p-0 lg:p-4 lg:pl-4 border-r border-black/5 dark:border-white/10 lg:border-none shadow-2xl lg:shadow-none
            `}>
                <div className="flex-1 flex flex-col h-full lg:rounded-[32px] bg-white lg:bg-white/80 dark:bg-[#0a0a0f] lg:dark:bg-[#0a0a0f]/80 backdrop-blur-2xl lg:border border-black/5 dark:border-white/5 overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                    {/* Header */}
                    <div className="p-5 lg:p-6 border-b border-black/5 dark:border-white/5 bg-gradient-to-b from-black/5 dark:from-white/5 to-transparent relative pt-safe-top">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                     <GlassButton secondary customClass="h-10 px-3 w-10 flex border items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white" onClick={onHome} icon={<Home size={16} />} />
                                     {onBack && (
                                         <GlassButton secondary customClass="h-10 px-3 w-10 flex border items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white" onClick={onBack} icon={<ChevronLeft size={16} />} />
                                     )}
                                </div>

                                <div className="h-8 w-px bg-black/10 dark:bg-white/10 hidden lg:block"></div>

                                <div className="flex items-center gap-3">
                                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#1a1a1f] border border-black/10 dark:border-white/10 shadow-md overflow-hidden group flex-shrink-0">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <Wind className="absolute text-blue-600 dark:text-blue-400 w-5 h-5 -translate-x-1 -translate-y-1 group-hover:-translate-x-1.5 group-hover:-translate-y-1.5 transition-transform duration-500 ease-out" strokeWidth={2} />
                                        <Flame className="absolute text-emerald-500 dark:text-emerald-400 w-4 h-4 translate-x-1.5 translate-y-1.5 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500 ease-out" strokeWidth={2} />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none tracking-tight uppercase flex items-center">
                                            <span className="translate-y-[1px]">КЛИМ</span>
                                            <span className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white ml-1 px-1.5 py-0.5 rounded flex items-center justify-center">
                                                <span className="translate-y-[1px]">ЛАБ</span>
                                            </span>
                                        </h2>
                                        <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Инженерный комплекс</p>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Close Button */}
                            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 bg-black/5 dark:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-5 space-y-2 pb-24 lg:pb-5">
                        
                        {/* Контекстный бейдж */}
                        <div className="mb-2 px-1">
                            {selectedIds?.length === 0 ? (
                                <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                                    Настройки для новых
                                </span>
                            ) : selectedIds?.length === 1 ? (
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                                    Редактирование объекта
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                                    Мультивыделение: {selectedIds?.length} шт.
                                </span>
                            )}
                        </div>

                        <AccordionItem title="Воздухораспределитель" icon={<Fan size={18}/>} isOpen={openSection === 'distributor'} onClick={() => toggleSection('distributor')}>
                            <div className="mb-5">
                                <div className="grid grid-cols-2 gap-2.5">
                                    {DIFFUSER_CATALOG.map(d => (
                                        <button 
                                            key={d.id} 
                                            onClick={() => handleModelChange(d.id)} 
                                            className={`p-3.5 rounded-2xl border text-left transition-all group relative overflow-hidden ${params.modelId === d.id ? 'bg-blue-600 border-blue-500/50 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
                                        >
                                            <div className="text-xs font-bold relative z-10">{d.series}</div>
                                            <div className={`text-[10px] truncate relative z-10 mt-0.5 ${params.modelId === d.id ? 'text-blue-100' : 'opacity-50'}`}>{d.name}</div>
                                            {params.modelId === d.id && <div className="absolute right-0 top-0 p-2 opacity-20"><CheckCircle2 size={32}/></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-6 p-4 rounded-2xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5">
                                <div className="flex justify-between items-baseline mb-3">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Типоразмер</label>
                                    {!sizeSelected && <span className="text-[9px] text-amber-500 font-bold animate-pulse flex items-center gap-1"><AlertTriangle size={10}/> Выберите размер</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(SPECS).map(d => {
                                        const val = !isNaN(Number(d)) ? Number(d) : d;
                                        const testVol = SPECS[d].min || 100;
                                        if (calculatePerformance(params.modelId, getDiffuserPerformanceFlowType(params.modelId, params.modeIdx), val, testVol) === null) return null;
                                        return <button key={d} onClick={() => handleSizeSelect(val)} className={`px-4 py-2.5 rounded-xl text-[10px] font-bold font-mono transition-all border ${params.diameter === val ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-transparent shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-white dark:bg-white/5 text-slate-500 border-black/5 dark:border-transparent hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}>{d}</button>;
                                    })}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <GlassSlider label="Расход воздуха" icon={<Wind size={14}/>} val={params.volume} min={physics.spec.min || 50} max={(physics.spec.max || 1000) * 1.5} step={10} unit=" м³/ч" onChange={(v: number) => handleParameterChange('volume', v)}/>
                                <GlassSlider label="Т° Притока" icon={<Thermometer size={14}/>} val={params.temperature} min={15} max={35} step={1} unit="°C" onChange={(v: number) => handleParameterChange('temperature', v)} color="temp"/>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Помещение" icon={<ScanLine size={18}/>} isOpen={openSection === 'room'} onClick={() => toggleSection('room')}>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {['roomWidth', 'roomLength', 'roomHeight'].map(key => (
                                    <div key={key} className="bg-black/5 dark:bg-black/20 p-3 rounded-2xl border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/20 transition-colors focus-within:border-blue-500/50 group">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                                            {key === 'roomWidth' && 'Ширина'}
                                            {key === 'roomLength' && 'Длина'}
                                            {key === 'roomHeight' && 'Высота'} (м)
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.5" 
                                            min={key === 'roomHeight' ? getMinRoomHeight(params.workZoneHeight) : 1}
                                            max={key === 'roomHeight' ? 4 : 10}
                                            value={(params as any)[key]} 
                                            onChange={(e) => {
                                                let val = Number(e.target.value);
                                                if (key === 'roomHeight' && val > 4) val = 4;
                                                if ((key === 'roomWidth' || key === 'roomLength') && val > 10) val = 10;
                                                setParams(p => ({
                                                    ...p, 
                                                    [key]: val,
                                                    // Ensure diffuser is always at ceiling height
                                                    ...(key === 'roomHeight' ? { diffuserHeight: val } : {})
                                                }));
                                            }} 
                                            onBlur={(e) => {
                                                let val = Number(e.target.value);
                                                if (key === 'roomHeight') {
                                                    const minH = getMinRoomHeight(params.workZoneHeight);
                                                    if (val < minH) val = minH;
                                                    if (val > 4) val = 4;
                                                    setParams(p => ({
                                                        ...p, 
                                                        [key]: val,
                                                        ...(key === 'roomHeight' ? { diffuserHeight: val } : {})
                                                    }));
                                                } else if (key === 'roomWidth' || key === 'roomLength') {
                                                    if (val < 1) val = 1;
                                                    if (val > 10) val = 10;
                                                    setParams(p => ({
                                                        ...p, 
                                                        [key]: val
                                                    }));
                                                }
                                            }}
                                            className="bg-transparent w-full text-sm font-bold font-mono text-slate-900 dark:text-white outline-none" 
                                        />
                                    </div>
                                ))}
                                
                                <div className="bg-black/5 dark:bg-black/20 p-3 rounded-2xl border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/20 transition-colors">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Раб. Зона (м)</label>
                                    <div className="flex bg-white/40 dark:bg-black/40 rounded-lg p-1 gap-1 h-[26px]">
                                        {[1.5, 2.0].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => {
                                                    const minH = getMinRoomHeight(val);
                                                    setParams((p: any) => ({ 
                                                        ...p, 
                                                        workZoneHeight: val,
                                                        ...(p.roomHeight < minH ? { roomHeight: minH, diffuserHeight: minH } : {})
                                                    }));
                                                }}
                                                className={`flex-1 rounded-md text-[10px] font-bold font-mono transition-all ${params.workZoneHeight === val ? 'bg-white dark:bg-slate-600 text-black dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                            >
                                                {val.toFixed(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <GlassSlider label="Т° Помещения" icon={<Home size={14}/>} val={params.roomTemp} min={15} max={35} step={1} unit="°C" onChange={(v: number) => setParams(p => ({...p, roomTemp: v}))} color="temp"/>
                        </AccordionItem>
                    </div>

                    {/* Footer Controls */}
                    <div className="p-5 bg-white/60 dark:bg-[#050508]/60 border-t border-black/5 dark:border-white/5 backdrop-blur-xl absolute bottom-0 left-0 right-0 lg:relative">
                            <div className="grid grid-cols-2 gap-3">
                                <GlassButton onClick={() => { onAddDiffuser(); }} icon={<PlusCircle size={18} />} label="Добавить" secondary={true} disabled={!sizeSelected || !!physics.error} customClass="w-full bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10" />
                                <GlassButton onClick={onReset} icon={<Trash2 size={18} />} label="Сброс" secondary={true} customClass="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20" />
                            </div>
                    </div>
                </div>
            </div>
        </>
    );
};
