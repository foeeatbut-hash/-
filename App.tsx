import React, { useState, useEffect, useRef } from 'react';
import { Settings, Wind, Box, X, AlertTriangle, CheckCircle2, Calculator, BookOpen, ArrowRight, ChevronLeft, Zap, Users, Gauge, Volume2, GitMerge, CloudRain, Thermometer, Flame, ScrollText, Shapes, ArrowRightLeft, User } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { AIChat } from './components/ui/AIChat';
import Simulator from './components/features/simulators/airflow/Simulator';
import VelocityCalculator from './components/features/calculators/velocity/VelocityCalculator';
import HeaterCalculator from './components/features/calculators/heater/HeaterCalculator';
import AirExchangeCalculator from './components/features/calculators/exchange/AirExchangeCalculator';
import PressureLossCalculator from './components/features/calculators/pressure/PressureLossCalculator';
import AcousticCalculator from './components/features/calculators/acoustic/AcousticCalculator';
import MixingCalculator from './components/features/calculators/mixing/MixingCalculator';
import PsychrometryCalculator from './components/features/calculators/psychrometry/PsychrometryCalculator';
import CoolingCalculator from './components/features/calculators/cooling/CoolingCalculator';
import KnowledgeCenter from './components/features/knowledge/KnowledgeCenter';
import SmokeCalculator from './components/features/calculators/smoke/SmokeCalculator';
import { ProfileModal } from './components/ui/ProfileModal';
import DuctSimulator from './components/features/simulators/duct/DuctSimulator';

