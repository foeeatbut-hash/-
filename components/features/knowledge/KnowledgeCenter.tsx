import React, { useState, useMemo } from 'react';
import { 
    BookOpen, FileText, ScrollText, ArrowRightLeft, ArrowRight, ChevronLeft, 
    Home, Activity, Wind, Menu, X, Zap, Gauge, ChevronDown, Shapes, Info, 
    Ruler, Scale, Droplets, Box, Thermometer, Search, RotateCcw
} from 'lucide-react';
import { ENGINEERING_WIKI, NORMS_DB, AVOK_SYMBOLS } from '../../../constants';
import { AppHeader, GlassButton, GlassInput, GlassSelect } from '../../ui/Shared';

const WikiTab = ({ onRead }: any) => {
    const [search, setSearch] = useState('');
    
    const filtered = useMemo(() => {
        return ENGINEERING_WIKI.filter(item => 
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.category.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-500" /> Теория и формулы
                </h2>
                <div className="w-full md:w-72">
                    <GlassInput 
                        placeholder="Поиск по статьям..." 
                        value={search} 
                        onChange={setSearch} 
                        type="text"
                        icon={<Search size={14} className="text-slate-400" />}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((item, idx) => (
                    <button 
                        key={idx}
                        onClick={() => onRead(item)}
                        className="group bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl p-6 text-left transition-all hover:scale-[1.02] hover:bg-white/80 dark:hover:bg-white/10 flex flex-col h-48 shadow-sm"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-lg">
                                {item.category}
                            </span>
                            <FileText size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-auto line-clamp-2 leading-tight">
                            {item.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
                            <span>Читать</span>
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const NormsTab = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ScrollText size={16} className="text-emerald-500" /> Нормативная база
        </h2>
        <div className="space-y-4">
            {NORMS_DB.map((doc, i) => (
                <div key={i} className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm group hover:border-emerald-500/30 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold text-slate-500 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5">
                                    {doc.code}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg">
                                    {doc.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {doc.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                                {doc.desc}
                            </p>
                        </div>
                        <GlassButton secondary icon={<ArrowRight size={16}/>} label="Открыть" onClick={() => {}} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SymbolsTab = () => {
    const [filter, setFilter] = useState('All');
    const categories = ['All', ...Array.from(new Set(AVOK_SYMBOLS.map(s => s.category)))];
    const filtered = filter === 'All' ? AVOK_SYMBOLS : AVOK_SYMBOLS.filter(s => s.category === filter);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Shapes size={16} className="text-purple-500" /> Условные обозначения
                </h2>
                <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                        <button 
                            key={c} 
                            onClick={() => setFilter(c)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                filter === c 
                                    ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                                    : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                            }`}
                        >
                            {c === 'All' ? 'Все' : c}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map(item => (
                    <div key={item.id} className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl p-4 shadow-sm group hover:scale-[1.02] transition-all">
                        <div className="aspect-square rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center mb-4 text-slate-400 group-hover:text-purple-500 transition-colors">
                            <div className="scale-125">{item.draw()}</div>
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.category}</div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1 leading-tight">{item.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ConverterTab = () => {
    const categories: any = useMemo(() => ({
        flow: { 
            name: 'Расход', icon: <Wind size={20} />, 
            units: { 'm³/h': 1, 'l/s': 3.6, 'l/min': 0.06, 'cfm': 1.699, 'm³/s': 3600 } 
        }, 
        pressure: { 
            name: 'Давление', icon: <Activity size={20} />, 
            units: { 'Pa': 1, 'kPa': 1000, 'bar': 100000, 'psi': 6894.76, 'mmHg': 133.322, 'atm': 101325 } 
        },
        power: { 
            name: 'Мощность', icon: <Zap size={20} />, 
            units: { 'kW': 1, 'W': 0.001, 'kcal/h': 0.001162, 'BTU/h': 0.000293, 'hp': 0.7457 } 
        },
        velocity: { 
            name: 'Скорость', icon: <Gauge size={20} />, 
            units: { 'm/s': 1, 'km/h': 0.27778, 'mph': 0.44704, 'kn': 0.51444, 'ft/min': 0.00508 } 
        },
        temperature: {
            name: 'Температура', icon: <Thermometer size={20} />,
            type: 'temp',
            units: { '°C': 'C', '°F': 'F', 'K': 'K' }
        },
        length: {
            name: 'Длина', icon: <Ruler size={20} />,
            units: { 'm': 1, 'cm': 0.01, 'mm': 0.001, 'ft': 0.3048, 'in': 0.0254, 'yd': 0.9144 }
        },
        area: {
            name: 'Площадь', icon: <Box size={20} />,
            units: { 'm²': 1, 'cm²': 0.0001, 'ft²': 0.092903, 'in²': 0.00064516, 'ha': 10000 }
        },
        mass: {
            name: 'Масса', icon: <Scale size={20} />,
            units: { 'kg': 1, 'g': 0.001, 'lb': 0.453592, 'oz': 0.0283495, 'ton': 1000 }
        },
        volume: {
            name: 'Объем', icon: <Droplets size={20} />,
            units: { 'm³': 1, 'l': 0.001, 'gal': 0.00378541, 'ft³': 0.0283168 }
        }
    }), []);

    const [cat, setCat] = useState('flow');
    const [val1, setVal1] = useState<string>('100'); 
    const [unit1, setUnit1] = useState('m³/h');
    const [unit2, setUnit2] = useState('l/s');

    React.useEffect(() => {
        if (categories[cat]) {
            const units = Object.keys(categories[cat].units);
            setUnit1(units[0]);
            setUnit2(units[1] || units[0]);
        }
    }, [cat, categories]);

    const convert = (value: number, fromUnit: string, toUnit: string) => {
        if (!categories[cat]) return 0;
        if (categories[cat].type === 'temp') {
            let celsius = value;
            if (fromUnit === '°F') celsius = (value - 32) * 5/9;
            if (fromUnit === 'K') celsius = value - 273.15;
            if (toUnit === '°C') return celsius;
            if (toUnit === '°F') return celsius * 9/5 + 32;
            if (toUnit === 'K') return celsius + 273.15;
            return celsius;
        }
        const inBase = value * categories[cat].units[fromUnit]; 
        return inBase / categories[cat].units[toUnit];
    };
    
    const numVal = parseFloat(val1) || 0;
    const res = convert(numVal, unit1, unit2);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-blue-500" /> Конвертер величин
            </h2>

            <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
                {Object.entries(categories).map(([key, data]: any) => (
                    <button 
                        key={key}
                        onClick={() => setCat(key)}
                        className={`flex flex-col items-center gap-2 px-6 py-4 rounded-3xl border transition-all min-w-[100px] ${
                            cat === key 
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-white/60 dark:bg-[#0a0a0f]/60 border-black/5 dark:border-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        {data.icon}
                        <span className="text-[10px] font-bold uppercase tracking-widest">{data.name}</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl p-8 shadow-sm space-y-6">
                    <GlassInput 
                        label="Исходное значение" 
                        value={val1} 
                        onChange={(v: any) => setVal1(v.toString())} 
                        type="number"
                    />
                    <GlassSelect 
                        label="Из единицы"
                        value={unit1}
                        onChange={setUnit1}
                        options={Object.keys(categories[cat].units).map(u => ({ label: u, value: u }))}
                    />
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-8 shadow-sm space-y-6 relative">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white shadow-lg">
                        <ArrowRight size={14} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Результат</label>
                        <div className="h-12 flex items-center px-4 bg-white/40 dark:bg-white/5 rounded-2xl font-mono text-2xl font-black text-blue-600 dark:text-blue-400">
                            {numVal === 0 ? '0' : Math.abs(res) < 0.001 || Math.abs(res) > 999999 ? res.toExponential(4) : res.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </div>
                    </div>
                    <GlassSelect 
                        label="В единицу"
                        value={unit2}
                        onChange={setUnit2}
                        options={Object.keys(categories[cat].units).map(u => ({ label: u, value: u }))}
                    />
                </div>
            </div>
        </div>
    );
};

const ArticleView = ({ item, onBack, onHome, gradientClass }: any) => (
    <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/5">
            <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">{item.category}</span>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{item.title}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <GlassButton secondary icon={<ChevronLeft size={16}/>} label="Назад" onClick={onBack} />
                <GlassButton secondary icon={<Home size={16}/>} label="Главная" onClick={onHome} />
            </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
            {item.content_blocks.map((block: any, i: number) => {
                if (block.type === 'text') return <p key={i} className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-light">{block.content}</p>;
                if (block.type === 'custom_formula') return (
                    <div key={i} className="bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl p-8 shadow-sm overflow-x-auto">
                        {block.render()}
                    </div>
                );
                if (block.type === 'variable_list') return (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {block.items.map((item: any, j: number) => (
                            <div key={j} className="flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                <div className="min-w-[3rem] h-12 flex items-center justify-center rounded-xl bg-white dark:bg-black/40 border border-black/5 dark:border-white/10 shadow-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                                    {item.symbol}
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{item.definition}</span>
                            </div>
                        ))}
                    </div>
                );
                return null;
            })}
        </div>
    </div>
);

const KnowledgeCenter = ({ onBack, onHome, initialSection = 'wiki' }: any) => {
    const [readingItem, setReadingItem] = useState<any>(null);

    const titles: Record<string, { title: string, icon: any, color: string }> = {
        wiki: { title: 'Теория и формулы', icon: <BookOpen size={20} />, color: 'bg-blue-500 shadow-blue-500/20' },
        norms: { title: 'Нормативы', icon: <ScrollText size={20} />, color: 'bg-emerald-500 shadow-emerald-500/20' },
        symbols: { title: 'Обозначения АВОК', icon: <Shapes size={20} />, color: 'bg-purple-500 shadow-purple-500/20' },
        converter: { title: 'Конвертер', icon: <ArrowRightLeft size={20} />, color: 'bg-orange-500 shadow-orange-500/20' }
    };

    const currentSection = titles[initialSection] || titles.wiki;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-20 px-4">
            {/* Header */}
            {!readingItem && (
                <AppHeader
                    title={currentSection.title}
                    icon={currentSection.icon}
                    iconColorClass={currentSection.color}
                    onBack={onBack}
                    onHome={onHome}
                />
            )}

            <div className="relative">
                {readingItem ? (
                    <ArticleView item={readingItem} onBack={() => setReadingItem(null)} onHome={onHome} />
                ) : (
                    <div className="space-y-8">
                        {initialSection === 'wiki' && <WikiTab onRead={setReadingItem} />}
                        {initialSection === 'norms' && <NormsTab />}
                        {initialSection === 'symbols' && <SymbolsTab />}
                        {initialSection === 'converter' && <ConverterTab />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeCenter;
