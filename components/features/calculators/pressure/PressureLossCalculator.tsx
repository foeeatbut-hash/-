import React, { useMemo } from 'react';
import { Gauge, Wind, Ruler, RotateCcw, Activity, Box, CircleDot } from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider } from '../../../ui/Shared';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

interface PressureLossState {
    airflow: number;
    shape: 'round' | 'rect';
    diameter: number;
    width: number;
    height: number;
    length: number;
    zeta: number;
}

const PressureLossCalculator = ({ onBack, onHome }: any) => {
    const [calcState, setCalcState] = useLocalStorage<PressureLossState>('hvac-calc-pressure-loss', {
        airflow: 1000,
        shape: 'round',
        diameter: 200,
        width: 300,
        height: 200,
        length: 20,
        zeta: 2
    });
    
    const { airflow, shape, diameter, width, height, length, zeta } = calcState;

    const results = useMemo(() => {
        const rho = 1.2; // kg/m3
        const nu = 15.11e-6; // m2/s
        const roughness = 0.1; // mm
        
        let d_calc = 0;
        let area = 0;

        if (shape === 'round') {
            d_calc = diameter / 1000;
            area = Math.PI * Math.pow(d_calc, 2) / 4;
        } else {
            const a = width / 1000;
            const b = height / 1000;
            area = a * b;
            d_calc = (2 * a * b) / (a + b);
        }

        if (area <= 0 || d_calc <= 0) {
            return { totalLoss: 0, frictionLoss: 0, localLoss: 0, velocity: 0, dynamicPressure: 0 };
        }

        const v = airflow / 3600 / area;
        const Re = (v * d_calc) / nu;
        const k = roughness / 1000;
        
        let lambda = 0.02; 
        if (Re > 0) {
            lambda = 0.11 * Math.pow((k/d_calc) + (68/Re), 0.25);
        }

        const dynPress = (rho * Math.pow(v, 2)) / 2;
        const dP_f = lambda * (length / d_calc) * dynPress;
        const dP_l = zeta * dynPress;

        return {
            totalLoss: dP_f + dP_l,
            frictionLoss: dP_f,
            localLoss: dP_l,
            velocity: v,
            dynamicPressure: dynPress
        };
    }, [airflow, shape, diameter, width, height, length, zeta]);

    const handleReset = () => {
        setCalcState({
            airflow: 1000,
            shape: 'round',
            diameter: 200,
            width: 300,
            height: 200,
            length: 20,
            zeta: 2
        });
    };

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Потери давления"
                icon={<Gauge size={24} />}
                iconColorClass="bg-purple-500 shadow-purple-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Shape Switcher & Slider Inputs (6 cols) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1">
                        <div>
                            {/* Shape Switcher */}
                            <div className="flex flex-wrap gap-1.5 mb-5 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit">
                                <button 
                                    onClick={() => setCalcState(prev => ({ ...prev, shape: 'round' }))}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        shape === 'round' 
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/15' 
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <CircleDot size={12} /> Круглый
                                </button>
                                <button 
                                    onClick={() => setCalcState(prev => ({ ...prev, shape: 'rect' }))}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        shape === 'rect' 
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/15' 
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Box size={12} /> Прямоугольный
                                </button>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                    <Wind size={14} className="text-purple-500" /> Геометрия и Расход
                                </h2>
                                <div className="space-y-4">
                                    <GlassSlider 
                                        label="Расход воздуха на участке (м³/ч)" 
                                        val={airflow} min={0} max={10000} step={50} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, airflow: v }))} 
                                    />
                                    
                                    {shape === 'round' ? (
                                        <GlassSlider 
                                            label="Внутренний диаметр воздуховода (мм)" 
                                            val={diameter} min={100} max={1250} step={5} 
                                            onChange={(v) => setCalcState(prev => ({ ...prev, diameter: v }))} 
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <GlassSlider 
                                                label="Ширина канала (мм)" 
                                                val={width} min={100} max={2000} step={50} 
                                                onChange={(v) => setCalcState(prev => ({ ...prev, width: v }))} 
                                            />
                                            <GlassSlider 
                                                label="Высота канала (мм)" 
                                                val={height} min={100} max={2000} step={50} 
                                                onChange={(v) => setCalcState(prev => ({ ...prev, height: v }))} 
                                            />
                                        </div>
                                    )}
                                </div>

                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5 pt-2">
                                    <Ruler size={14} className="text-purple-500" /> Параметры вентиляционной сети
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GlassSlider 
                                        label="Длина прямого участка (м)" 
                                        val={length} min={1} max={200} step={1} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, length: v }))} 
                                    />
                                    <GlassSlider 
                                        label="Сумма местных КМС (Σζ)" 
                                        val={zeta} min={0} max={20} step={0.1} 
                                        onChange={(v) => setCalcState(prev => ({ ...prev, zeta: v }))} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reset button */}
                        <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-black/5 dark:border-white/5">
                            <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Physical results breakdown & Aerodynamic reference (6 cols) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    {/* Summarized Outputs */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                            <Activity size={14} className="text-purple-500" /> Результаты расчета аэродинамики
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                            {/* Large pressure bubble gauge */}
                            <div className="md:col-span-6 p-4 rounded-xl flex flex-col items-center justify-center text-center bg-purple-500/10 border border-purple-500/15 text-purple-600 dark:text-purple-400">
                                <span className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">Полные потери давления</span>
                                <span className="text-3xl lg:text-4xl font-black font-mono tracking-tight">
                                    {results.totalLoss.toFixed(0)} <span className="text-lg font-bold opacity-60">Па</span>
                                </span>
                            </div>

                            {/* Velocity & sub-losses list */}
                            <div className="md:col-span-6 grid grid-cols-1 gap-1.5 border-l border-slate-100 dark:border-white/5 md:pl-4 font-mono text-[11px]">
                                <div className="p-2 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-lg flex items-center justify-between">
                                    <span className="text-slate-500 font-bold text-[9px] uppercase">На трение</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{results.frictionLoss.toFixed(0)} Па</span>
                                </div>
                                <div className="p-2 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-lg flex items-center justify-between">
                                    <span className="text-slate-500 font-bold text-[9px] uppercase">Местные КМС</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{results.localLoss.toFixed(0)} Па</span>
                                </div>
                                <div className="p-2 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-lg flex items-center justify-between">
                                    <span className="text-slate-500 font-bold text-[9px] uppercase">Скорость</span>
                                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{results.velocity.toFixed(1)} м/с</span>
                                </div>
                                <div className="p-2 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-lg flex items-center justify-between">
                                    <span className="text-slate-500 font-bold text-[9px] uppercase">Динамич. давление</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{results.dynamicPressure.toFixed(0)} Па</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scientific Handbook information */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex-1">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <Activity size={14} className="text-blue-500" /> Физические параметры и методики
                        </h2>
                        <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p>
                                Расчет ведется по фундаментальной формуле Дарси-Вейсбаха. Коэффициент гидравлического трения λ определяется нелинейной аппроксимацией Альтшуля.
                            </p>
                            <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10 flex justify-between items-center mt-2">
                                <span className="font-bold text-purple-600 dark:text-purple-400 uppercase text-[9px] tracking-wider">Шероховатость стали:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-white">k = 0.1 мм (оцинковка)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PressureLossCalculator;
