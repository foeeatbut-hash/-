import React, { useMemo } from 'react';
import { Fan, Home, ScanLine, Target, Thermometer, Trash2, Volume2, Wind, X } from 'lucide-react';
import { calculateProbeData } from '../../../../hooks/useSimulation';
import { DIFFUSER_CATALOG, getDiffuserMode } from '../../../../constants';

const VIEW_LABELS: Record<string, string> = {
    front: 'Спереди',
    right: 'Справа',
    top: 'План',
    '3d': '3D'
};

type Tone = 'neutral' | 'info' | 'good' | 'warn' | 'danger';

const TONE_STYLES: Record<Tone, { tile: string; icon: string; value: string }> = {
    neutral: {
        tile: 'border-black/5 dark:border-white/8 bg-[#f8fafc] dark:bg-[#111827]/70',
        icon: 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-200',
        value: 'text-slate-900 dark:text-white'
    },
    info: {
        tile: 'border-sky-200/80 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10',
        icon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
        value: 'text-sky-900 dark:text-sky-200'
    },
    good: {
        tile: 'border-emerald-200/80 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10',
        icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        value: 'text-emerald-900 dark:text-emerald-200'
    },
    warn: {
        tile: 'border-amber-200/80 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10',
        icon: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        value: 'text-amber-900 dark:text-amber-200'
    },
    danger: {
        tile: 'border-rose-200/80 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10',
        icon: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        value: 'text-rose-900 dark:text-rose-200'
    }
};

const formatNumber = (value: number | undefined, digits: number = 1) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0.0';
    return value.toFixed(digits);
};

const getNoiseTone = (noise: number): Tone => {
    if (noise > 45) return 'danger';
    if (noise > 35) return 'warn';
    return 'good';
};

const getVelocityTone = (velocity: number): Tone => {
    if (velocity <= 0.25) return 'good';
    if (velocity <= 0.35) return 'warn';
    return 'danger';
};

const SectionCard = ({ title, subtitle, icon, children }: any) => (
    <section className="rounded-[28px] border border-black/5 bg-white/88 p-5 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.35)] ring-1 ring-black/5 dark:border-white/8 dark:bg-[#0b1020]/88 dark:ring-white/5">
        <div className="mb-4 flex items-start justify-between gap-3">
            <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{title}</div>
                {subtitle ? <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subtitle}</div> : null}
            </div>
            <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                {icon}
            </div>
        </div>
        {children}
    </section>
);

