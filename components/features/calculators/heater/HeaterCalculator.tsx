import React, { useMemo } from 'react';
import { Thermometer, Wind, Zap, Droplets, ChevronRight, Flame, Snowflake, RotateCcw, Activity, FileText } from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider } from '../../../ui/Shared';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';
import { downloadReport } from '../../../ui/reportGenerator';

interface HeaterState {
    airflow: number;
    tempIn: number;
    tempOut: number;
    mode: 'heating' | 'cooling';
}

const HeaterCalculator = ({ onBack, onHome }: any) => {
    const [calcState, setCalcState] = useLocalStorage<HeaterState>('hvac-calc-heater', {
        airflow: 1000,
        tempIn: -26,
        tempOut: 22,
        mode: 'heating'
    });
    
    const { airflow, tempIn, tempOut, mode } = calcState;

    // Constants
    const AIR_DENSITY = 1.2; // kg/m3
    const AIR_HEAT_CAPACITY = 1.006; // kJ/(kg*C)

    const results = useMemo(() => {
        const dt = Math.abs(tempOut - tempIn);
        const pKW = (airflow * AIR_DENSITY * AIR_HEAT_CAPACITY * dt) / 3600;
        
        const dtWater = mode === 'heating' ? 20 : 5;
        const wFlow = (pKW * 3600) / (4.187 * dtWater);
        
        const amps = (pKW * 1000) / (1.732 * 400);

        return {
            powerKW: pKW,
            waterFlow: wFlow,
            electricCurrent: amps,
            deltaT: dt,
            massFlow: airflow * AIR_DENSITY
        };
    }, [airflow, tempIn, tempOut, mode]);

    const handleReset = () => {
        setCalcState({
            airflow: 1000,
            tempIn: -26,
            tempOut: 22,
            mode: 'heating'
        });
    };

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Нагреватели и Охладители"
                icon={<Zap size={24} />}
                iconColorClass={mode === 'heating' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-cyan-500 shadow-cyan-500/20'}
                onBack={onBack}
                onHome={onHome}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Inputs & Mode Selector (6 cols) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1">
                        <div>
                            {/* Mode select */}
                            <div className="flex flex-wrap gap-1.5 mb-6 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit">
                                <button 
                                    onClick={() => setCalcState(prev => ({ ...prev, mode: 'heating' }))}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        mode === 'heating' 
                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/15' 
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Flame size={12} /> Нагрев
                                </button>
                                <button 
                                    onClick={() => setCalcState(prev => ({ ...prev, mode: 'cooling' }))}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        mode === 'cooling' 
                                            ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/15' 
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Snowflake size={12} /> Охлаждение
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Wind size={14} className={mode === 'heating' ? 'text-orange-500' : 'text-cyan-500'} /> Объемный расход
                                    </h2>
                                    <GlassSlider 
                                        label="Расход воздуха (м³/ч)" 
                                        val={airflow} min={0} max={20000} step={100} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, airflow: v }))} 
                                    />
                                </div>

                                <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                                    <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Thermometer size={14} className={mode === 'heating' ? 'text-orange-500' : 'text-cyan-500'} /> Параметры температур
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <GlassSlider 
                                            label="Вход (Улица) (°C)" 
                                            val={tempIn} min={-40} max={40} step={1} 
                                            onChange={(v) => setCalcState(prev => ({ ...prev, tempIn: v }))} 
                                        />
                                        <GlassSlider 
                                            label="Выход (Канал) (°C)" 
                                            val={tempOut} min={5} max={50} step={1} 
                                            onChange={(v) => setCalcState(prev => ({ ...prev, tempOut: v }))} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-black/5 dark:border-white/5">
                            <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} />
                            <GlassButton 
                                icon={<FileText size={14}/>} 
                                label="Скачать отчет" 
                                onClick={() => {
                                    const inputs = [
                                        { label: "Тип процесса", value: mode === 'heating' ? "Нагрев воздуха" : "Охлаждение воздуха" },
                                        { label: "Расход воздуха", value: airflow, unit: "м³/ч" },
                                        { label: "Температура на входе", value: tempIn, unit: "°C" },
                                        { label: "Температура на выходе", value: tempOut, unit: "°C" },
                                        { label: "Плотность воздуха (расчетная)", value: "1.20", unit: "кг/м³" },
                                        { label: "Удельная теплоемкость воздуха", value: "1.006", unit: "кДж/(кг·°C)" }
                                    ];

                                    const outputs = [
                                        { label: "Разность температур (ΔT)", value: results.deltaT, unit: "°C" },
                                        { label: "Массовый расход воздуха", value: Math.round(results.massFlow), unit: "кг/ч" },
                                        { label: "Потребная тепловая мощность", value: results.powerKW.toFixed(2), unit: "кВт" },
                                        { label: `Расход воды в контуре (Δt = ${mode === 'heating' ? "20" : "5"}°C)`, value: Math.round(results.waterFlow), unit: "л/ч" },
                                        { label: "Сила тока (3 фазы, 380В, cosφ=0.95)", value: results.electricCurrent.toFixed(1), unit: "А" }
                                    ];

                                    const formulas = [
                                        { text: "Потребная тепловая мощность", math: "Q = L * ρ * Cp * ΔT / 3600 (кВт)" },
                                        { text: "Массовый расход теплоносителя", math: "G_w = Q * 3600 / (Cw * Δt_water) (л/ч)" },
                                        { text: "Электрический ток нагрузки нагревателя", math: "I = Q * 1000 / (√3 * 380 * cosφ) (А)" }
                                    ];

                                    downloadReport(
                                        mode === 'heating' ? "Расчет параметров калорифера (нагрев)" : "Расчет параметров воздухоохладителя",
                                        inputs,
                                        outputs,
                                        formulas,
                                        [
                                            "Расчет выполнен по стандартным термодинамическим уравнениям для сухого воздуха.",
                                            "Рекомендуется закладывать запас по мощности калорифера не менее 15% на компенсацию теплопотерь в воздуховодах.",
                                            "Расход воды рассчитан для дельты температур: греющий контур 80/60°C (Δt=20°C), охлаждающий контур 7/12°C (Δt=5°C)."
                                        ]
                                    );
                                }} 
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Calculations results & handbook Info (6 cols) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    {/* Compact Dashboard Results Grid */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <Activity size={14} className={mode === 'heating' ? 'text-orange-500' : 'text-cyan-500'} /> Показатели расчета
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                            {/* Visual Power gauge */}
                            <div className={`md:col-span-5 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-colors border ${
                                mode === 'heating' 
                                    ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' 
                                    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                            }`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-80">Потребная мощность</span>
                                <span className="text-3xl lg:text-4xl font-black font-mono">
                                    {results.powerKW.toFixed(2)}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest mt-0.5 opacity-70">кВт</span>
                            </div>

                            {/* Secondary results parameter list */}
                            <div className="md:col-span-7 grid grid-cols-2 gap-2 font-mono text-[11px]">
                                <div className="bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 flex flex-col justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight mb-1 flex items-center gap-1"><Droplets size={10} className="text-blue-500"/> Вода л/ч</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">
                                        {results.waterFlow.toFixed(0)} <span className="text-[9px] font-normal text-slate-500">л/ч</span>
                                    </span>
                                </div>
                                <div className="bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 flex flex-col justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight mb-1 flex items-center gap-1"><Zap size={10} className="text-amber-500"/> Ток фазы</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">
                                        {results.electricCurrent.toFixed(1)} <span className="text-[9px] font-normal text-slate-500">А</span>
                                    </span>
                                </div>
                                <div className="bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 flex flex-col justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight mb-1 flex items-center gap-1"><Thermometer size={10} className="text-teal-500"/> Перепад ΔT</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">
                                        {results.deltaT.toFixed(0)} <span className="text-[9px] font-normal text-slate-500">°C</span>
                                    </span>
                                </div>
                                <div className="bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 flex flex-col justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-tight mb-1 flex items-center gap-1"><Wind size={10} className="text-sky-500"/> Массовый</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">
                                        {results.massFlow.toFixed(0)} <span className="text-[9px] font-normal text-slate-500">кг/ч</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact engineering Handbooks stacked below */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex-1">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Activity size={14} className="text-blue-500" /> Инженерный справочник
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                            <div className="p-2.5 bg-orange-500/5 rounded-xl border border-orange-500/10">
                                <span className="font-bold text-orange-600 dark:text-orange-400 block mb-0.5">Контур нагрева:</span>
                                Для водяных калориферов стандартные сетевые графики составляют 80/60°C или 90/70°C (Δt=20°C).
                            </div>
                            <div className="p-2.5 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                                <span className="font-bold text-cyan-600 dark:text-cyan-400 block mb-0.5">Контур охлаждения:</span>
                                Для водяных секций воздухоохладителей стандарт гидрологического расчета равен 7/12°C (Δt=5°C).
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeaterCalculator;
