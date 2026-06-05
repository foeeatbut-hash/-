import React, { useMemo } from 'react';
import { GitMerge, Wind, Thermometer, RotateCcw, Activity, Snowflake, Flame } from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider } from '../../../ui/Shared';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

interface MixingState {
    flow1: number;
    temp1: number;
    flow2: number;
    temp2: number;
}

const MixingCalculator = ({ onBack, onHome }: any) => {
    const [calcState, setCalcState] = useLocalStorage<MixingState>('hvac-calc-mixing', {
        flow1: 1000,
        temp1: -20,
        flow2: 3000,
        temp2: 22
    });

    const { flow1, temp1, flow2, temp2 } = calcState;

    const results = useMemo(() => {
        const totalL = flow1 + flow2;
        if (totalL === 0) {
            return { mixedTemp: 0, totalFlow: 0, ratio1: 0, ratio2: 0 };
        }
        const tMix = (flow1 * temp1 + flow2 * temp2) / totalL;
        return {
            mixedTemp: tMix,
            totalFlow: totalL,
            ratio1: (flow1 / totalL) * 100,
            ratio2: (flow2 / totalL) * 100
        };
    }, [flow1, temp1, flow2, temp2]);

    const handleReset = () => {
        setCalcState({
            flow1: 1000,
            temp1: -20,
            flow2: 3000,
            temp2: 22
        });
    };

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Смешение потоков"
                icon={<GitMerge size={24} />}
                iconColorClass="bg-cyan-500 shadow-cyan-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Streams 1 and 2 Inputs (6 columns) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1">
                        <div className="space-y-4">
                            {/* Stream 1 */}
                            <div>
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                    <Snowflake size={14} className="text-blue-500" /> Поток 1 (Наружный воздух)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GlassSlider 
                                        label="Расход L1 (м³/ч)" 
                                        val={flow1} min={0} max={10000} step={50} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, flow1: v }))} 
                                    />
                                    <GlassSlider 
                                        label="Температура t1 (°C)" 
                                        val={temp1} min={-50} max={40} step={1} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, temp1: v }))} 
                                    />
                                </div>
                            </div>

                            {/* Stream 2 */}
                            <div>
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5 pt-1">
                                    <Flame size={14} className="text-orange-500" /> Поток 2 (Рециркуляционный воздух)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GlassSlider 
                                        label="Расход L2 (м³/ч)" 
                                        val={flow2} min={0} max={10000} step={50} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, flow2: v }))} 
                                    />
                                    <GlassSlider 
                                        label="Температура t2 (°C)" 
                                        val={temp2} min={15} max={40} step={1} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, temp2: v }))} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-black/5 dark:border-white/5">
                            <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Outcomes & Formulae (6 columns) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    {/* Summary mixing panel */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                            <Activity size={14} className="text-cyan-500" /> Анализ смешения
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                            {/* Big temperature gauge */}
                            <div className="md:col-span-6 p-4 rounded-xl flex flex-col items-center justify-center text-center bg-cyan-500/10 border border-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                                <span className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">Итог температуры смеси</span>
                                <span className="text-3xl lg:text-4xl font-black font-mono">
                                    {results.mixedTemp.toFixed(1)} <span className="text-lg opacity-60 font-medium">°C</span>
                                </span>
                            </div>

                            {/* Details grid list */}
                            <div className="md:col-span-6 grid grid-cols-1 gap-2 border-l border-slate-100 dark:border-white/5 md:pl-4">
                                <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-between font-mono text-xs">
                                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight flex items-center gap-1"><Wind size={10} /> Расход</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{results.totalFlow.toFixed(0)} м³/ч</span>
                                </div>
                                <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-between font-mono text-xs">
                                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight flex items-center gap-1"><GitMerge size={10} /> Доля L1 / L2</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{results.ratio1.toFixed(0)}% / {results.ratio2.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scientific handbook / formulas */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex-1">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Activity size={14} className="text-blue-500" /> Физическое описание процесса
                        </h2>
                        <div className="space-y-2.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p>
                                Калориметрическое уравнение сохранения энергии для воздушных масс. Предполагается изобарическое смешение при одинаковой массовой теплоемкости.
                            </p>
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex flex-col items-center justify-center text-center mt-1">
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">Формула калориметрии</span>
                                <div className="font-mono text-xs font-black text-slate-800 dark:text-white">
                                    t_mix = (L₁·t₁ + L₂·t₂) / (L₁ + L₂)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MixingCalculator;
