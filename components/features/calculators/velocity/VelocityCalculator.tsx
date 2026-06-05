import React, { useState, useMemo } from 'react';
import { 
    Wind, Settings2, Grid, CircleDot, Wand2, Table2, 
    CheckCircle2, ArrowRight, RotateCcw, Activity, Info
} from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider } from '../../../ui/Shared';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

interface VelocityState {
    volume: number;
    minSpeed: number;
    maxSpeed: number;
    mode: 'check' | 'wizard';
}

const VelocityCalculator = ({ onBack, onHome }: any) => {
    const [calcState, setCalcState] = useLocalStorage<VelocityState>('hvac-calc-velocity', {
        volume: 1000,
        minSpeed: 2,
        maxSpeed: 5,
        mode: 'check'
    });

    const { volume, minSpeed, maxSpeed, mode } = calcState;

    // Data ranges
    const circularSizes = [100, 125, 160, 200, 250, 315, 355, 400, 450, 500, 630, 710, 800, 1000, 1250];
    const rectSizes = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000];

    // Helper
    const calculateSpeed = (area: number) => {
        if (!area || area === 0) return 0;
        return volume / (3600 * area);
    };

    // Wizard Logic
    const suggestions = useMemo(() => {
        // Circular
        const round = circularSizes.map(d => {
            const area = Math.PI * Math.pow(d / 1000, 2) / 4;
            const v = calculateSpeed(area);
            return { d, v, area };
        })
        .filter(i => i.v <= maxSpeed && i.v > 0.5)
        .sort((a, b) => b.v - a.v);

        // Rectangular
        const rect = [];
        for (let h of rectSizes) {
            for (let w of rectSizes) {
                if (w < h) continue;
                const area = (w / 1000) * (h / 1000);
                const v = calculateSpeed(area);
                if (v <= maxSpeed && v > 0.5) {
                    rect.push({ w, h, v, area });
                }
            }
        }
        rect.sort((a, b) => b.v - a.v);

        return { round, rect: rect.slice(0, 40) };
    }, [volume, maxSpeed]);

    const handleReset = () => {
        setCalcState({
            volume: 1000,
            minSpeed: 2,
            maxSpeed: 5,
            mode: 'check'
        });
    };

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Скорость в воздуховодах"
                icon={<Wind size={24} />}
                iconColorClass="bg-emerald-500 shadow-emerald-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            {/* Mode Switcher */}
            <div className="flex p-0.5 bg-black/5 dark:bg-white/5 rounded-lg w-fit">
                <button 
                    onClick={() => setCalcState(prev => ({ ...prev, mode: 'check' }))}
                    className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        mode === 'check' 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <Table2 size={12} /> Таблица матрица
                </button>
                <button 
                    onClick={() => setCalcState(prev => ({ ...prev, mode: 'wizard' }))}
                    className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        mode === 'wizard' 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <Wand2 size={12} /> Подбор сечений
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column Sidebar: Controls & Recs (3 cols) */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Controls */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-5 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                            <Settings2 size={14} className="text-emerald-500" /> Параметры
                        </h2>
                        
                        <div className="space-y-4">
                            <GlassSlider 
                                label="Расход на расчётном участке" 
                                val={volume} min={100} max={10000} step={50} 
                                onChange={(v) => setCalcState(prev => ({ ...prev, volume: v }))} 
                                unit=" м³/ч"
                            />

                            {mode === 'check' ? (
                                <div className="space-y-4 pt-1">
                                    <GlassSlider 
                                        label="Мин. скорость м/с" 
                                        val={minSpeed} min={0.5} max={5} step={0.1} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, minSpeed: v }))} 
                                        unit=" м/с"
                                    />
                                    <GlassSlider 
                                        label="Макс. скорость м/с" 
                                        val={maxSpeed} min={2} max={15} step={0.5} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, maxSpeed: v }))} 
                                        unit=" м/с"
                                    />
                                </div>
                            ) : (
                                <GlassSlider 
                                    label="Лимит скорости" 
                                    val={maxSpeed} min={1} max={15} step={0.5} 
                                    onChange={(v) => setCalcState(prev => ({ ...prev, maxSpeed: v }))} 
                                    unit=" м/с"
                                />
                            )}
                        </div>

                        <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5">
                            <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} className="w-full" />
                        </div>
                    </div>

                    {/* Guidelines Handbook */}
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 flex gap-2.5 text-[11px] leading-relaxed flex-1">
                        <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div className="text-slate-600 dark:text-slate-400">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1 uppercase tracking-wider text-[9px]">Рекомендуемые скорости</span>
                            <ul className="space-y-0.5 list-disc list-inside">
                                <li>Магистральные участки: <span className="font-mono font-bold text-slate-800 dark:text-white">4.0 - 6.0 м/с</span></li>
                                <li>Ответвления каналов: <span className="font-mono font-bold text-slate-800 dark:text-white">2.0 - 4.0 м/с</span></li>
                                <li>Воздухораспределители: <span className="font-mono font-bold text-slate-800 dark:text-white">1.5 - 2.5 м/с</span></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right Column Content Panel: lookup grid / suggestions (9 cols) */}
                <div className="lg:col-span-9 flex flex-col gap-4">
                    {mode === 'check' ? (
                        <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[500px]">
                            <div className="p-4 border-b border-black/5 dark:border-white/5">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Grid size={14} className="text-emerald-500" /> Двумерная матрица скоростей (м/с) в зависимости от сечения A x B
                                </h2>
                            </div>
                            <div className="overflow-auto custom-scrollbar flex-1 text-xs">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-black/5 dark:bg-white/5 sticky top-0 z-20">
                                            <th className="p-2.5 text-left text-[9px] font-bold text-slate-500 uppercase border-r border-black/5 dark:border-white/5 sticky left-0 bg-white/95 dark:bg-[#0a0a0f]/95 backdrop-blur-md">высота \ ширина</th>
                                            {rectSizes.map(w => (
                                                <th key={w} className="p-1.5 text-center text-[9px] font-bold text-slate-400 font-mono min-w-[42px]">{w}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rectSizes.map(h => (
                                            <tr key={h} className="border-t border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-2.5 text-[9px] font-bold text-slate-400 font-mono border-r border-black/5 dark:border-white/5 sticky left-0 bg-white/95 dark:bg-[#0a0a0f]/95 backdrop-blur-md z-10">{h}</td>
                                                {rectSizes.map(w => {
                                                    const area = (w / 1000) * (h / 1000);
                                                    const speed = calculateSpeed(area);
                                                    const isOptimal = speed >= minSpeed && speed <= maxSpeed;
                                                    return (
                                                        <td key={`${h}x${w}`} className="p-0.5 text-center">
                                                            <div className={`text-[9px] font-mono py-1 rounded ${isOptimal ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 opacity-40'}`}>
                                                                {speed.toFixed(1)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[500px] overflow-y-auto pr-1 pb-1 custom-scrollbar">
                            {/* Circular Suggestions */}
                            <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-5 shadow-sm">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                    <CircleDot size={14} className="text-emerald-500" /> Подходящие круглые сечения воздуховодов
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {suggestions.round.map((item, i) => (
                                        <div key={item.d} className={`p-2.5 rounded-xl border transition-all ${i === 0 ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/10' : 'bg-black/5 dark:bg-white/5 border-transparent'}`}>
                                            <div className="flex justify-between items-center mb-0.5 gap-1.5">
                                                <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">Ø{item.d}</span>
                                                {i === 0 && <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />}
                                            </div>
                                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">{item.v.toFixed(2)} м/с</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rectangular Suggestions */}
                            <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-5 shadow-sm">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                    <Grid size={14} className="text-emerald-500" /> Подходящие прямоугольные сечения воздуховодов
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {suggestions.rect.map((item, i) => (
                                        <div key={`${item.w}x${item.h}`} className={`p-2.5 rounded-xl border transition-all ${i === 0 ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/10' : 'bg-black/5 dark:bg-white/5 border-transparent'}`}>
                                            <div className="flex justify-between items-center mb-0.5 gap-1.5">
                                                <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-white">{item.w}×{item.h}</span>
                                                <ArrowRight size={10} className="text-slate-400 shrink-0" />
                                            </div>
                                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">{item.v.toFixed(2)} м/с</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VelocityCalculator;