const AppContent = () => {
    const [appMode, setAppMode] = useState('launcher'); 
    const [launcherSection, setLauncherSection] = useState('main'); 
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState('airflow');
    const [globalSettings, setGlobalSettings] = useLocalStorage('hvac-global-settings', {
        particleLimit: 8000
    });
    // Нужно ли пропустить интро сразу (системное «уменьшить движение» или уже играли за сессию).
    const shouldSkipIntro = () => {
        if (typeof window === 'undefined') return false;
        const reduced = !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let played = false;
        try { played = sessionStorage.getItem('klimlab-intro-played') === '1'; } catch (e) { /* недоступно */ }
        return reduced || played;
    };

    // Ленивая инициализация: на повторном заходе сразу финальное состояние, без кадра-вспышки интро.
    const [introPhase, setIntroPhase] = useState(() => (shouldSkipIntro() ? 2 : 0));
    const [logoStep, setLogoStep] = useState(() => (shouldSkipIntro() ? 4 : 0));

    // Таймеры интро храним в ref, чтобы корректно гасить их при «Пропустить».
    const introTimers = useRef<number[]>([]);
    const clearIntroTimers = () => {
        introTimers.current.forEach((t) => clearTimeout(t));
        introTimers.current = [];
    };

    // Мгновенно завершить интро (пропуск / reduced-motion / повторный заход за сессию).
    const finishIntro = () => {
        clearIntroTimers();
        setIntroPhase(2);
        setLogoStep(4);
        try { sessionStorage.setItem('klimlab-intro-played', '1'); } catch (e) { /* недоступно */ }
    };

    useEffect(() => {
        // Уважение системной настройки и показ один раз за сессию: анимацию не запускаем.
        if (shouldSkipIntro()) {
            return;
        }

        // Хореография интро (≈3.6 с до интерактива):
        introTimers.current = [
            // Фаза 0→1: полный текст «КЛИМАТИЧЕСКАЯ ЛАБОРАТОРИЯ» читается, затем лишние
            // буквы «АТИЧЕСКАЯ»/«ОРАТОРИЯ» синхронно схлопываются.
            window.setTimeout(() => setLogoStep(1), 1900),
            // Фаза 2: «ЛАБ» превращается в фирменный бэйдж и встаёт вплотную к «КЛИМ» → «КЛИМЛАБ».
            window.setTimeout(() => setLogoStep(2), 2700),
            // Фаза 3: интро плавно уезжает, проявляется рабочий хедер.
            window.setTimeout(() => { setIntroPhase(1); setLogoStep(3); }, 3300),
            // Фаза 4: проявляются карточки лаунчера; фиксируем показ за сессию.
            window.setTimeout(() => { setIntroPhase(2); setLogoStep(4); }, 4200),
            window.setTimeout(() => { try { sessionStorage.setItem('klimlab-intro-played', '1'); } catch (e) { /* недоступно */ } }, 4250),
        ];

        return clearIntroTimers;
    }, []);

    // Пропуск интро по любой клавише, пока оно играет (клик обрабатывается на самом слое интро).
    useEffect(() => {
        if (introPhase >= 2) return;
        const onKey = () => finishIntro();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [introPhase]);

    const goBack = () => setAppMode('launcher');
    const goHome = () => { setAppMode('launcher'); setLauncherSection('main'); };

    const LauncherCard = ({ onClick, icon, title, desc, color }: any) => {
        const cmap: Record<string, any> = {
            blue: {
                ring: 'group-hover:ring-blue-500/50',
                blob: 'bg-blue-500/20',
                iconBg: 'bg-blue-500/10',
                iconText: 'text-blue-600 dark:text-blue-400',
                iconHoverBg: 'group-hover:bg-blue-500',
                iconHoverText: 'group-hover:text-white',
                textCol: 'text-blue-600 dark:text-blue-400',
                shadow: 'group-hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)]',
                bgScale: 'group-hover:scale-[1.03]',
            },
            emerald: {
                ring: 'group-hover:ring-emerald-500/50',
                blob: 'bg-emerald-500/20',
                iconBg: 'bg-emerald-500/10',
                iconText: 'text-emerald-600 dark:text-emerald-400',
                iconHoverBg: 'group-hover:bg-emerald-500',
                iconHoverText: 'group-hover:text-white',
                textCol: 'text-emerald-600 dark:text-emerald-400',
                shadow: 'group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]',
                bgScale: 'group-hover:scale-[1.03]',
            },
            amber: {
                ring: 'group-hover:ring-amber-500/50',
                blob: 'bg-amber-500/20',
                iconBg: 'bg-amber-500/10',
                iconText: 'text-amber-600 dark:text-amber-400',
                iconHoverBg: 'group-hover:bg-amber-500',
                iconHoverText: 'group-hover:text-white',
                textCol: 'text-amber-600 dark:text-amber-400',
                shadow: 'group-hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]',
                bgScale: 'group-hover:scale-[1.03]',
            }
        };
        const c = cmap[color] || cmap.blue;

        return (
            <button 
                onClick={onClick}
                className={`
                    group relative h-64 md:h-80 rounded-[32px] md:rounded-[40px] 
                    bg-white/60 dark:bg-[#121217]/40 backdrop-blur-2xl 
                    border border-white/20 dark:border-white/10 
                    p-6 md:p-8 flex flex-col items-center justify-center gap-6 md:gap-8 
                    transition-all duration-500 ${c.bgScale} active:scale-95 
                    shadow-xl dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]
                    ${c.shadow}
                    overflow-hidden
                `}
            >
                {/* Glass reflection gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-50 dark:opacity-10 pointer-events-none" />
                
                {/* Hover Border Glow */}
                <div className={`absolute inset-0 rounded-[32px] md:rounded-[40px] ring-1 ring-inset ring-transparent ${c.ring} transition-all duration-500`}></div>

                {/* Background Gradient Blob */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 ${c.blob} rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                
                <div className={`
                    relative z-10 p-5 md:p-6 rounded-3xl 
                    ${c.iconBg} ${c.iconText} 
                    ${c.iconHoverBg} ${c.iconHoverText} 
                    transition-all duration-500 
                    shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] 
                    ring-1 ring-white/20 dark:ring-white/10 group-hover:ring-transparent
                    transform group-hover:-translate-y-2
                `}>
                    {icon}
                </div>
                
                <div className="text-center relative z-10 space-y-2 transform transition-transform duration-500 group-hover:-translate-y-1">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight drop-shadow-sm">{title}</h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium px-4 leading-relaxed">{desc}</p>
                </div>

                <div className={`mt-auto flex items-center gap-2 text-[10px] font-bold ${c.textCol} uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:-translate-y-2 transition-all duration-500`}>
                    Открыть <ArrowRight size={14} />
                </div>
            </button>
        );
    };

    const CalcCard = ({ onClick, icon, title, desc, color }: any) => {
        const cmap: Record<string, any> = {
            emerald: { ring: 'group-hover:ring-emerald-500/50', iconBase: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', iconHover: 'group-hover:bg-emerald-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]' },
            orange: { ring: 'group-hover:ring-orange-500/50', iconBase: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', iconHover: 'group-hover:bg-orange-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]' },
            blue: { ring: 'group-hover:ring-blue-500/50', iconBase: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', iconHover: 'group-hover:bg-blue-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]' },
            purple: { ring: 'group-hover:ring-purple-500/50', iconBase: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', iconHover: 'group-hover:bg-purple-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]' },
            rose: { ring: 'group-hover:ring-rose-500/50', iconBase: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', iconHover: 'group-hover:bg-rose-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]' },
            cyan: { ring: 'group-hover:ring-cyan-500/50', iconBase: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', iconHover: 'group-hover:bg-cyan-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]' },
            sky: { ring: 'group-hover:ring-sky-500/50', iconBase: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', iconHover: 'group-hover:bg-sky-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(14,165,233,0.3)]' },
            red: { ring: 'group-hover:ring-red-500/50', iconBase: 'bg-red-500/10 text-red-600 dark:text-red-400', iconHover: 'group-hover:bg-red-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]' },
        };
        const c = cmap[color] || cmap.blue;

        return (
            <button onClick={onClick} className={`
                group min-h-[140px] md:h-64 rounded-[24px] md:rounded-[32px] 
                bg-white/60 dark:bg-[#121217]/40 backdrop-blur-xl 
                p-5 md:p-8 flex flex-col justify-between text-left 
                hover:scale-[1.03] transition-all duration-500 
                border border-white/20 dark:border-white/10 ${c.ring}
                shadow-lg dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ${c.shadow}
                relative overflow-hidden
            `}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-50 dark:opacity-10 pointer-events-none" />
                
                <div className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center 
                    transition-all duration-500 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] 
                    ring-1 ring-white/10 relative z-10 
                    ${c.iconBase} ${c.iconHover}
                    transform group-hover:scale-110
                `}>
                    {icon}
                </div>
                <div className="relative z-10 transform transition-transform duration-500 group-hover:translate-x-2">
                    <h3 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white mb-1 md:mb-2 leading-tight drop-shadow-sm">{title}</h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2 md:line-clamp-none">{desc}</p>
                </div>
            </button>
        );
    };

    const renderMainLauncher = () => (
        <>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-7xl pb-20 md:pb-0 transition-opacity duration-[1500ms] ease-in-out ${introPhase >= 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <LauncherCard 
                    onClick={() => setLauncherSection('simulators')}
                    icon={<Wind className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                    title="СИМУЛЯТОР"
                    desc="Визуализация физики потоков"
                    color="blue"
                />
                <LauncherCard 
                    onClick={() => setLauncherSection('calculations')}
                    icon={<Calculator className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                    title="РАСЧЕТЫ"
                    desc="Инженерные калькуляторы"
                    color="emerald"
                />
                <LauncherCard 
                    onClick={() => setLauncherSection('reference')}
                    icon={<BookOpen className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                    title="ЗНАНИЯ"
                    desc="Нормы, формулы и теория"
                    color="amber"
                />
            </div>

            {/* Именная подпись: строго внизу, видна только в главном меню */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${introPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'} z-10`}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/45 dark:bg-[#0f0f14]/30 backdrop-blur-md border border-slate-200/40 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:border-slate-300/60 dark:hover:border-white/10 transition-all duration-300 group">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <p className="text-[10px] font-mono tracking-wider text-slate-400/80 dark:text-slate-500/80 text-center select-none">
                        Дизайн и разработка: <span className="font-sans font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-500 dark:group-hover:text-emerald-400 transition-colors duration-150">Раупов Хусрав</span>
                    </p>
                </div>
            </div>
        </>
    );

    const renderSimulatorsSection = () => (
        <div className="w-full max-w-5xl animate-in slide-in-from-right-8 fade-in duration-500">
             <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10">
                <div onClick={() => setLauncherSection('main')}>
                    <button className="relative overflow-hidden group h-12 w-12 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wide shadow-sm active:scale-95 bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10">
                        <ChevronLeft size={20}/>
                    </button>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-500 tracking-tight">СИМУЛЯТОРЫ</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20">
                <CalcCard 
                    onClick={() => setAppMode('simulator')}
                    icon={<Wind size={24} />}
                    title="КлимЛаб"
                    desc="Моделирование распределения воздуха в помещении"
                    color="blue"
                />
                <CalcCard 
                    onClick={() => setAppMode('duct-simulator')}
                    icon={<Gauge size={24} />}
                    title="Аэродинамика сетей"
                    desc="Проектирование и аэродинамический расчет воздуховодов на плане"
                    color="emerald"
                />
            </div>
        </div>
    );

    const renderCalculationsSection = () => (
        <div className="w-full max-w-5xl animate-in slide-in-from-right-8 fade-in duration-500 pb-20">
             <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10">
                <div onClick={() => setLauncherSection('main')}>
                    <button className="relative overflow-hidden group h-12 w-12 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wide shadow-sm active:scale-95 bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10">
                        <ChevronLeft size={20}/>
                    </button>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-500 tracking-tight">РАСЧЕТЫ</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                <CalcCard onClick={() => setAppMode('calculator')} icon={<Calculator size={24}/>} title="Скорость воздуха" desc="Подбор сечения воздуховода по скорости" color="emerald"/>
                <CalcCard onClick={() => setAppMode('heater-calculator')} icon={<Zap size={24}/>} title="Мощность калорифера" desc="Расчет нагрева и охлаждения воздуха" color="orange"/>
                <CalcCard onClick={() => setAppMode('exchange-calculator')} icon={<Users size={24}/>} title="Расчет воздухообмена" desc="По кратности и количеству людей" color="blue"/>
                <CalcCard onClick={() => setAppMode('pressure-calculator')} icon={<Gauge size={24}/>} title="Потери давления" desc="Аэродинамический расчет на трение и КМС" color="purple"/>
                <CalcCard onClick={() => setAppMode('acoustic-calculator')} icon={<Volume2 size={24}/>} title="Суммирование шума" desc="Расчет общего уровня звукового давления" color="rose"/>
                <CalcCard onClick={() => setAppMode('mixing-calculator')} icon={<GitMerge size={24}/>} title="Смешение воздуха" desc="Расчет температуры смеси двух потоков" color="cyan"/>
                <CalcCard onClick={() => setAppMode('psychrometry-calculator')} icon={<CloudRain size={24}/>} title="Влажный воздух" desc="Психрометрия: ID-диаграмма, энтальпия, точка росы" color="sky"/>
                <CalcCard onClick={() => setAppMode('calc-cooling')} icon={<Thermometer size={24}/>} title="Кондиционирование" desc="Расчет теплопритоков" color="cyan"/>
                <CalcCard onClick={() => setAppMode('smoke-calculator')} icon={<Flame size={24}/>} title="Противодымная защита" desc="Расчет ДУ и подпора воздуха" color="red"/>
            </div>
        </div>
    );

    const renderReferenceSection = () => (
        <div className="w-full max-w-5xl animate-in slide-in-from-right-8 fade-in duration-500 pb-20">
             <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10">
                <div onClick={() => setLauncherSection('main')}>
                    <button className="relative overflow-hidden group h-12 w-12 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wide shadow-sm active:scale-95 bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10">
                        <ChevronLeft size={20}/>
                    </button>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-500 tracking-tight">ЗНАНИЯ</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                <CalcCard 
                    onClick={() => setAppMode('reference-wiki')}
                    icon={<BookOpen size={24} />}
                    title="Теория и формулы"
                    desc="База знаний инженерных расчетов"
                    color="blue"
                />
                <CalcCard 
                    onClick={() => setAppMode('reference-norms')}
                    icon={<ScrollText size={24} />}
                    title="Нормативы"
                    desc="ГОСТ, СП и стандарты"
                    color="emerald"
                />
                <CalcCard 
                    onClick={() => setAppMode('reference-symbols')}
                    icon={<Shapes size={24} />}
                    title="Обозначения"
                    desc="Условные графические обозначения АВОК"
                    color="purple"
                />
                <CalcCard 
                    onClick={() => setAppMode('reference-converter')}
                    icon={<ArrowRightLeft size={24} />}
                    title="Конвертер"
                    desc="Перевод физических величин"
                    color="orange"
                />
            </div>
        </div>
    );

    // Main App View Logic
    const renderContent = () => {
        if (appMode === 'simulator') return <Simulator onBack={goBack} onHome={goHome} />;
        if (appMode === 'duct-simulator') return <DuctSimulator onBack={goBack} onHome={goHome} />;
        if (appMode === 'calculator') return <VelocityCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'heater-calculator') return <HeaterCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'exchange-calculator') return <AirExchangeCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'pressure-calculator') return <PressureLossCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'acoustic-calculator') return <AcousticCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'mixing-calculator') return <MixingCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'psychrometry-calculator') return <PsychrometryCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'calc-cooling') return <CoolingCalculator onBack={goBack} onHome={goHome} />;
        if (appMode === 'smoke-calculator') return <SmokeCalculator onBack={goBack} onHome={goHome} />;
        
        // Knowledge Center Routes
        if (appMode === 'reference-wiki') return <KnowledgeCenter initialSection="wiki" onBack={goBack} onHome={goHome} />;
        if (appMode === 'reference-norms') return <KnowledgeCenter initialSection="norms" onBack={goBack} onHome={goHome} />;
        if (appMode === 'reference-symbols') return <KnowledgeCenter initialSection="symbols" onBack={goBack} onHome={goHome} />;
        if (appMode === 'reference-converter') return <KnowledgeCenter initialSection="converter" onBack={goBack} onHome={goHome} />;

        // Launcher Mode
        return (
            <div className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none">
                
                {/* СЛОЙ А: ПОЛНОЭКРАННОЕ ИНТРО (СТРОГО ПО ЦЕНТРУ ЭКРАНА В СЕРЕДИНЕ ПРОГРАММЫ) */}
                {introPhase < 2 && (
                    <div
                        onClick={finishIntro}
                        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-[#F5F5F7] dark:bg-[#020205] cursor-pointer transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu ${
                        introPhase >= 1 ? 'opacity-0 pointer-events-none scale-[0.97]' : 'opacity-100'
                    }`}>
                        <div className="flex flex-col items-center md:flex-row gap-6 md:gap-8 max-w-full px-4 transform-gpu">

                            {/* Высокотехнологичный круглый 3D-логотип с плавным появлением */}
                            <div className="intro-logo-in relative flex items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-[28px] bg-white dark:bg-[#0c0c10] border border-slate-200/80 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden flex-shrink-0">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px]"></div>
                                <div className="absolute w-[85%] h-[85%] rounded-full border border-dashed border-slate-200/40 dark:border-white/5 animate-[spin_60s_linear_infinite]" />
                                <div className="relative w-10 h-10 flex items-center justify-center">
                                    <Wind className="absolute text-blue-500 dark:text-blue-400 w-8 h-8 -translate-x-[15%] -translate-y-[15%]" strokeWidth={1.5} />
                                    <Flame className="absolute text-emerald-500 dark:text-emerald-400 w-8 h-8 translate-x-[15%] translate-y-[15%]" strokeWidth={1.5} />
                                </div>
                            </div>

                            {/* Текстовая группа интро с безопасными размерами (без вылетов) */}
                            <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left max-w-full overflow-hidden">
                                <h1 className="text-[24px] sm:text-[36px] md:text-[46px] lg:text-[54px] font-black tracking-tight uppercase flex flex-row items-center leading-none whitespace-nowrap w-max max-w-full">
                                    <span className="flex items-center text-slate-800 dark:text-white">
                                        <span>КЛИМ</span>
                                        {/* Лишние буквы: сначала видны полностью, затем схлопываются по ширине */}
                                        <span className={`inline-block overflow-hidden whitespace-nowrap select-none transform-gpu transition-all duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                            logoStep >= 1 ? 'max-w-0 opacity-0 blur-[2px]' : 'max-w-[16ch] opacity-100 blur-0'
                                        }`}>АТИЧЕСКАЯ</span>
                                    </span>

                                    <span className={`inline-flex items-center transform-gpu transition-all duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-black ${
                                        logoStep >= 2
                                            ? 'ml-1 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500 shadow-sm'
                                            : 'ml-2 md:ml-3 text-slate-800 dark:text-white'
                                    }`}>
                                        <span>ЛАБ</span>
                                        <span className={`inline-block overflow-hidden whitespace-nowrap select-none transform-gpu transition-all duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                            logoStep >= 1 ? 'max-w-0 opacity-0 blur-[2px]' : 'max-w-[16ch] opacity-100 blur-0'
                                        }`}>ОРАТОРИЯ</span>
                                    </span>
                                </h1>
                                <p className="intro-rise text-slate-400/80 dark:text-slate-500 text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.4em] uppercase mt-3.5 select-none">
                                    Инженерный комплекс ОВиК
                                </p>
                            </div>
                        </div>

                        {/* Подсказка «Пропустить» (клик в любом месте слоя тоже завершает интро) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); finishIntro(); }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400/70 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-4 py-2 rounded-full intro-rise"
                        >
                            Пропустить →
                        </button>
                    </div>
                )}

                {/* СЛОЙ Б: ГЛАВНЫЙ РАБОЧИЙ ИНТЕРФЕЙС ПРИЛОЖЕНИЯ И ХЕДЕР В УГЛУ */}
                <div className={`w-full flex-1 flex flex-col items-center p-4 md:p-8 transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu ${
                    introPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                }`}>
                    
                    {/* Полноценный рабочий Хедер в левом верхнем углу (Абсолютно стабилен) */}
                    {launcherSection === 'main' && (
                        <header className="flex items-center justify-between w-full max-w-7xl mb-12 md:mb-20 min-h-[56px] md:min-h-[80px]">
                            <div className="flex items-center gap-4 group">
                                {/* Маленький аккуратный логотип */}
                                <div className="relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white dark:bg-[#0c0c10] border border-slate-200/60 dark:border-white/10 shadow-sm flex-shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <Wind className="absolute text-blue-500 dark:text-blue-400 w-5 h-5 -translate-x-[10%] -translate-y-[10%] group-hover:-translate-x-[18%] group-hover:-translate-y-[18%] transition-all duration-300" strokeWidth={2} />
                                    <Flame className="absolute text-emerald-500 dark:text-emerald-400 w-5 h-5 translate-x-[10%] translate-y-[10%] group-hover:translate-x-[18%] group-hover:translate-y-[18%] transition-all duration-300" strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">
                                        КЛИМ<span 
                                            className="inline bg-gradient-to-r from-blue-500 to-emerald-500 ml-0.5"
                                            style={{
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                                color: 'transparent'
                                            }}
                                        >ЛАБ</span>
                                    </h1>
                                    <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase mt-1">
                                        Инженерный комплекс ОВиК
                                    </p>
                                </div>
                            </div>
                            
                            {/* Функциональные системные кнопки хедера */}
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setIsProfileOpen(true)}
                                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm"
                                >
                                    <User size={20} />
                                </button>
                                <button 
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm"
                                >
                                    <Settings size={20} className="hover:rotate-45 transition-transform duration-500" />
                                </button>
                            </div>
                        </header>
                    )}

                    {/* Модульные Секции Главного Меню Лаунчера */}
                    <div className={`w-full flex justify-center flex-1 transition-all duration-[900ms] delay-150 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu ${
                        introPhase >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                    }`}>
                        {launcherSection === 'main' && renderMainLauncher()}
                        {launcherSection === 'simulators' && renderSimulatorsSection()}
                        {launcherSection === 'calculations' && renderCalculationsSection()}
                        {launcherSection === 'reference' && renderReferenceSection()}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-[100dvh] flex-col relative overflow-x-hidden overflow-y-auto slim-scrollbar bg-[#F5F5F7] dark:bg-[#020205] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-500 ease-in-out">
            {/* AMBIENT BACKGROUND */}
            <div className="fixed top-0 -left-40 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-40 animate-blob pointer-events-none transform-gpu will-change-transform"></div>
            <div className="fixed top-0 -right-40 w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-2000 pointer-events-none transform-gpu will-change-transform"></div>
            <div className="fixed -bottom-40 left-20 w-[600px] h-[600px] bg-emerald-500/10 dark:bg-emerald-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-4000 pointer-events-none transform-gpu will-change-transform"></div>
            <div className="fixed inset-0 bg-noise opacity-10 dark:opacity-20 brightness-100 contrast-150 pointer-events-none"></div>

            <div className={`relative z-10 w-full ${appMode === 'simulator' ? '' : (introPhase < 2 ? 'flex-1 h-[100dvh]' : 'pt-8 md:pt-12 pb-24 flex-1')}`}>
                {renderContent()}
            </div>

            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Global Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#F5F5F7] dark:bg-[#0f0f13] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-black/10 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white dark:bg-white/5">
                            <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-white">
                                <Settings size={20} className="text-blue-500"/> Настройки КлимЛаб
                            </h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="flex h-[50vh] min-h-[400px] flex-col md:flex-row">
                            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-black/5 dark:border-white/5 p-4 space-y-1.5 bg-white/50 dark:bg-transparent">
                                <button onClick={() => setActiveSettingsTab('airflow')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${activeSettingsTab === 'airflow' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <Wind size={16}/> Симулятор потоков
                                </button>
                                <button className="w-full text-left px-4 py-3 rounded-xl text-slate-400 dark:text-slate-600 font-bold text-xs flex items-center gap-2 cursor-not-allowed opacity-60">
                                    <Box size={16}/> Прочие разделы...
                                </button>
                            </div>
                            
                            <div className="w-full md:w-2/3 p-6 overflow-y-auto custom-scrollbar">
                                {activeSettingsTab === 'airflow' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Графика и Производительность</h3>
                                        
                                        <div className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                                            <div className="flex justify-between items-baseline mb-3">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Базовый лимит частиц</label>
                                                <span className="text-xs font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">{globalSettings.particleLimit} шт</span>
                                            </div>
                                            <input 
                                                type="range" min={2000} max={30000} step={1000}
                                                value={globalSettings.particleLimit}
                                                onChange={(e) => setGlobalSettings({...globalSettings, particleLimit: Number(e.target.value)})}
                                                className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
                                            />
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-medium">
                                                Определяет густоту 3D-потока по умолчанию для новых диффузоров.
                                                <br/><br/>
                                                <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500"/> Слабые ПК: 2000 - 5000</span>
                                                <span className="flex items-center gap-1 mt-1"><CheckCircle2 size={10} className="text-emerald-500"/> Мощные ПК: до 30 000</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const App = () => (
    <>
        <AppContent />
        <AIChat />
    </>
);

export default App;