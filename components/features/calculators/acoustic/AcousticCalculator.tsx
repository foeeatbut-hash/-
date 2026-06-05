import React, { useMemo } from 'react';
import { Volume2, Plus, Trash2, RotateCcw, Activity, Waves, Info } from 'lucide-react';
import { AppHeader, GlassSlider, GlassButton } from '../../../ui/Shared';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

interface AcousticData {
    sources: number[];
}

const AcousticCalculator = ({ onBack, onHome }: any) => {
    const [calcState, setCalcState] = useLocalStorage<AcousticData>('hvac-calc-acoustic', {
        sources: [35, 35]
    });
    
    const { sources } = calcState;

    const totalNoise = useMemo(() => {
        if (sources.length === 0) return 0;
        const sumPower = sources.reduce((acc, val) => acc + Math.pow(10, 0.1 * val), 0);
        return 10 * Math.log10(sumPower);
    }, [sources]);

    const addSource = () => {
        if (sources.length < 10) {
             setCalcState(prev => ({ ...prev, sources: [...prev.sources, 30] }));
        }
    };

    const removeSource = (index: number) => {
        setCalcState(prev => ({
            ...prev,
            sources: prev.sources.filter((_, i) => i !== index)
        }));
    };

    const updateSource = (index: number, value: number) => {
        setCalcState(prev => {
            const next = [...prev.sources];
            next[index] = value;
            return { ...prev, sources: next };
        });
    };

    const handleReset = () => {
        setCalcState({ sources: [35, 35] });
    };

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Суммирование шума"
                icon={<Volume2 size={24} />}
                iconColorClass="bg-rose-500 shadow-rose-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Noise Sources (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1">
                        <div>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-black/5 dark:border-white/5">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                                    <Waves size={14} className="text-rose-500" /> Источники шума
                                </h2>
                                <GlassButton 
                                    onClick={addSource} 
                                    disabled={sources.length >= 10}
                                    icon={<Plus size={14} />}
                                    label="Добавить источник"
                                />
                            </div>

                            {/* Scrollable list to prevent screen stretching */}
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                                {sources.map((val, idx) => (
                                    <div key={idx} className="bg-black/5 dark:bg-white/5 p-3.5 rounded-xl border border-black/5 dark:border-white/5 animate-in slide-in-from-left-4 fade-in duration-300">
                                        <div className="flex justify-between items-center mb-2.5">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Источник #{idx + 1}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-[15px] font-bold font-mono text-slate-800 dark:text-white">{val}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">дБ(А)</span>
                                                </div>
                                                {sources.length > 1 && (
                                                    <button 
                                                        onClick={() => removeSource(idx)} 
                                                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 hover:bg-rose-500/10 rounded-lg"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={val} min={0} max={120} step={1} 
                                            onChange={(v: number) => updateSource(idx, v)} 
                                            unit=" дБ"
                                        />
                                    </div>
                                ))}
                                {sources.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 text-xs italic bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10">
                                        Нет активных источников. Нажмите "Добавить источник".
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex justify-end">
                            <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Dynamic Results & Acoustic Handbook (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Summed output panel */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5 pb-1.5 border-b border-black/5 dark:border-white/5">
                            <Activity size={14} className="text-rose-500" /> Вычисления акустики
                        </h2>

                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all hover:bg-rose-500/10">
                            <span className="text-[10px] font-bold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-widest mb-1.5">
                                Суммарный уровень шума
                            </span>
                            <span className="text-4xl lg:text-5xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                                {totalNoise.toFixed(1)} <span className="text-lg opacity-60 uppercase">дБ(А)</span>
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/5 dark:border-white/5">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Всего источников</div>
                                <div className="text-xl font-black text-slate-800 dark:text-white font-mono">{sources.length}</div>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/5 dark:border-white/5">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Макс. единичный</div>
                                <div className="text-xl font-black text-slate-800 dark:text-white font-mono text-cyan-600 dark:text-cyan-400">
                                    {sources.length > 0 ? Math.max(...sources) : 0} <span className="text-[9px] text-slate-400 uppercase font-bold">дБ</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Acoustic Guidelines Reference Information */}
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 lg:p-5 flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 flex-1">
                        <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-amber-600 dark:text-amber-500 block mb-1 uppercase tracking-wider text-[10px]">Акустический справочник</span>
                            <p className="mb-2 text-[11px]">Уровни звукового давления суммируются логарифмически по формуле: 10·lg(Σ 10^(Li/10)).</p>
                            <p className="text-[11px] border-t border-amber-500/10 pt-1.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Психофизика звука:</span> Изменение на 3 дБ воспринимается ухом как едва заметное, а на 10 дБ — как двукратное увеличение громкости.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcousticCalculator;
