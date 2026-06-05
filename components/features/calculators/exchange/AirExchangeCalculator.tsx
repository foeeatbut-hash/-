import React, { useState, useMemo } from 'react';
import { Users, Box, Wind, Ruler, Activity, RotateCcw } from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider } from '../../../ui/Shared';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

interface AirExchangeState {
    mode: 'room' | 'people';
    area: number;
    height: number;
    multiplicity: number;
    peopleCount: number;
    normPerPerson: number;
}

const AirExchangeCalculator = ({ onBack, onHome }: any) => {
    const [calcState, setCalcState] = useLocalStorage<AirExchangeState>('hvac-calc-air-exchange', {
        mode: 'room',
        area: 20,
        height: 3.0,
        multiplicity: 1,
        peopleCount: 5,
        normPerPerson: 60
    });

    const { mode, area, height, multiplicity, peopleCount, normPerPerson } = calcState;

    const resultFlow = useMemo(() => {
        if (mode === 'room') {
            return area * height * multiplicity;
        } else {
            return peopleCount * normPerPerson;
        }
    }, [mode, area, height, multiplicity, peopleCount, normPerPerson]);

    const handleReset = () => {
        setCalcState({
            mode: 'room',
            area: 20,
            height: 3.0,
            multiplicity: 1,
            peopleCount: 5,
            normPerPerson: 60
        });
    };

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Воздухообмен"
                icon={<Wind size={24} />}
                iconColorClass="bg-blue-500 shadow-blue-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Mode Select & Inputs (6 columns) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1">
                        <div>
                            {/* Calculation Mode Select */}
                            <div className="flex flex-wrap gap-1.5 mb-6 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit">
                                <button 
                                    onClick={() => setCalcState(prev => ({ ...prev, mode: 'room' }))}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        mode === 'room' 
                                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/15' 
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Box size={12} /> По помещению
                                </button>
                                <button 
                                    onClick={() => setCalcState(prev => ({ ...prev, mode: 'people' }))}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        mode === 'people' 
                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/15' 
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Users size={12} /> По людям
                                </button>
                            </div>

                            {mode === 'room' ? (
                                <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                                    <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-2">
                                        <Ruler size={14} className="text-blue-500" /> Параметры помещения
                                    </h2>
                                    <div className="space-y-4">
                                        <GlassSlider 
                                            label="Площадь помещения (м²)" 
                                            val={area} min={1} max={500} step={1} 
                                            onChange={(v) => setCalcState(prev => ({ ...prev, area: v }))} 
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <GlassSlider 
                                                label="Высота потолка (м)" 
                                                val={height} min={2} max={15} step={0.1} 
                                                onChange={(v) => setCalcState(prev => ({ ...prev, height: v }))} 
                                            />
                                            <GlassSlider 
                                                label="Кратность воздухообмена (крат/ч)" 
                                                val={multiplicity} min={0.5} max={30} step={0.5} 
                                                onChange={(v) => setCalcState(prev => ({ ...prev, multiplicity: v }))} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-2">
                                        <Users size={14} className="text-emerald-500" /> Нагрузка по людям
                                    </h2>
                                    <div className="space-y-4">
                                        <GlassSlider 
                                            label="Количество людей" 
                                            val={peopleCount} min={1} max={200} step={1} 
                                            onChange={(v) => setCalcState(prev => ({ ...prev, peopleCount: v }))} 
                                        />
                                        <div className="p-3.5 bg-black/5 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-3">
                                            <GlassSlider 
                                                label="Удельная норма м³/ч на человека (СП 60.13330)" 
                                                val={normPerPerson} min={10} max={120} step={5} 
                                                onChange={(v) => setCalcState(prev => ({ ...prev, normPerPerson: v }))} 
                                            />
                                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-black/5 dark:border-white/[0.04]">
                                                {[20, 30, 40, 60, 80].map(n => (
                                                    <button 
                                                        key={n}
                                                        onClick={() => setCalcState(prev => ({ ...prev, normPerPerson: n }))}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                            normPerPerson === n 
                                                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                                                                : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        {n} м³/ч
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reset action */}
                        <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-black/5 dark:border-white/5">
                            <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Calculations & Справочная информация (6 columns) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    {/* Compact Results card */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <Activity size={14} className="text-blue-500" /> Сводные показатели
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                            {/* Big meter block */}
                            <div className={`md:col-span-6 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-colors border ${
                                mode === 'room' 
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-80">Требуемый приток</span>
                                <span className="text-3xl lg:text-4xl font-black font-mono">
                                    {resultFlow.toFixed(0)}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest mt-0.5 opacity-70">м³/ч</span>
                            </div>

                            {/* Secondary sub-metrics grid */}
                            <div className="md:col-span-6 grid grid-cols-1 gap-2 border-l border-slate-100 dark:border-white/5 md:pl-4">
                                {mode === 'room' ? (
                                    <>
                                        <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-between font-mono text-xs">
                                            <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight">Объем здания</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{(area * height).toFixed(1)} м³</span>
                                        </div>
                                        <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-between font-mono text-xs">
                                            <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight">Кратность</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{multiplicity} крат/ч</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-between font-mono text-xs">
                                            <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight">Число людей</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{peopleCount} чел</span>
                                        </div>
                                        <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-between font-mono text-xs">
                                            <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight">Норма расхода</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{normPerPerson} м³/ч</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Regional Reference Guidelines standards */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex-1">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <Activity size={14} className="text-blue-500" /> Гигиенические стандарты (СП 60.13330)
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                            <div className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">Офисы:</span>
                                Расчет: 60 м³/ч на сотрудника или кратность замены воздуха 1-2.
                            </div>
                            <div className="p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Жилье:</span>
                                Расчет: 30 м³/ч на жильца или коэффициент кратности 0.5-1.
                            </div>
                            <div className="p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">Технические/Кухни:</span>
                                Строгий замер по технологическим кратностям от 5 до 12.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AirExchangeCalculator;
