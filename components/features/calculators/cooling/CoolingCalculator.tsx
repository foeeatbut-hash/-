import React, { useState, useMemo } from 'react';
import { 
    Home, ChevronLeft, ChevronRight, Lock, CheckCircle2, 
    Sun, Users, Wind, BarChart3, Box, Thermometer, Compass, Globe, RotateCcw, FileText
} from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider, GlassSelect } from '../../../ui/Shared';
import { SOLAR_GAINS, WALL_TRANSMISSION, INTERNAL_LOADS } from '../../../../constants';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';
import { downloadReport } from '../../../ui/reportGenerator';

interface CalcData {
    width: number;
    length: number;
    height: number;
    wallType: keyof typeof WALL_TRANSMISSION;
    azimuth: number;
    glassArea: number;
    isSkylight: boolean;
    glassType: 'Glass_Single' | 'Glass_Double';
    climateCoef: number;
    people: number;
    computers: number;
    lighting: boolean;
    ventilationOn: boolean;
    airFlow: number;
}

const CoolingCalculator = ({ onBack, onHome }: any) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [maxStepReached, setMaxStepReached] = useState(0);
    
    const [data, setData] = useLocalStorage<CalcData>('hvac-calc-cooling', {
        width: 10, length: 15, height: 3.0, wallType: 'Modern', azimuth: 180,
        glassArea: 5, isSkylight: false, glassType: 'Glass_Double', climateCoef: 1.0,
        people: 5, computers: 5, lighting: true,
        ventilationOn: false, airFlow: 0
    });

    const results = useMemo(() => {
        let orientationKey: keyof typeof SOLAR_GAINS = 'North';
        if (data.isSkylight) {
            orientationKey = 'Horizontal';
        } else {
            const deg = data.azimuth;
            if (deg >= 45 && deg < 135) orientationKey = 'East';
            else if (deg >= 135 && deg < 225) orientationKey = 'South';
            else if (deg >= 225 && deg < 315) orientationKey = 'West';
            else orientationKey = 'North';
        }

        const perimeter = (data.width + data.length) * 2;
        const wallArea = Math.max(0, perimeter * data.height - data.glassArea);
        const dt = 10;
        const q_walls = wallArea * WALL_TRANSMISSION[data.wallType] * dt;

        const q_sun = data.glassArea * SOLAR_GAINS[orientationKey] * data.climateCoef;
        const q_glass_trans = data.glassArea * WALL_TRANSMISSION[data.glassType] * dt;
        const q_total_windows = q_sun + q_glass_trans;

        const q_people = data.people * INTERNAL_LOADS.Person_Office;
        const q_equip = data.computers * INTERNAL_LOADS.Computer;
        const floorArea = data.width * data.length;
        const q_light = data.lighting ? floorArea * INTERNAL_LOADS.Lighting_LED : 0;
        const q_internal = q_people + q_equip + q_light;

        const q_vent = data.ventilationOn ? 0.336 * data.airFlow * dt : 0;

        const totalWatts = q_walls + q_total_windows + q_internal + q_vent;
        const btu = totalWatts * 3.412;

        return { q_walls, q_total_windows, q_internal, q_vent, totalWatts, btu, floorArea, orientationKey };
    }, [data]);

    const getCardinalLabel = (deg: number) => {
        if (deg >= 45 && deg < 135) return 'Восток';
        if (deg >= 135 && deg < 225) return 'Юг';
        if (deg >= 225 && deg < 315) return 'Запад';
        return 'Север';
    };

    const STEPS = [
        { id: 0, title: 'Помещение', icon: <Box size={18}/>, isValid: data.width > 0 && data.length > 0 },
        { id: 1, title: 'Окна', icon: <Sun size={18}/>, isValid: true }, 
        { id: 2, title: 'Нагрузки', icon: <Users size={18}/>, isValid: true },
        { id: 3, title: 'Результат', icon: <BarChart3 size={18}/>, isValid: true }
    ];

    const handleNext = () => {
        if (STEPS[currentStep].isValid) {
            const next = currentStep + 1;
            setCurrentStep(next);
            if (next > maxStepReached) setMaxStepReached(next);
        }
    };

    const handleReset = () => {
        setData({
            width: 10, length: 15, height: 3.0, wallType: 'Modern', azimuth: 180,
            glassArea: 5, isSkylight: false, glassType: 'Glass_Double', climateCoef: 1.0,
            people: 5, computers: 5, lighting: true,
            ventilationOn: false, airFlow: 0
        });
        setCurrentStep(0);
        setMaxStepReached(0);
    };

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Теплопритоки (Охлаждение)"
                icon={<Thermometer size={24} />}
                iconColorClass="bg-cyan-500 shadow-cyan-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            {/* Step Progress */}
            <div className="grid grid-cols-4 gap-2">
                {STEPS.map((step, idx) => {
                    const isActive = currentStep === idx;
                    const isCompleted = idx < currentStep || (idx === 3 && currentStep === 3);
                    const isLocked = idx > maxStepReached && idx !== 3;

                    return (
                        <button
                            key={idx}
                            disabled={isLocked}
                            onClick={() => setCurrentStep(idx)}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all text-left ${
                                isActive 
                                    ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/15' 
                                    : isCompleted 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                        : 'bg-white/60 dark:bg-white/5 border-black/5 dark:border-white/5 text-slate-400'
                            } ${isLocked ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
                        >
                            <div className="flex-shrink-0">{isCompleted && !isActive ? <CheckCircle2 size={13}/> : step.icon}</div>
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">{step.title}</span>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Main Content Card */}
                <div className="lg:col-span-8 bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        {currentStep === 0 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-2">
                                    <Box size={14} className="text-cyan-500" /> Геометрия и Ограждения
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GlassSlider label="Ширина помещения (м)" val={data.width} min={1} max={50} step={0.5} onChange={(v) => setData({...data, width: v})} />
                                    <GlassSlider label="Длина помещения (м)" val={data.length} min={1} max={100} step={0.5} onChange={(v) => setData({...data, length: v})} />
                                    <GlassSlider label="Высота потолков (м)" val={data.height} min={2} max={15} step={0.1} onChange={(v) => setData({...data, height: v})} />
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Тип внешних ограждений</label>
                                        <GlassSelect 
                                            value={data.wallType}
                                            onChange={(v) => setData({...data, wallType: v as any})}
                                            options={[
                                                { value: 'Modern', label: 'Современные (Утепленные)' },
                                                { value: 'Brick_Old', label: 'Кирпич (Средние)' },
                                                { value: 'Concrete', label: 'Бетон (Холодные)' }
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-black/[0.03] dark:border-white/[0.03]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Compass size={12} /> Направление фасада: <span className="text-cyan-500">{getCardinalLabel(data.azimuth)}</span>
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-white">{data.azimuth}°</span>
                                    </div>
                                    <GlassSlider label="" val={data.azimuth} min={0} max={360} step={15} onChange={(v) => setData({...data, azimuth: v})} />
                                </div>
                            </div>
                        )}

                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-2">
                                    <Sun size={14} className="text-amber-500" /> Оконное остекление
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GlassSlider label="Площадь остекления (м²)" val={data.glassArea} min={0} max={100} step={0.5} onChange={(v) => setData({...data, glassArea: v})} />
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Тип стеклопакета</label>
                                        <GlassSelect 
                                            value={data.glassType}
                                            onChange={(v) => setData({...data, glassType: v as any})}
                                            options={[
                                                { value: 'Glass_Double', label: 'Двухкамерный' },
                                                { value: 'Glass_Single', label: 'Одинарный' }
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg ${data.isSkylight ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                            <Sun size={15} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-white">Мансардное / Наклонное окно</div>
                                            <div className="text-[9px] text-slate-500 uppercase">Горизонтальная инсоляция кровли</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setData({...data, isSkylight: !data.isSkylight})}
                                        className={`w-10 h-5.5 rounded-full transition-all relative ${data.isSkylight ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform ${data.isSkylight ? 'translate-x-[18px]' : ''}`} />
                                    </button>
                                </div>
                                <GlassSlider label="Коэффициент климатического пояса (СП 131.13330)" val={data.climateCoef} min={0.8} max={1.5} step={0.05} onChange={(v) => setData({...data, climateCoef: v})} />
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-2">
                                    <Users size={14} className="text-blue-500" /> Бытовые и другие тепловыделения
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GlassSlider label="Количество людей в помещении" val={data.people} min={0} max={100} step={1} onChange={(v) => setData({...data, people: v})} />
                                    <GlassSlider label="Оргтехника / Компьютеры (шт)" val={data.computers} min={0} max={100} step={1} onChange={(v) => setData({...data, computers: v})} />
                                </div>
                                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg ${data.ventilationOn ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                                <Wind size={15} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800 dark:text-white">Приточная вентиляция</div>
                                                <div className="text-[9px] text-slate-500 uppercase">Расчет термической нагрузки притока</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setData({...data, ventilationOn: !data.ventilationOn})}
                                            className={`w-10 h-5.5 rounded-full transition-all relative ${data.ventilationOn ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform ${data.ventilationOn ? 'translate-x-[18px]' : ''}`} />
                                        </button>
                                    </div>
                                    {data.ventilationOn && (
                                        <div className="pt-1 border-t border-black/[0.04] dark:border-white/[0.04] animate-in fade-in slide-in-from-top-1">
                                            <GlassSlider label="Расход приточного воздуха (м³/ч)" val={data.airFlow} min={0} max={2000} step={50} onChange={(v) => setData({...data, airFlow: v})} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-4 animate-in zoom-in-95 duration-500">
                                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-2">
                                    <BarChart3 size={14} className="text-emerald-500" /> Структура теплонапряженности
                                </h2>
                                
                                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-2">
                                    <div>
                                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
                                            Суммарные теплопритоки помещения (Явные)
                                        </span>
                                        <div className="text-xs font-semibold text-slate-500 tracking-wide mt-0.5">
                                            Оптимально для выбора мультизональных систем кондиционирования
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-center md:items-end">
                                        <span className="text-3xl lg:text-4xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                                            {(results.totalWatts / 1000).toFixed(2)} <span className="text-base text-cyan-500/50">кВт</span>
                                        </span>
                                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">≈ {(results.btu / 1000).toFixed(1)} kBTU/L</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 border border-black/5 dark:border-white/5 flex flex-col justify-between">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-2">Стены</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{(results.q_walls / 1000).toFixed(2)} <span className="text-[9px] text-slate-500 font-normal">кВт</span></span>
                                    </div>
                                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 border border-black/5 dark:border-white/5 flex flex-col justify-between">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-2">Окна и Солнце</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{(results.q_total_windows / 1000).toFixed(2)} <span className="text-[9px] text-slate-500 font-normal">кВт</span></span>
                                    </div>
                                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 border border-black/5 dark:border-white/5 flex flex-col justify-between">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-2">Люди и Техника</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{(results.q_internal / 1000).toFixed(2)} <span className="text-[9px] text-slate-500 font-normal">кВт</span></span>
                                    </div>
                                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 border border-black/5 dark:border-white/5 flex flex-col justify-between">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-2">Вентиляция</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{(results.q_vent / 1000).toFixed(2)} <span className="text-[9px] text-slate-500 font-normal">кВт</span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 mt-6 border-t border-black/5 dark:border-white/5">
                        <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить" onClick={handleReset} />
                        {currentStep === 3 && (
                            <GlassButton 
                                onClick={() => {
                                    const inputs = [
                                        { label: "Габариты помещения", value: `${data.width}x${data.length}x${data.height}`, unit: "м" },
                                        { label: "Площадь пола", value: results.floorArea.toFixed(1), unit: "м²" },
                                        { label: "Тип стен конструкции", value: data.wallType === 'Brick_Old' ? "Старый кирпич" : data.wallType === 'Concrete' ? "Бетоные блоки" : "Современный сэндвич", unit: "" },
                                        { label: "Азимут фасада", value: data.azimuth.toString(), unit: "°" },
                                        { label: "Остекление окон", value: data.glassType === 'Glass_Double' ? "Двойное (Стеклопакет)" : "Одинарное стекло", unit: "" },
                                        { label: "Площадь окон", value: data.glassArea.toString(), unit: "м²" },
                                        { label: "Количество людей", value: data.people.toString(), unit: "" },
                                        { label: "Компьютеры и оргтехника", value: data.computers.toString(), unit: "" },
                                        { label: "Мощность освещения", value: data.lighting ? "Включено" : "Отсутствует", unit: "" },
                                        { label: "Приточная вентиляция", value: data.airFlow.toString(), unit: "м³/ч" }
                                    ];

                                    const outputs = [
                                        { label: "Теплопритоки через ограждающие конструкции", value: Math.round(results.q_walls), unit: "Вт" },
                                        { label: "Теплопритоки через окна и инсоляцию", value: Math.round(results.q_total_windows), unit: "Вт" },
                                        { label: "Теплопритоки от людей и техники", value: Math.round(results.q_internal), unit: "Вт" },
                                        { label: "Вентиляционная нагрузка", value: Math.round(results.q_vent), unit: "Вт" },
                                        { label: "Суммарная нагрузка охлаждения", value: (results.totalWatts / 1000).toFixed(2), unit: "кВт" },
                                        { label: "Суммарная нагрузка в BTU/h", value: Math.round(results.btu), unit: "BTU/ч" }
                                    ];

                                    const formulas = [
                                        { text: "Теплопередача стен (Q_walls)", math: "Q_walls = F_walls * k * ΔT (ΔT условно 10°C)" },
                                        { text: "Инсоляция через окна (Q_sun)", math: "Q_sun = F_window * q_solar * k_glazing" },
                                        { text: "Вентиляционные притоки (Q_vent)", math: "Q_vent = L * ρ * Cp * ΔT (ΔT условно 10°C)" }
                                    ];

                                    downloadReport(
                                        "Тепловой баланс и расчет холодильной мощности",
                                        inputs,
                                        outputs,
                                        formulas,
                                        [
                                            "Расчет выполнен по инженерному методу теплопритоков для предварительного подбора оборудования.",
                                            "Рекомендуется устанавливать кондиционер с запасом холодопроизводительности в диапазоне от 5% до 15% от расчетного теплопритока.",
                                            "Метод учитывает инсоляцию помещений по азимуту согласно СНиП 41-01-2003."
                                        ]
                                    );
                                }} 
                                label="Скачать отчет" 
                                icon={<FileText size={14}/>} 
                            />
                        )}
                        {currentStep < 3 && (
                            <GlassButton 
                                onClick={handleNext} 
                                label="Далее" 
                                icon={<ChevronRight size={14}/>} 
                                disabled={!STEPS[currentStep].isValid}
                            />
                        )}
                    </div>
                </div>

                {/* Info / Summary Card (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1">
                        <div>
                            <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-1.5">
                                <Globe size={14} className="text-cyan-500" /> Параметры объекта
                            </h2>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center py-1.5 border-b border-black/5 dark:border-white/[0.03]">
                                    <span className="text-slate-500">Площадь пола</span>
                                    <span className="font-bold text-slate-800 dark:text-white font-mono">{results.floorArea.toFixed(1)} м²</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-black/5 dark:border-white/[0.03]">
                                    <span className="text-slate-500">Объем помещения</span>
                                    <span className="font-bold text-slate-800 dark:text-white font-mono">{(results.floorArea * data.height).toFixed(1)} м³</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-black/5 dark:border-white/[0.03]">
                                    <span className="text-slate-500">Уд. тепловыделения</span>
                                    <span className="font-bold text-slate-800 dark:text-white font-mono">{(results.totalWatts / results.floorArea).toFixed(0)} Вт/м²</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3.5 mt-4 text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            <h3 className="font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">Методология</h3>
                            Учитывает суммарный радиационный и трансмиссионный нагрев согласно СП 60.13330 (Отопление, вентиляция и кондиционирование воздуха).
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoolingCalculator;