const MetricTile = ({ label, value, unit, note, tone = 'neutral', icon }: any) => {
    const style = TONE_STYLES[tone as Tone] || TONE_STYLES.neutral;
    return (
        <div className={`rounded-2xl border p-4 ${style.tile}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
                <div className={`rounded-xl p-2 ${style.icon}`}>{icon}</div>
            </div>
            <div className={`mt-3 flex items-baseline gap-1 font-mono text-[26px] font-black leading-none tracking-tight ${style.value}`}>
                <span>{value}</span>
                {unit ? <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{unit}</span> : null}
            </div>
            {note ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</div> : null}
        </div>
    );
};

const DetailRow = ({ label, value, hint, tone = 'neutral' }: any) => {
    const valueColor = {
        neutral: 'text-slate-900 dark:text-white',
        info: 'text-sky-700 dark:text-sky-300',
        good: 'text-emerald-700 dark:text-emerald-300',
        warn: 'text-amber-700 dark:text-amber-300',
        danger: 'text-rose-700 dark:text-rose-300'
    }[tone as Tone] || 'text-slate-900 dark:text-white';

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-slate-200/70 py-3 last:border-0 dark:border-white/8">
            <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
                {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
            </div>
            <div className={`text-right font-mono text-sm font-bold ${valueColor}`}>{value}</div>
        </div>
    );
};

const StatPill = ({ label, value, tone = 'neutral' }: any) => {
    const style = TONE_STYLES[tone as Tone] || TONE_STYLES.neutral;
    return (
        <div className={`rounded-2xl border px-3 py-2 ${style.tile}`}>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
            <div className={`mt-1 font-mono text-sm font-black ${style.value}`}>{value}</div>
        </div>
    );
};

export const SimulatorRightPanel = ({
    viewMode,
    physics,
    params,
    placedDiffusers,
    topViewStats,
    isMobileStatsOpen,
    setIsMobileStatsOpen,
    selectedDiffuserIds,
    probes,
    onRemoveProbe
}: any) => {
    const diffusers = placedDiffusers || [];
    const hasDiffusers = diffusers.length > 0;
    const activeDiffuser = selectedDiffuserIds && selectedDiffuserIds.length > 0
        ? diffusers.find((d: any) => d.id === selectedDiffuserIds[selectedDiffuserIds.length - 1]) || diffusers[diffusers.length - 1] || null
        : diffusers[diffusers.length - 1] || null;

    const previewDiffuser = {
        modelId: params?.modelId,
        modeIdx: params?.modeIdx,
        diameter: params?.diameter,
        volume: params?.volume,
        temperature: params?.temperature,
        performance: physics
    };

    const currentDiffuser = activeDiffuser || previewDiffuser;
    const currentModel = DIFFUSER_CATALOG.find(item => item.id === currentDiffuser?.modelId);
    const currentMode = currentDiffuser ? getDiffuserMode(currentDiffuser.modelId, currentDiffuser.modeIdx ?? 0) : null;

    const roomArea = (params?.roomWidth || 0) * (params?.roomLength || 0);
    const roomVolume = roomArea * (params?.roomHeight || 0);
    const totalAir = diffusers.reduce((sum: number, diffuser: any) => sum + (diffuser.volume || 0), 0);

    const summaryNoise = hasDiffusers ? (topViewStats?.maxNoise || 0) : (currentDiffuser?.performance?.noise || 0);
    const summaryTemperature = hasDiffusers ? (topViewStats?.calcTemp || params?.roomTemp || 0) : (params?.roomTemp || 0);

    const probeCards = useMemo(() => {
        return (probes || []).map((probe: any) => ({
            probe,
            data: calculateProbeData(
                probe,
                diffusers,
                params?.roomTemp || 20,
                params?.temperature || 20,
                params?.roomWidth || 10,
                params?.roomLength || 10,
                params?.roomHeight || 3
            )
        }));
    }, [diffusers, params?.roomHeight, params?.roomLength, params?.roomTemp, params?.roomWidth, params?.temperature, probes]);

    const content = (
        <div className="space-y-4">
            <SectionCard title="Система" subtitle="Общие показатели по текущей конфигурации" icon={<ScanLine size={18} />}>
                <div className="grid grid-cols-1 gap-3">
                    <MetricTile
                        label="Общий расход"
                        value={formatNumber(hasDiffusers ? totalAir : params?.volume || 0, 0)}
                        unit="м³/ч"
                        note={hasDiffusers ? 'сумма по всем диффузорам' : 'значение выбранной конфигурации'}
                        tone="info"
                        icon={<Wind size={16} />}
                    />
                    <MetricTile
                        label="Шум"
                        value={formatNumber(summaryNoise, 0)}
                        unit="дБ"
                        note={summaryNoise > 45 ? 'выше комфортного порога' : 'в пределах типового диапазона'}
                        tone={getNoiseTone(summaryNoise)}
                        icon={<Volume2 size={16} />}
                    />



                    <MetricTile
                        label="Температура"
                        value={formatNumber(summaryTemperature, 1)}
                        unit="°C"
                        note={hasDiffusers ? 'средняя по рабочей зоне' : 'температура помещения'}
                        tone="neutral"
                        icon={<Thermometer size={16} />}
                    />
                </div>


            </SectionCard>

            {hasDiffusers && (
                <SectionCard title="Рабочая зона" subtitle="Реальная область пересечения потока (план)" icon={<ScanLine size={18} />}>
                    <DetailRow
                        label="Площадь покрытия"
                        value={`${formatNumber(topViewStats?.workzoneArea || 0, 1)} м²`}
                        hint={`${formatNumber(topViewStats?.workzoneCoveragePct || 0, 0)}% площади · граница 0.2 м/с`}
                        tone="info"
                    />
                    <DetailRow
                        label="Скорость в зоне"
                        value={`${formatNumber(topViewStats?.workzoneVAvg || 0, 2)}–${formatNumber(topViewStats?.workzoneVMax || 0, 2)} м/с`}
                        hint="средняя – макс по области"
                        tone={getVelocityTone(topViewStats?.workzoneVMax || 0)}
                    />
                </SectionCard>
            )}

            <SectionCard
                title="Активный диффузор"
                subtitle={currentModel ? `${currentModel.series} ${currentModel.name}` : 'Текущая конфигурация'}
                icon={<Fan size={18} />}
            >
                <div>
                        <DetailRow label="Типоразмер" value={currentDiffuser?.diameter ? `${currentDiffuser.diameter} mm` : '-'} />
                        <DetailRow label="Расход" value={`${formatNumber(currentDiffuser?.volume || 0, 0)} м³/ч`} tone="info" />
                        <DetailRow label="Температура притока" value={`${formatNumber(currentDiffuser?.temperature || 0, 1)} °C`} />
                        <DetailRow label="Скорость на выходе" value={`${formatNumber(currentDiffuser?.performance?.v0 || 0, 2)} м/с`} tone="info" />
                        <DetailRow label="Скорость в рабочей зоне" value={`${formatNumber(currentDiffuser?.performance?.workzoneVelocity || 0, 2)} м/с`} tone={getVelocityTone(currentDiffuser?.performance?.workzoneVelocity || 0)} />
                </div>
            </SectionCard>

            <SectionCard title="Помещение" subtitle="Геометрия и режим расчёта" icon={<Home size={18} />}>
                <DetailRow label="Габариты" value={`${formatNumber(params?.roomWidth || 0, 1)} × ${formatNumber(params?.roomLength || 0, 1)} × ${formatNumber(params?.roomHeight || 0, 1)} м`} />
                <DetailRow label="Площадь" value={`${formatNumber(roomArea, 1)} м²`} />
                <DetailRow label="Объём" value={`${formatNumber(roomVolume, 1)} м³`} />
                <DetailRow label="Рабочая зона" value={`${formatNumber(params?.workZoneHeight || 0, 1)} м`} hint="активный расчётный срез" tone="info" />
                <DetailRow label="Температура помещения" value={`${formatNumber(params?.roomTemp || 0, 1)} °C`} />
                <DetailRow label="Монтаж" value={params?.isCeilingMounted ? 'Потолочный' : 'Свободный'} hint={params?.isCeilingMounted ? 'включён эффект Коанда' : 'без потолочного прижатия'} />
            </SectionCard>

            <SectionCard title="Датчики" subtitle={probeCards.length > 0 ? `Точек измерения: ${probeCards.length}` : 'Измерения ещё не добавлены'} icon={<Target size={18} />}>
                {probeCards.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                        Добавь датчик на сцену, и здесь появятся скорость и температура в выбранной точке.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {probeCards.map(({ probe, data }: any, idx: number) => {
                            return (
                                <div key={probe.id} className={`rounded-2xl border p-4 ${TONE_STYLES.neutral.tile}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Датчик #{idx + 1}</div>
                                            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                                X {formatNumber(probe.x, 2)} м, Y {formatNumber(probe.y, 2)} м, Z {formatNumber(probe.z, 2)} м
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemoveProbe(probe.id)}
                                            className="rounded-xl border border-black/5 bg-white/70 p-2 text-slate-500 transition-colors hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-rose-300"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <StatPill label="V" value={`${formatNumber(data.v, 2)} м/с`} tone={getVelocityTone(data.v)} />
                                        <StatPill label="T" value={`${formatNumber(data.t, 1)} °C`} tone="neutral" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>
        </div>
    );

    return (
        <>
            <div className="hidden lg:flex h-screen w-[392px] shrink-0 p-4 pl-0 transition-all duration-300 z-20">
                <div className="flex-1 overflow-y-auto rounded-[36px] bg-white/72 p-4 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] ring-1 ring-black/5 backdrop-blur-2xl custom-scrollbar dark:bg-[#05070f]/72 dark:ring-white/8">
                    {content}
                </div>
            </div>

            <div
                className={`fixed inset-x-0 bottom-0 lg:hidden max-h-[88vh] transform rounded-t-[32px] border-t border-black/10 bg-white/95 shadow-[0_-24px_60px_rgba(15,23,42,0.35)] transition-transform duration-300 ease-out dark:border-white/10 dark:bg-[#05070f]/96 z-[80] ${isMobileStatsOpen ? 'translate-y-0' : 'translate-y-full'}`}
            >
                <div className="relative flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
                    <div className="absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-slate-300 dark:bg-white/10" />
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Сводка</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">Поток и комфорт</div>
                    </div>
                    <button
                        onClick={() => setIsMobileStatsOpen(false)}
                        className="rounded-xl border border-black/5 bg-white/70 p-2 text-slate-500 transition-colors hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="overflow-y-auto p-4 pb-8 custom-scrollbar">{content}</div>
            </div>

            {isMobileStatsOpen && (
                <div
                    className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileStatsOpen(false)}
                />
            )}
        </>
    );
};
