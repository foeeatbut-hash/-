import React, { useState, useMemo } from 'react';
import { 
    Flame, DoorOpen, Fan, Thermometer, Wind, Building2, AlertTriangle, ArrowUpFromLine,
    RotateCcw, Activity, ChevronRight, ChevronLeft
} from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider } from '../../../ui/Shared';
import { FIRE_LOADS } from './constants_fire';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

interface SmokeData {
    systemType: 'Extraction' | 'Pressurization';
    roomArea: number;
    roomHeight: number;
    fireLoadMass: number;
    material: keyof typeof FIRE_LOADS;
    corridorWidth: number;
    corridorLength: number;
    doorWidth: number;
    doorHeight: number;
    isSingleDoor: boolean;
    floors: number;
    ductLength: number;
}

const SmokeCalculator = ({ onBack, onHome }: any) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useLocalStorage<SmokeData>('hvac-calc-smoke', {
        systemType: 'Extraction',
        roomArea: 25, roomHeight: 3.0, fireLoadMass: 400, material: 'Office_Furniture',
        corridorWidth: 2.0, corridorLength: 15.0, doorWidth: 0.9, doorHeight: 2.1, isSingleDoor: true,
        floors: 5, ductLength: 15
    });

    const results = useMemo(() => {
        if (data.systemType === 'Pressurization') return null;

        const mat = FIRE_LOADS[data.material];
        const fireLoadDensity = data.fireLoadMass / data.roomArea;
        
        let T_room_max = 20 + 900 * (1 - Math.exp(-0.05 * fireLoadDensity));
        if (T_room_max > 1100) T_room_max = 1100;

        const alpha = 0.55;
        const T_smoke_corridor = 20 + (T_room_max - 20) * alpha;
        const rho_smoke = 353 / (273 + T_smoke_corridor);

        const A_door = data.doorWidth * data.doorHeight;
        const k_flow = data.isSingleDoor ? 1.0 : 1.2; 
        const G_sm = 0.05 * k_flow * A_door * Math.pow(data.doorHeight, 0.5) * Math.pow(T_room_max, 0.25);

        const leakage_factor = 1 + (0.015 * data.floors);
        const L_sm = (G_sm / rho_smoke) * 3600 * leakage_factor;

        return { 
            T_room_max, 
            T_smoke_corridor, 
            G_sm, 
            L_sm, 
            rho_smoke,
            fireLoadDensity
        };
    }, [data]);

    const handleReset = () => {
        setData({
            systemType: 'Extraction',
            roomArea: 25, roomHeight: 3.0, fireLoadMass: 400, material: 'Office_Furniture',
            corridorWidth: 2.0, corridorLength: 15.0, doorWidth: 0.9, doorHeight: 2.1, isSingleDoor: true,
            floors: 5, ductLength: 15
        });
        setCurrentStep(0);
    };

    const STEPS = [
        { id: 0, title: 'Очаг пожара', icon: <Flame size={18}/> },
        { id: 1, title: 'Эвакуация', icon: <DoorOpen size={18}/> },
        { id: 2, title: 'Результат', icon: <Fan size={18}/> }
    ];

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Противодымная защита"
                icon={<Flame size={24} />}
                iconColorClass="bg-orange-500 shadow-orange-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            {/* System Type Switcher */}
            <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit">
                <button 
                    onClick={() => setData(prev => ({ ...prev, systemType: 'Extraction' }))}
                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        data.systemType === 'Extraction' 
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/15' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <Wind size={12} /> Дымоудаление
                </button>
                <button 
                    onClick={() => setData(prev => ({ ...prev, systemType: 'Pressurization' }))}
                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        data.systemType === 'Pressurization' 
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/15' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <ArrowUpFromLine size={12} /> Подпор воздуха
                </button>
            </div>

            {data.systemType === 'Pressurization' ? (
                <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-8 text-center">
                    <div className="inline-flex p-3 rounded-full bg-slate-500/10 text-slate-400 mb-3">
                        <ArrowUpFromLine size={32} />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1 uppercase tracking-wider">Модуль в проектировании</h2>
                    <p className="text-slate-500 max-w-sm mx-auto italic text-xs leading-relaxed">Расчет систем избыточного давления (подпор воздуха на лестничные клетки, холлы и лифтовые шахты) проходит метрологическую верификацию.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* Left Column Sidebar: Steps Selector (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-2">
                        {STEPS.map((step, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border text-left relative overflow-hidden ${
                                    currentStep === idx 
                                        ? 'bg-orange-500/10 border-orange-500 text-slate-800 dark:text-white' 
                                        : 'bg-white/40 dark:bg-white/5 border-transparent text-slate-400 hover:bg-white/60 dark:hover:bg-white/10'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg ${currentStep === idx ? 'bg-orange-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>
                                    {step.icon}
                                </div>
                                <div className="font-bold text-[10px] uppercase tracking-wider">{step.title}</div>
                                {currentStep === idx && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                            </button>
                        ))}
                    </div>

                    {/* Right Column Content Panel: Form controls (9 cols) */}
                    <div className="lg:col-span-9 flex">
                        <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1 min-h-[320px]">
                            
                            {currentStep === 0 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                        <Flame size={14} className="text-orange-500" /> Физические параметры очага горения
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        {/* Material Selection Grid */}
                                        <div className="md:col-span-5 space-y-2">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Материал горючей нагрузки</label>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {Object.keys(FIRE_LOADS).slice(0, 3).map((k) => (
                                                    <button 
                                                        key={k} 
                                                        onClick={() => setData(prev => ({ ...prev, material: k as any }))}
                                                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                                                            data.material === k 
                                                                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/15' 
                                                                : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        {FIRE_LOADS[k as keyof typeof FIRE_LOADS].name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Fire Load Sizers */}
                                        <div className="md:col-span-7 space-y-4">
                                            <GlassSlider 
                                                label="Суммарная масса нагрузки (кг)" 
                                                val={data.fireLoadMass} min={100} max={5000} step={50} 
                                                onChange={(v) => setData(prev => ({ ...prev, fireLoadMass: v }))} 
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <GlassSlider 
                                                    label="Площадь очага (м²)" 
                                                    val={data.roomArea} min={10} max={200} step={1} 
                                                    onChange={(v) => setData(prev => ({ ...prev, roomArea: v }))} 
                                                />
                                                <GlassSlider 
                                                    label="Высота перекрытия (м)" 
                                                    val={data.roomHeight} min={2.5} max={10} step={0.1} 
                                                    onChange={(v) => setData(prev => ({ ...prev, roomHeight: v }))} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                        <DoorOpen size={14} className="text-blue-500" /> Архитектура и Эвакуационные Проемы
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <GlassSlider 
                                            label="Ширина эвакуационной двери (м)" 
                                            val={data.doorWidth} min={0.6} max={2.0} step={0.1} 
                                            onChange={(v) => setData(prev => ({ ...prev, doorWidth: v }))} 
                                        />
                                        <GlassSlider 
                                            label="Высота эвакуационной двери (м)" 
                                            val={data.doorHeight} min={1.8} max={3.0} step={0.1} 
                                            onChange={(v) => setData(prev => ({ ...prev, doorHeight: v }))} 
                                        />
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Дверная конфигурация</label>
                                            <div className="flex p-0.5 bg-black/5 dark:bg-white/5 rounded-lg w-fit">
                                                <button 
                                                    onClick={() => setData(prev => ({ ...prev, isSingleDoor: true }))}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${data.isSingleDoor ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}
                                                >
                                                    Однопольная
                                                </button>
                                                <button 
                                                    onClick={() => setData(prev => ({ ...prev, isSingleDoor: false }))}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${!data.isSingleDoor ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}
                                                >
                                                    Двупольная
                                                </button>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            label="Этажность защищаемого здания" 
                                            val={data.floors} min={1} max={50} step={1} 
                                            onChange={(v) => setData(prev => ({ ...prev, floors: v }))} 
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && results && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                        <Activity size={14} className="text-orange-500" /> Выходные результаты дымоудаления
                                    </h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                        <div className="md:col-span-6 p-4 rounded-xl flex flex-col items-center justify-center text-center bg-orange-500/10 border border-orange-500/15 text-orange-600 dark:text-orange-400">
                                            <span className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-80">Расход вентилятора ДУ</span>
                                            <span className="text-3xl lg:text-4xl font-black font-mono">
                                                {results.L_sm.toFixed(0)} <span className="text-lg opacity-60 font-medium">м³/ч</span>
                                            </span>
                                        </div>

                                        <div className="md:col-span-6 grid grid-cols-1 gap-2 border-l border-slate-100 dark:border-white/5 md:pl-4 font-mono text-[11px]">
                                            <div className="p-2 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-lg flex items-center justify-between">
                                                <span className="text-slate-500 font-bold text-[9px] uppercase">Массовый расход дыма</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{results.G_sm.toFixed(2)} кг/с</span>
                                            </div>
                                            <div className="p-2 bg-black/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-lg flex items-center justify-between">
                                                <span className="text-slate-500 font-bold text-[9px] uppercase">Температура в коридоре</span>
                                                <span className="font-bold text-orange-500">{results.T_smoke_corridor.toFixed(0)} °C</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 flex gap-2.5 text-[11px]">
                                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                            <span className="font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tighter block mb-0.5">ВНИИПО Рекомендация:</span>
                                            Предусматривайте вентилятор ДУ температурного класса ({results.T_smoke_corridor > 400 ? '600°C' : '400°C'} в течение 2 часов работы).
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Stepper controls list footer */}
                            <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                                <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} />
                                <div className="flex gap-2">
                                    {currentStep > 0 && (
                                        <GlassButton secondary icon={<ChevronLeft size={14}/>} label="Назад" onClick={() => setCurrentStep(prev => prev - 1)} />
                                    )}
                                    {currentStep < 2 && (
                                        <GlassButton icon={<ChevronRight size={14}/>} label="Далее" onClick={() => setCurrentStep(prev => prev + 1)} />
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmokeCalculator;
