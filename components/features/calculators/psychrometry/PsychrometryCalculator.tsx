import React, { useMemo, useState } from 'react';
import { CloudRain, Thermometer, Droplets, RotateCcw, Activity, Gauge, Waves, HelpCircle, Heart, Zap, CheckCircle2, FileText, Share2, HelpCircle as HelpIcon } from 'lucide-react';
import { AppHeader, GlassButton, GlassSlider, GlassSelect } from '../../../ui/Shared';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';
import { downloadReport } from '../../../ui/reportGenerator';

interface PsychrometryState {
    dryBulb: number;
    relHum: number;
    pressure: number;
}

const PsychrometryCalculator = ({ onBack, onHome }: any) => {
    const [calcState, setCalcState] = useLocalStorage<PsychrometryState>('hvac-calc-psychrometry', {
        dryBulb: 24,
        relHum: 50,
        pressure: 101.325
    });

    const { dryBulb, relHum, pressure } = calcState;
    const [isDraggingChart, setIsDraggingChart] = useState(false);

    // Thermodynamic Process States
    const [processMode, setProcessMode] = useState<'none' | 'heating' | 'humidification' | 'cooling' | 'mixing'>('none');
    const [targetTemp, setTargetTemp] = useState(35); // Heating & Cooling target
    const [targetHum, setTargetHum] = useState(85); // Adiabatic Humidification target RH
    const [extTemp, setExtTemp] = useState(5); // Outdoor air temp for mixing
    const [extHum, setExtHum] = useState(80); // Outdoor air RH for mixing
    const [mixRatio, setMixRatio] = useState(30); // Outdoor air percentage

    // CONSTANTS FOR CHART CONFIGURATION
    const tMin = 0;
    const tMax = 50;
    const dMin = 0;
    const dMax = 25;

    const width = 500;
    const height = 300;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 35;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Direct mapping: value to pixel
    const getX = (t: number) => paddingLeft + ((t - tMin) / (tMax - tMin)) * plotWidth;
    const getY = (d: number) => height - paddingBottom - ((d - dMin) / (dMax - dMin)) * plotHeight;

    const results = useMemo(() => {
        const A = 17.625;
        const B = 243.04;

        const es_hPa = 6.1094 * Math.exp((A * dryBulb) / (B + dryBulb));
        const pv_kPa = (es_hPa * (relHum / 100)) / 10;
        const safePv = Math.min(pv_kPa, pressure - 0.1);
        const d = 622 * safePv / (pressure - safePv);
        const h = 1.006 * dryBulb + (d / 1000) * (2501 + 1.86 * dryBulb);
        
        const safeRH = Math.max(relHum, 0.1);
        const alpha = Math.log(safeRH / 100) + ((A * dryBulb) / (B + dryBulb));
        const t_dp = (B * alpha) / (A - alpha);

        const Tk = dryBulb + 273.15;
        const rho = ((pressure - safePv) * 1000) / (287.05 * Tk) + (safePv * 1000) / (461.5 * Tk);

        const T = dryBulb;
        const RH = safeRH;
        const tw = T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) + 
                   Math.atan(T + RH) - 
                   Math.atan(RH - 1.676331) + 
                   0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 
                   4.686035;

        return {
            enthalpy: h,
            moistureContent: d,
            dewPoint: t_dp,
            density: rho,
            wetBulb: tw,
            vaporPressure: pv_kPa
        };
    }, [dryBulb, relHum, pressure]);

    const processPointB = useMemo(() => {
        if (processMode === 'none') return null;
        
        const A = 17.625;
        const B = 243.04;
        
        if (processMode === 'heating') {
            const dB = results.moistureContent;
            const tB = targetTemp;
            const es_hB = 6.1094 * Math.exp((A * tB) / (B + tB));
            const es_kB = es_hB / 10;
            const pv = (pressure * dB) / (622 + dB);
            let rhB = (pv / es_kB) * 100;
            rhB = Math.max(0.1, Math.min(100, rhB));
            const hB = 1.006 * tB + (dB / 1000) * (2501 + 1.86 * tB);
            return { t: tB, rh: rhB, d: dB, h: hB };
        }
        
        if (processMode === 'humidification') {
            const hA = results.enthalpy;
            const rhB = targetHum;
            let low = results.wetBulb;
            let high = dryBulb;
            let bestT = (low + high) / 2;
            for (let i = 0; i < 15; i++) {
                const mid = (low + high) / 2;
                const es = 6.1094 * Math.exp((A * mid) / (B + mid));
                const pv = (es * (rhB / 100)) / 10;
                const safePv = Math.min(pv, pressure - 0.1);
                const d = 622 * safePv / (pressure - safePv);
                const h = 1.006 * mid + (d / 1000) * (2501 + 1.86 * mid);
                if (h < hA) {
                    low = mid;
                } else {
                    high = mid;
                }
                bestT = mid;
            }
            const es = 6.1094 * Math.exp((A * bestT) / (B + bestT));
            const pv = (es * (rhB / 100)) / 10;
            const safePv = Math.min(pv, pressure - 0.1);
            const d = 622 * safePv / (pressure - safePv);
            return { t: bestT, rh: rhB, d: d, h: hA };
        }
        
        if (processMode === 'cooling') {
            const tB = targetTemp;
            if (tB >= results.dewPoint) {
                const dB = results.moistureContent;
                const es_hB = 6.1094 * Math.exp((A * tB) / (B + tB));
                const es_kB = es_hB / 10;
                const pv = (pressure * dB) / (622 + dB);
                let rhB = (pv / es_kB) * 100;
                rhB = Math.max(0.1, Math.min(100, rhB));
                const hB = 1.006 * tB + (dB / 1000) * (2501 + 1.86 * tB);
                return { t: tB, rh: rhB, d: dB, h: hB };
            } else {
                const rhB = 99.9;
                const es = 6.1094 * Math.exp((A * tB) / (B + tB));
                const pv = (es * (rhB / 100)) / 10;
                const safePv = Math.min(pv, pressure - 0.1);
                const dB = 622 * safePv / (pressure - safePv);
                const hB = 1.006 * tB + (dB / 1000) * (2501 + 1.86 * tB);
                return { t: tB, rh: rhB, d: dB, h: hB };
            }
        }
        
        if (processMode === 'mixing') {
            const es_ext = 6.1094 * Math.exp((A * extTemp) / (B + extTemp));
            const pv_ext = (es_ext * (extHum / 100)) / 10;
            const d_ext = 622 * pv_ext / (pressure - pv_ext);
            const h_ext = 1.006 * extTemp + (d_ext / 1000) * (2501 + 1.86 * extTemp);
            
            const alpha = mixRatio / 100;
            const tM = dryBulb * (1 - alpha) + extTemp * alpha;
            const dM = results.moistureContent * (1 - alpha) + d_ext * alpha;
            const hM = results.enthalpy * (1 - alpha) + h_ext * alpha;
            
            const es_hM = 6.1094 * Math.exp((A * tM) / (B + tM));
            const es_kM = es_hM / 10;
            const pvM = (pressure * dM) / (622 + dM);
            let rhM = (pvM / es_kM) * 100;
            rhM = Math.max(0.1, Math.min(100, rhM));
            
            return {
                t: tM, rh: rhM, d: dM, h: hM,
                ext: { t: extTemp, rh: extHum, d: d_ext, h: h_ext }
            };
        }
        
        return null;
    }, [processMode, dryBulb, results, targetTemp, targetHum, extTemp, extHum, mixRatio, pressure]);


    // Convert pixel to values and return t & rh
    const getValFromCoords = (clickX: number, clickY: number) => {
        const pctX = (clickX - paddingLeft) / plotWidth;
        let t = tMin + pctX * (tMax - tMin);
        t = Math.max(tMin, Math.min(tMax, t));
        
        const pctY = (height - paddingBottom - clickY) / plotHeight;
        let d = dMin + pctY * (dMax - dMin);
        d = Math.max(dMin, Math.min(dMax, d));
        
        const pv = (pressure * d) / (622 + d);
        const A = 17.625;
        const B = 243.04;
        const es_hPa = 6.1094 * Math.exp((A * t) / (B + t));
        const es_kPa = es_hPa / 10;
        
        let rh = (pv / es_kPa) * 100;
        rh = Math.max(0.1, Math.min(100, rh));
        
        return { t: Math.round(t), rh: Math.round(rh) };
    };

    const handleChartInteraction = (clientX: number, clientY: number, target: SVGSVGElement) => {
        const rect = target.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;
        const { t, rh } = getValFromCoords(clickX, clickY);
        setCalcState(prev => ({ ...prev, dryBulb: t, relHum: rh }));
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        setIsDraggingChart(true);
        handleChartInteraction(e.clientX, e.clientY, e.currentTarget);
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDraggingChart) return;
        handleChartInteraction(e.clientX, e.clientY, e.currentTarget);
    };

    const handleMouseUpOrLeave = () => {
        setIsDraggingChart(false);
    };

    const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 0) return;
        setIsDraggingChart(true);
        handleChartInteraction(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    };

    const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 0 || !isDraggingChart) return;
        if (e.cancelable) e.preventDefault();
        handleChartInteraction(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    };

    // GENERATING GRAPH PRESETS
    const rhPaths = useMemo(() => {
        const rhs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const curves: { rh: number; path: string }[] = [];
        const A = 17.625;
        const B = 243.04;
        
        rhs.forEach(rhVal => {
            const points = [];
            for (let t = tMin; t <= tMax; t += 1) {
                const es_hPa = 6.1094 * Math.exp((A * t) / (B + t));
                const pv_kPa = (es_hPa * (rhVal / 100)) / 10;
                const safePv = Math.min(pv_kPa, pressure - 0.1);
                const d = 622 * safePv / (pressure - safePv);
                points.push(`${getX(t).toFixed(1)},${getY(d).toFixed(1)}`);
            }
            curves.push({
                rh: rhVal,
                path: `M ${points.join(' L ')}`
            });
        });
        return curves;
    }, [pressure]);

    // COMFORT ZONE AREA PATH COORDS (ABOK Standards: 20-25°C, 30-60% RH)
    const comfortZonePath = useMemo(() => {
        const A = 17.625;
        const B = 243.04;
        const points: string[] = [];
        
        // Curve along RH = 60% (from t=20 to t=25)
        for (let t = 20; t <= 25; t += 0.5) {
            const es_hPa = 6.1094 * Math.exp((A * t) / (B + t));
            const pv_kPa = (es_hPa * 0.6) / 10;
            const d = 622 * pv_kPa / (pressure - pv_kPa);
            points.push(`${getX(t).toFixed(1)},${getY(d).toFixed(1)}`);
        }
        
        // Curve along RH = 30% (from t=25 back to t=20)
        for (let t = 25; t >= 20; t -= 0.5) {
            const es_hPa = 6.1094 * Math.exp((A * t) / (B + t));
            const pv_kPa = (es_hPa * 0.3) / 10;
            const d = 622 * pv_kPa / (pressure - pv_kPa);
            points.push(`${getX(t).toFixed(1)},${getY(d).toFixed(1)}`);
        }
        
        return `M ${points.join(' L ')} Z`;
    }, [pressure]);

    const activePointCoords = useMemo(() => {
        return {
            x: getX(dryBulb),
            y: getY(results.moistureContent)
        };
    }, [dryBulb, results.moistureContent]);

    const coolingPath = useMemo(() => {
        if (processMode !== 'cooling' || targetTemp >= results.dewPoint) return '';
        const tdp = results.dewPoint;
        const pts = [];
        pts.push(`${activePointCoords.x.toFixed(1)},${activePointCoords.y.toFixed(1)}`);
        pts.push(`${getX(tdp).toFixed(1)},${getY(results.moistureContent).toFixed(1)}`);
        const steps = 10;
        const tStart = tdp;
        const tEnd = targetTemp;
        const A = 17.625;
        const B = 243.04;
        for (let i = 1; i <= steps; i++) {
            const t = tStart - (i / steps) * (tStart - tEnd);
            const es_hPa = 6.1094 * Math.exp((A * t) / (B + t));
            const pv_kPa = es_hPa / 10;
            const safePv = Math.min(pv_kPa, pressure - 0.1);
            const d = 622 * safePv / (pressure - safePv);
            pts.push(`${getX(t).toFixed(1)},${getY(d).toFixed(1)}`);
        }
        return `M ${pts.join(' L ')}`;
    }, [processMode, targetTemp, results.dewPoint, activePointCoords, pressure, results.moistureContent]);

    const handleReset = () => {
        setCalcState({
            dryBulb: 24,
            relHum: 50,
            pressure: 101.325
        });
    };

    return (
        <div className="max-w-[1440px] mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-12 px-4">
            <AppHeader
                title="Психрометрия"
                subtitle="d-t диаграмма влажного воздуха"
                icon={<CloudRain size={24} />}
                iconColorClass="bg-sky-500 shadow-sky-500/20"
                onBack={onBack}
                onHome={onHome}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Inputs & Processes */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Controls */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Thermometer size={14} className="text-sky-500" /> Слайдеры параметров
                        </h2>
                        <div className="space-y-4">
                            <GlassSlider 
                                label="Температура по сухому термометру" 
                                val={dryBulb} min={0} max={50} step={1} unit="°C"
                                onChange={(v) => setCalcState(prev => ({ ...prev, dryBulb: v }))} 
                            />
                            <GlassSlider 
                                label="Относительная влажность" 
                                val={relHum} min={1} max={100} step={1} unit="%"
                                onChange={(v) => setCalcState(prev => ({ ...prev, relHum: v }))} 
                            />
                            <GlassSlider 
                                label="Атмосферное давление" 
                                val={pressure} min={80} max={120} step={0.1} unit=" кПа"
                                onChange={(v) => setCalcState(prev => ({ ...prev, pressure: v }))} 
                            />
                        </div>
                    </div>

                    {/* Air Processes Controls */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Waves className="text-sky-500" size={14} /> Обработка воздуха
                                </h3>
                                <p className="text-[10px] text-slate-500">Визуализация процессов в реальном времени</p>
                            </div>

                            <GlassSelect
                                value={processMode}
                                onChange={(val: any) => setProcessMode(val)}
                                options={[
                                    { value: 'none', label: 'Нет активного процесса' },
                                    { value: 'heating', label: 'Нагрев в калорифере' },
                                    { value: 'cooling', label: 'Охлаждение (Осушение)' },
                                    { value: 'humidification', label: 'Адиабатное увлажнение' },
                                    { value: 'mixing', label: 'Смешение двух потоков' }
                                ]}
                            />

                            {/* Process Configuration Sliders */}
                            {processMode !== 'none' && (
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                    {(processMode === 'heating') && (
                                        <GlassSlider 
                                            label="Целевая температура нагрева" 
                                            val={targetTemp} min={dryBulb} max={50} step={1} unit="°C"
                                            onChange={(v: number) => setTargetTemp(v)} 
                                        />
                                    )}

                                    {(processMode === 'cooling') && (
                                        <GlassSlider 
                                            label="Целевая температура охлаждения" 
                                            val={targetTemp} min={0} max={dryBulb} step={1} unit="°C"
                                            onChange={(v: number) => setTargetTemp(v)} 
                                        />
                                    )}

                                    {processMode === 'humidification' && (
                                        <GlassSlider 
                                            label="Целевая влажность увлажнения" 
                                            val={targetHum} min={relHum} max={95} step={1} unit="%"
                                            onChange={(v: number) => setTargetHum(v)} 
                                        />
                                    )}

                                    {processMode === 'mixing' && (
                                        <div className="space-y-3">
                                            <GlassSlider 
                                                label="Температура наружного воздуха" 
                                                val={extTemp} min={-20} max={40} step={1} unit="°C"
                                                onChange={(v: number) => setExtTemp(v)} 
                                            />
                                            <GlassSlider 
                                                label="Влажность наружного воздуха" 
                                                val={extHum} min={10} max={100} step={5} unit="%"
                                                onChange={(v: number) => setExtHum(v)} 
                                            />
                                            <GlassSlider 
                                                label="Доля наружного воздуха" 
                                                val={mixRatio} min={0} max={100} step={5} unit="%"
                                                onChange={(v: number) => setMixRatio(v)} 
                                            />
                                        </div>
                                    )}

                                    {/* Calculated output results of process */}
                                    {processPointB && (
                                        <div className="pt-2 border-t border-dashed border-slate-200 dark:border-white/10 space-y-1.5">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Параметры конечной точки:</div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 px-2 py-1 rounded-lg font-mono text-[10px] flex justify-between">
                                                    <span className="text-slate-500">t_конеч:</span> 
                                                    <span className="font-extrabold text-slate-800 dark:text-white">{processPointB.t.toFixed(1)}°C</span>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 px-2 py-1 rounded-lg font-mono text-[10px] flex justify-between">
                                                    <span className="text-slate-500">RH_конеч:</span> 
                                                    <span className="font-extrabold text-slate-800 dark:text-white">{processPointB.rh.toFixed(0)}%</span>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 px-2 py-1 rounded-lg font-mono text-[10px] flex justify-between">
                                                    <span className="text-slate-500">d_конеч:</span> 
                                                    <span className="font-extrabold text-slate-800 dark:text-white">{processPointB.d.toFixed(1)} г/кг</span>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 px-2 py-1 rounded-lg font-mono text-[10px] flex justify-between">
                                                    <span className="text-slate-500">h_конеч:</span> 
                                                    <span className="font-extrabold text-slate-800 dark:text-white">{processPointB.h.toFixed(1)} кДж</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Control Actions */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                <GlassButton secondary icon={<RotateCcw size={14}/>} label="Сбросить всё" onClick={() => {
                                    handleReset();
                                    setProcessMode('none');
                                }} />
                                <GlassButton 
                                    label="Отчет" 
                                    icon={<FileText size={14} />} 
                                    onClick={() => {
                                        const inputs = [
                                            { label: "Температура сухого термометра A", value: dryBulb.toFixed(1), unit: "°C" },
                                            { label: "Относительная влажность A", value: relHum.toFixed(0), unit: "%" },
                                            { label: "Атмосферное давление", value: pressure.toFixed(3), unit: "кПа" }
                                        ];
                                        if (processMode !== 'none' && processPointB) {
                                            const modeNames: Record<string, string> = {
                                                heating: "Нагрев в калорифере",
                                                cooling: "Охраждение и осушение",
                                                humidification: "Адиабатное увлажнение",
                                                mixing: "Смешение потоков"
                                            };
                                            inputs.push({ label: "Моделируемый процесс", value: modeNames[processMode] || processMode, unit: "" });
                                            if (processMode === 'heating' || processMode === 'cooling') {
                                                inputs.push({ label: "Целевая температура", value: targetTemp.toFixed(1), unit: "°C" });
                                            } else if (processMode === 'humidification') {
                                                inputs.push({ label: "Целевая влажность", value: targetHum.toFixed(0), unit: "%" });
                                            } else if (processMode === 'mixing') {
                                                inputs.push({ label: "Параметры уличного воздуха", value: `${extTemp}°C / ${extHum}%`, unit: "" });
                                                inputs.push({ label: "Доля уличного притока", value: mixRatio.toFixed(0), unit: "%" });
                                            }
                                        }

                                        const outputs = [
                                            { label: "Влагосодержание состояния A", value: results.moistureContent.toFixed(2), unit: "г/кг" },
                                            { label: "Энтальпия состояния A", value: results.enthalpy.toFixed(1), unit: "кДж/кг" },
                                            { label: "Точка росы состояния A", value: results.dewPoint.toFixed(1), unit: "°C" },
                                            { label: "Температура мокрого термометра", value: results.wetBulb.toFixed(1), unit: "°C" },
                                            { label: "Плотность влажного воздуха A", value: results.density.toFixed(2), unit: "кг/м³" },
                                            { label: "Парциальное давление пара A", value: results.vaporPressure.toFixed(2), unit: "кПа" }
                                        ];
                                        if (processMode !== 'none' && processPointB) {
                                            outputs.push({ label: "Конечная температура процесса", value: processPointB.t.toFixed(1), unit: "°C" });
                                            outputs.push({ label: "Конечная относительная влажность", value: processPointB.rh.toFixed(0), unit: "%" });
                                            outputs.push({ label: "Конечная энтальпия", value: processPointB.h.toFixed(1), unit: "кДж/кг" });
                                            outputs.push({ label: "Конечная влагосодержание", value: processPointB.d.toFixed(1), unit: "г/кг" });
                                        }

                                        const formulas = [
                                            { text: "Формула Магнуса для давления насыщения (es)", math: "es = 6.1094 * exp(17.625 * t / (243.04 + t)) (в гПа)" },
                                            { text: "Зависимость влагосодержания от парциального давления (pv)", math: "d = 622 * pv / (P - pv) (в г/кг)" },
                                            { text: "Формула энтальпии влажного воздуха (h)", math: "h = 1.006 * t + d/1000 * (2501 + 1.86 * t) (в кДж/кг)" }
                                        ];

                                        downloadReport(
                                            processMode !== 'none' ? `Термодинамический процесс: ${processMode === 'heating' ? 'Нагрев' : processMode === 'cooling' ? 'Охлаждение' : processMode === 'humidification' ? 'Увлажнение' : 'Смешение'}` : "Психрометрическое состояние воздуха",
                                            inputs,
                                            outputs,
                                            formulas,
                                            [
                                                "Расчет параметров выполнен в соответствии с уравнением состояния идеального газа и классическими эмпирическими зависимостями.",
                                                "Адиабатное увлажнение следует по вектору постоянной энтальпии (h = const).",
                                                "При охлаждении ниже точки росы происходит конденсация, сопровождаемая уменьшением влагосодержания d и осушением воздуха."
                                            ]
                                        );
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center Column: d-t Diagram */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/50 dark:bg-[#0a0a0f]/80 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                    <div className="w-full flex justify-between items-center mb-2 px-1">
                        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity size={12} className="text-sky-500" /> Интерактивная d-t диаграмма
                        </h2>
                        <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold px-2 py-0.5 rounded-full select-none">
                            Кликните и тащите маркер
                        </span>
                    </div>
                    
                    <div className="relative w-full aspect-[500/380] bg-white dark:bg-black/50 border border-slate-200/50 dark:border-white/5 shadow-inner rounded-xl overflow-hidden cursor-crosshair">
                        <svg 
                            width="100%" 
                            height="100%" 
                            viewBox={`0 0 ${width} ${height}`} 
                            preserveAspectRatio="xMidYMid meet"
                            className="h-full w-full select-none touch-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleMouseUpOrLeave}
                        >
                            {/* Grid Background Lines (Temperature) */}
                            {[0, 10, 20, 30, 40, 50].map(t => (
                                <g key={`t-grid-${t}`}>
                                    <line 
                                        x1={getX(t)} y1={paddingTop} 
                                        x2={getX(t)} y2={height - paddingBottom} 
                                        className="stroke-black/5 dark:stroke-white/5" 
                                        strokeWidth={1}
                                    />
                                    <text 
                                        x={getX(t)} y={height - paddingBottom + 16} 
                                        textAnchor="middle" 
                                        className="fill-slate-500/80 dark:fill-slate-400 text-[10px] font-mono font-medium"
                                    >
                                        {t}°
                                    </text>
                                </g>
                            ))}

                            {/* Grid Background Lines (Moisture content d) */}
                            {[0, 5, 10, 15, 20, 25].map(d => (
                                <g key={`d-grid-${d}`}>
                                    <line 
                                        x1={paddingLeft} y1={getY(d)} 
                                        x2={width - paddingRight} y2={getY(d)} 
                                        className="stroke-black/5 dark:stroke-white/5" 
                                        strokeWidth={1}
                                        strokeDasharray="2,4"
                                    />
                                    <text 
                                        x={paddingLeft - 8} y={getY(d) + 3} 
                                        textAnchor="end" 
                                        className="fill-slate-500/80 dark:fill-slate-400 text-[10px] font-mono font-medium"
                                    >
                                        {d}
                                    </text>
                                </g>
                            ))}

                            {/* Comfort Zone Area (Translucent polygon) */}
                            <g>
                                <path 
                                    d={comfortZonePath} 
                                    className="fill-emerald-500/15 dark:fill-emerald-500/10 stroke-emerald-500/20" 
                                    strokeWidth={1} 
                                    strokeDasharray="2,2"
                                />
                                {/* Tiny Heart / Smile label inside Comfort Zone */}
                                <text 
                                    x={getX(22.5)} y={getY(8.5)} 
                                    textAnchor="middle" 
                                    className="fill-emerald-600/60 dark:fill-emerald-400/60 text-[9px] font-bold uppercase tracking-wider select-none pointer-events-none"
                                >
                                    Комфорт
                                </text>
                            </g>

                            {/* Constant RH Curves */}
                            {rhPaths.map(({ rh, path }) => (
                                <g key={`rh-curve-${rh}`}>
                                    <path 
                                        d={path} 
                                        fill="none" 
                                        className={rh === 100 
                                            ? "stroke-sky-500/50 dark:stroke-sky-400/60" 
                                            : "stroke-slate-400/20 dark:stroke-slate-500/20"
                                        } 
                                        strokeWidth={rh === 100 ? 2 : 1}
                                    />
                                    {/* Label on curve near t=40 */}
                                    {rh % 20 === 0 && (
                                        <text 
                                            x={getX(38)} y={getY(0.001) - 15} 
                                            className="text-[8px] font-mono fill-slate-500/50 dark:fill-slate-400/30 font-bold"
                                            dy={rh === 100 ? -8 : -2}
                                            dx={-10}
                                            textAnchor="middle"
                                        >
                                            {rh}%
                                        </text>
                                    )}
                                </g>
                            ))}

                            {/* Chart Axis Labels */}
                            <text 
                                x={paddingLeft + plotWidth / 2} y={height - 4} 
                                textAnchor="middle" 
                                className="fill-slate-500 font-bold text-[9px] tracking-widest uppercase opacity-75"
                            >
                                Температура t (°C)
                            </text>
                            
                            <text 
                                x={10} y={paddingTop + plotHeight / 2} 
                                textAnchor="middle" 
                                transform={`rotate(-90, ${10}, ${paddingTop + plotHeight / 2})`}
                                className="fill-slate-500 font-bold text-[9px] tracking-widest uppercase opacity-75"
                            >
                                Влагосодержание d (г/кг)
                            </text>

                            {/* Dynamic Process vectors on diagram */}
                            {processMode === 'heating' && processPointB && (
                                <line 
                                    x1={activePointCoords.x} y1={activePointCoords.y} 
                                    x2={getX(processPointB.t)} y2={getY(processPointB.d)} 
                                    className="stroke-orange-500" strokeWidth={2.5}
                                />
                            )}
                            {processMode === 'humidification' && processPointB && (
                                <line 
                                    x1={activePointCoords.x} y1={activePointCoords.y} 
                                    x2={getX(processPointB.t)} y2={getY(processPointB.d)} 
                                    className="stroke-teal-500" strokeWidth={2.5}
                                />
                            )}
                            {processMode === 'cooling' && processPointB && (
                                <path 
                                    d={coolingPath} fill="none"
                                    className="stroke-blue-500" strokeWidth={2.5}
                                />
                            )}
                            {processMode === 'mixing' && processPointB && (
                                <>
                                    <line 
                                        x1={activePointCoords.x} y1={activePointCoords.y} 
                                        x2={getX(extTemp)} y2={getY(622 * (6.1094 * Math.exp((17.625 * extTemp) / (243.04 + extTemp)) * (extHum/100)/10) / (pressure - (6.1094 * Math.exp((17.625 * extTemp) / (243.04 + extTemp)) * (extHum/100)/10)))} 
                                        className="stroke-slate-400 stroke-dashed" strokeWidth={1.5}
                                    />
                                    <circle 
                                        cx={getX(processPointB.t)} cy={getY(processPointB.d)} r={5}
                                        className="fill-sky-500 stroke-white" strokeWidth={1}
                                    />
                                    <circle 
                                        cx={getX(extTemp)} cy={getY(622 * (6.1094 * Math.exp((17.625 * extTemp) / (243.04 + extTemp)) * (extHum/100)/10) / (pressure - (6.1094 * Math.exp((17.625 * extTemp) / (243.04 + extTemp)) * (extHum/100)/10)))} r={5}
                                        className="fill-slate-400 stroke-white" strokeWidth={1}
                                    />
                                </>
                            )}

                            {/* Interactive Guidelines to Current Point */}
                            <line 
                                x1={getX(dryBulb)} y1={getY(results.moistureContent)} 
                                x2={getX(dryBulb)} y2={height - paddingBottom} 
                                className="stroke-sky-500/30 dark:stroke-sky-400/30" 
                                strokeWidth={1} 
                                strokeDasharray="3,3"
                            />
                            <line 
                                x1={paddingLeft} y1={getY(results.moistureContent)} 
                                x2={getX(dryBulb)} y2={getY(results.moistureContent)} 
                                className="stroke-sky-500/30 dark:stroke-sky-400/30" 
                                strokeWidth={1} 
                                strokeDasharray="3,3"
                            />

                            {/* Glowing Target marker pointing current active climate state */}
                            <circle 
                                cx={activePointCoords.x} 
                                cy={activePointCoords.y} 
                                r={10} 
                                className="fill-sky-500/20 animate-ping pointer-events-none"
                            />
                            <circle 
                                cx={activePointCoords.x} 
                                cy={activePointCoords.y} 
                                r={5} 
                                className="fill-sky-600 dark:fill-sky-400 stroke-white dark:stroke-slate-950 pointer-events-none" 
                                strokeWidth={1.5}
                                style={{ filter: "drop-shadow(0px 2px 4px rgba(14, 165, 233, 0.5))" }}
                            />
                        </svg>
                    </div>
                </div>

                {/* Right Column: High Density Results & Handbook */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Indicators */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Activity size={14} className="text-sky-500" /> Показатели состояния
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 px-3 rounded-xl bg-sky-50 dark:bg-sky-500/5 flex flex-col items-center justify-center text-center border border-sky-500/10">
                                <span className="text-[9px] font-bold text-sky-600/70 dark:text-sky-400 uppercase tracking-wide mb-1 flex items-center gap-0.5"><Zap size={10} /> Энтальпия (I)</span>
                                <span className="text-lg font-black font-mono text-sky-600 dark:text-sky-400">{results.enthalpy.toFixed(1)} <span className="text-[10px] opacity-60">кДж</span></span>
                            </div>
                            <div className="p-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/5 flex flex-col items-center justify-center text-center border border-indigo-500/10">
                                <span className="text-[9px] font-bold text-indigo-600/70 dark:text-indigo-400 uppercase tracking-wide mb-1 flex items-center gap-0.5"><Droplets size={10} /> Влагосод. (d)</span>
                                <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">{results.moistureContent.toFixed(1)} <span className="text-[10px] opacity-60">г/кг</span></span>
                            </div>
                        </div>

                        <div className="space-y-1.5 font-mono">
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl px-2.5 py-1.5 border border-black/5 dark:border-white/5 flex items-center justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Точка росы</span>
                                <span className="text-xs font-black text-slate-800 dark:text-white">{results.dewPoint.toFixed(1)} <span className="text-[9px] text-slate-500">°C</span></span>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl px-2.5 py-1.5 border border-black/5 dark:border-white/5 flex items-center justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Мокрый терм.</span>
                                <span className="text-xs font-black text-slate-800 dark:text-white">{results.wetBulb.toFixed(1)} <span className="text-[9px] text-slate-500">°C</span></span>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl px-2.5 py-1.5 border border-black/5 dark:border-white/5 flex items-center justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Плотность</span>
                                <span className="text-xs font-black text-slate-800 dark:text-white">{results.density.toFixed(2)} <span className="text-[9px] text-slate-500">кг/м³</span></span>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl px-2.5 py-1.5 border border-black/5 dark:border-white/5 flex items-center justify-between hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Парц. давл.</span>
                                <span className="text-xs font-black text-slate-800 dark:text-white">{results.vaporPressure.toFixed(2)} <span className="text-[9px] text-slate-500">кПа</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Sправочник */}
                    <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm flex-1">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <HelpCircle size={14} className="text-blue-500" /> Микро-справочник
                        </h2>
                        
                        <div className="space-y-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                            <div className="p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">ГОСТ 30494-2011</span>: оптимальная зона t = 20...24 °C, RH = 30...60%. Обозначена зеленым заштрихованным полем.
                            </div>
                            <div className="p-2 bg-sky-500/5 rounded-lg border border-sky-500/10">
                                <span className="font-bold text-sky-600 dark:text-sky-400">Точка росы (t_dp)</span>: температура, при которой влага выпадает в конденсат при охлаждении.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PsychrometryCalculator;
