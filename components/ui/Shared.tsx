import React from 'react';
import { Home, ChevronLeft, ChevronDown } from 'lucide-react';

// --- HEADER ---
export const AppHeader = ({ title, subtitle, icon, iconColorClass = "bg-blue-500 shadow-blue-500/20", onBack, onHome, rightContent }: any) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white shadow-lg ${iconColorClass}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span>{title}</span>
                {subtitle && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-0.5">{subtitle}</span>}
            </div>
        </h1>
        <div className="flex items-center gap-2">
            {rightContent}
            {onBack && <GlassButton secondary onClick={onBack} label="Назад" icon={<ChevronLeft size={16} />} />}
            {onHome && <GlassButton secondary onClick={onHome} label="Главная" icon={<Home size={16} />} />}
        </div>
    </div>
);

// --- SECTION HEADER ---
export const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <div className="flex items-center gap-2 text-slate-400 mb-3 px-1">
        <div className="text-blue-600 dark:text-blue-400">{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">{title}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-black/5 dark:from-white/10 to-transparent ml-2"></div>
    </div>
);

// --- METRIC (GLASS) ---
export const GlassMetric = ({ label, value, unit, color }: any) => (
    <div className="flex flex-col items-center min-w-[90px] p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-default">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className={`font-mono text-xl font-black ${color} drop-shadow-sm dark:drop-shadow-md`}>{value}</span>
            <span className="text-[10px] text-slate-500 font-bold">{unit}</span>
        </div>
    </div>
);

// --- LIQUID BUTTON ---
export const GlassButton = ({ onClick, icon, label, active, secondary, customClass, disabled }: any) => {
    let base = "relative overflow-hidden group h-12 px-5 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wide shadow-sm active:scale-95 ";
    
    // Active / Primary Style
    let style = active 
        ? "bg-blue-600 text-white shadow-blue-500/30 border border-blue-400/50" 
        : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-black dark:hover:text-white";

    if (secondary) {
         style = active 
            ? "bg-white text-black shadow-black/5" 
            : "bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10";
    }

    if (customClass) style = customClass;
    if (disabled) style += " opacity-50 cursor-not-allowed grayscale";

    return (
        <button onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className={active ? 'scale-110' : 'group-hover:scale-110 transition-transform duration-300'}>{icon}</span>
            {label && <span>{label}</span>}
        </button>
    );
};

// --- GLASS INPUT ---
export const GlassInput = ({ label, value, onChange, type = "number", placeholder, unit, icon, className }: any) => (
    <div className={`group space-y-2 ${className}`}>
        {label && (
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                {icon} {label}
            </label>
        )}
        <div className="relative flex items-center">
            <input 
                type={type}
                value={value}
                onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={placeholder}
                className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl px-4 font-mono text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
            {unit && (
                <div className="absolute right-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight pointer-events-none">
                    {unit}
                </div>
            )}
        </div>
    </div>
);

// --- GLASS SELECT ---
export const GlassSelect = ({ label, value, onChange, options, icon, className }: any) => (
    <div className={`group space-y-2 ${className}`}>
        {label && (
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                {icon} {label}
            </label>
        )}
        <div className="relative">
            <select 
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl px-4 pr-10 font-bold text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={16} />
            </div>
        </div>
    </div>
);

// --- LIQUID SLIDER (THICK TUBE STYLE) ---
export const GlassSlider = ({ label, icon, val, min, max, step, unit, onChange, gradient, color }: any) => {
    const pct = ((val - min) / (max - min)) * 100;
    
    let dynGrad = gradient || 'from-blue-600 via-blue-400 to-cyan-300';
    if (color === 'temp') {
        if (val < 20) dynGrad = 'from-cyan-500 to-blue-500';
        else if (val > 26) dynGrad = 'from-orange-500 to-red-500';
        else dynGrad = 'from-emerald-500 to-emerald-400';
    }

    return (
        <div className="group select-none">
            <div className="flex justify-between items-end mb-3 px-1">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    {icon} {label}
                </div>
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-white bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-black/5 dark:border-white/10 min-w-[60px] text-center shadow-inner">
                    {val.toFixed(0)}{unit}
                </div>
            </div>
            
            <div className="relative h-5 w-full touch-none flex items-center cursor-pointer">
                {/* Track Background (Glass Tube) */}
                <div className="absolute inset-0 h-4 top-1/2 -translate-y-1/2 bg-black/5 dark:bg-black/40 rounded-full border border-black/5 dark:border-white/5 shadow-inner"></div>
                
                {/* Active Fluid */}
                <div 
                    className={`absolute top-1/2 -translate-y-1/2 h-2 left-1 rounded-full bg-gradient-to-r ${dynGrad} shadow-[0_0_10px_rgba(59,130,246,0.4)] opacity-80 transition-all duration-75`} 
                    style={{width: `calc(${pct}% - 8px)`}} 
                />

                {/* Range Input (Invisible) */}
                <input 
                    type="range" min={min} max={max} step={step} value={val} 
                    onChange={e => onChange(Number(e.target.value))} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                
                {/* Handle (Glowing Orb) */}
                <div 
                    className="absolute h-6 w-6 bg-white rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.2)] dark:shadow-[0_0_15px_rgba(255,255,255,0.5)] border-4 border-slate-100 dark:border-[#0f172a] z-10 pointer-events-none transition-all duration-75 group-hover:scale-110 flex items-center justify-center" 
                    style={{left: `calc(${pct}% - 12px)`}}
                >
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-tr ${dynGrad}`}></div>
                </div>
            </div>
        </div>
    );
};
