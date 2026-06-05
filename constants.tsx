import React from 'react';
import { Grid, Box } from 'lucide-react';
import { SpecMap, EngineeringData, DiffuserModel, WikiItem, NormItem, SymbolItem } from './types';

export const CONSTANTS = {
  DEFAULT_ROOM_HEIGHT: 3.5,
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
};

// Custom Icons for DPU series
const IconDpuM = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="2" />
    <line x1="12" y1="7" x2="12" y2="2" />
    <line x1="7.67" y1="14.5" x2="3.34" y2="17" />
    <line x1="16.33" y1="14.5" x2="20.66" y2="17" />
  </svg>
);

const IconDpuV = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * Math.PI) / 4;
      const x1 = 12 + Math.cos(angle) * 4;
      const y1 = 12 + Math.sin(angle) * 4;
      const x2 = 12 + Math.cos(angle + 0.5) * 10;
      const y2 = 12 + Math.sin(angle + 0.5) * 10;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
  </svg>
);

const IconDpuS = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" strokeWidth="4" />
  </svg>
);

// ==========================================
// 1. ENGINEERING DATABASE (EQUIPMENT)
// ==========================================

export const SPECS: SpecMap = {
  // Circular DPU series
  100: { f0: 0.007, A: 99,  B: 140, C: 16, D: 55,  bodyHeight: 0.071, neckDiameter: 0.099, min: 30,  max: 150 },
  125: { f0: 0.011, A: 124, B: 170, C: 16, D: 55,  bodyHeight: 0.071, neckDiameter: 0.124, min: 40,  max: 250 },
  160: { f0: 0.018, A: 159, B: 215, C: 16, D: 60,  bodyHeight: 0.076, neckDiameter: 0.159, min: 70,  max: 400 },
  200: { f0: 0.029, A: 198, B: 258, C: 16, D: 60,  bodyHeight: 0.076, neckDiameter: 0.198, min: 120, max: 600 },
  250: { f0: 0.046, A: 248, B: 308, C: 16, D: 60,  bodyHeight: 0.076, neckDiameter: 0.248, min: 200, max: 900 },
  315: { f0: 0.075, A: 313, B: 390, C: 16, D: 70,  bodyHeight: 0.086, neckDiameter: 0.313, min: 300, max: 1200 },
  400: { f0: 0.120, A: 398, B: 490, C: 16, D: 80,  bodyHeight: 0.096, neckDiameter: 0.398, min: 500, max: 2000 },
  
  // Rectangular Grilles (Equivalent diameters)
  "200x100": { f0: 0.014, A: 200, B: 100, C: 40, D: 40, bodyHeight: 0.080, neckDiameter: 0.150, min: 50, max: 300 },
  "300x100": { f0: 0.022, A: 300, B: 100, C: 40, D: 40, bodyHeight: 0.080, neckDiameter: 0.200, min: 80, max: 450 },
  "400x150": { f0: 0.045, A: 400, B: 150, C: 50, D: 50, bodyHeight: 0.100, neckDiameter: 0.300, min: 150, max: 800 },
  "500x200": { f0: 0.075, A: 500, B: 200, C: 60, D: 60, bodyHeight: 0.120, neckDiameter: 0.400, min: 250, max: 1200 },
  "600x300": { f0: 0.138, A: 600, B: 300, C: 70, D: 70, bodyHeight: 0.140, neckDiameter: 0.500, min: 500, max: 2000 },

  // Square Ceiling (4AP)
  "450x450": { f0: 0.035, A: 450, B: 450, C: 60, D: 60, bodyHeight: 0.120, neckDiameter: 0.450, min: 200, max: 800 },
  "600x600": { f0: 0.056, A: 595, B: 595, C: 80, D: 80, bodyHeight: 0.160, neckDiameter: 0.600, min: 350, max: 1500 },
};

export const ENGINEERING_DATA: EngineeringData = {
  'dpu-v': {
    'swirl': {
      100: [
        { vol: 35, pa: 18, db: 35, throw: 2.1 },
        { vol: 60, pa: 54, db: 45, throw: 3.6 },
        { vol: 85, pa: 109, db: 50, throw: 5.2 },
        { vol: 120, pa: 216, db: 60, throw: 7.25 }
      ],
      125: [
        { vol: 45, pa: 15, db: 35, throw: 2.1 },
        { vol: 90, pa: 62, db: 45, throw: 4.3 },
        { vol: 120, pa: 110, db: 50, throw: 5.7 },
        { vol: 170, pa: 221, db: 60, throw: 8.0 }
      ],
      160: [
        { vol: 75, pa: 20, db: 35, throw: 2.8 },
        { vol: 160, pa: 91, db: 45, throw: 6.0 },
        { vol: 200, pa: 143, db: 50, throw: 7.5 },
        { vol: 300, pa: 322, db: 60, throw: 11.25 }
      ],
      200: [
        { vol: 130, pa: 28, db: 35, throw: 3.8 },
        { vol: 210, pa: 73, db: 45, throw: 6.2 },
        { vol: 245, pa: 99, db: 50, throw: 7.2 },
        { vol: 335, pa: 185, db: 60, throw: 9.75 }
      ]
    }
  },
  'dpu-m': {
    'compact': {
      100: [
        { vol: 80, pa: 16, db: 20, throw: 2.0 },
        { vol: 100, pa: 25, db: 25, throw: 2.5 },
        { vol: 150, pa: 55, db: 35, throw: 3.7 },
        { vol: 200, pa: 98, db: 45, throw: 5.0 }
      ],
      125: [
        { vol: 130, pa: 17, db: 20, throw: 2.6 },
        { vol: 180, pa: 32, db: 25, throw: 3.6 },
        { vol: 250, pa: 62, db: 35, throw: 5.0 },
        { vol: 350, pa: 122, db: 45, throw: 7.0 }
      ],
      160: [
        { vol: 180, pa: 12, db: 20, throw: 2.8 },
        { vol: 330, pa: 40, db: 25, throw: 5.1 },
        { vol: 450, pa: 75, db: 35, throw: 7.0 },
        { vol: 620, pa: 143, db: 45, throw: 9.75 }
      ],
      200: [
        { vol: 250, pa: 8.9, db: 20, throw: 3.1 },
        { vol: 450, pa: 29, db: 25, throw: 5.5 },
        { vol: 600, pa: 52, db: 35, throw: 7.3 },
        { vol: 800, pa: 92, db: 45, throw: 9.75 }
      ],
      250: [
        { vol: 350, pa: 7.0, db: 20, throw: 3.4 },
        { vol: 720, pa: 29, db: 25, throw: 7.0 },
        { vol: 990, pa: 56, db: 35, throw: 9.6 },
        { vol: 1350, pa: 104, db: 45, throw: 13.0 }
      ]
    }
  },
  'dpu-k': {
    'compact': {
      100: [
        { vol: 90, pa: 17, db: 20, throw: 2.2 },
        { vol: 110, pa: 25, db: 25, throw: 2.7 },
        { vol: 150, pa: 47, db: 35, throw: 3.7 },
        { vol: 210, pa: 92, db: 45, throw: 5.25 }
      ],
      125: [
        { vol: 110, pa: 10, db: 20, throw: 2.2 },
        { vol: 130, pa: 14, db: 25, throw: 2.6 },
        { vol: 190, pa: 30, db: 35, throw: 3.8 },
        { vol: 260, pa: 57, db: 45, throw: 5.25 }
      ],
      160: [
        { vol: 180, pa: 10, db: 20, throw: 2.8 },
        { vol: 220, pa: 15, db: 25, throw: 3.4 },
        { vol: 320, pa: 32, db: 35, throw: 5.0 },
        { vol: 460, pa: 67, db: 45, throw: 7.25 }
      ],
      200: [
        { vol: 280, pa: 9, db: 20, throw: 3.4 },
        { vol: 340, pa: 14, db: 25, throw: 4.2 },
        { vol: 470, pa: 27, db: 35, throw: 5.7 },
        { vol: 640, pa: 50, db: 45, throw: 7.75 }
      ],
      250: [
        { vol: 390, pa: 7, db: 20, throw: 3.8 },
        { vol: 480, pa: 11, db: 25, throw: 4.7 },
        { vol: 690, pa: 23, db: 35, throw: 6.7 },
        { vol: 980, pa: 46, db: 45, throw: 9.5 }
      ]
    }
  },
  'dpu-s': {
    'compact': {
      125: [
        { vol: 60, pa: 14, db: 20, throw: 6.8 },
        { vol: 90, pa: 31, db: 25, throw: 10.0 },
        { vol: 120, pa: 55, db: 35, throw: 14.0 },
        { vol: 150, pa: 86, db: 45, throw: 17.0 },
        { vol: 220, pa: 185, db: 60, throw: 24.75 }
      ],
      160: [
        { vol: 80, pa: 9.1, db: 20, throw: 7.0 },
        { vol: 120, pa: 21, db: 25, throw: 11.0 },
        { vol: 170, pa: 41, db: 35, throw: 15.0 },
        { vol: 220, pa: 69, db: 45, throw: 19.25 },
        { vol: 350, pa: 175, db: 60, throw: 30.0 }
      ],
      200: [
        { vol: 120, pa: 7.9, db: 20, throw: 8.3 },
        { vol: 170, pa: 16, db: 25, throw: 12.0 },
        { vol: 240, pa: 32, db: 35, throw: 17.0 },
        { vol: 330, pa: 60, db: 45, throw: 23.0 },
        { vol: 520, pa: 149, db: 60, throw: 35.0 }
      ],
      250: [
        { vol: 180, pa: 7.1, db: 20, throw: 9.9 },
        { vol: 240, pa: 13, db: 25, throw: 13.0 },
        { vol: 350, pa: 27, db: 35, throw: 19.0 },
        { vol: 480, pa: 50, db: 45, throw: 27.5 },
        { vol: 680, pa: 101, db: 60, throw: 37.5 }
      ]
    }
  }
};

export const DIFFUSER_CATALOG: DiffuserModel[] = [
  {
    id: 'dpu-m',
    series: 'ДПУ-М',
    name: 'Диффузор универсальный',
    modes: [
      { id: 'm-compact', name: 'Компактная струя', subtitle: 'Обтекатель выдвинут', flowType: 'vertical-conical', performanceFlowType: 'compact', b_text: 'b = 0.05A', icon: <IconDpuM size={16}/> }
    ]
  },
  {
    id: 'dpu-k',
    series: 'ДПУ-К',
    name: 'Диффузор веерный',
    modes: [
      { id: 'k-compact', name: 'Компактная струя', subtitle: 'Вставка выдвинута', flowType: 'vertical-conical', performanceFlowType: 'compact', b_text: 'Вставка вниз', icon: <IconDpuM size={16}/> }
    ]
  },
  {
    id: 'dpu-v',
    series: 'ДПУ-В',
    name: 'Диффузор вихревой',
    modes: [
      { id: 'v-vertical', name: 'Вертикальная струя', subtitle: 'Закрученный поток', flowType: 'vertical-swirl', performanceFlowType: 'swirl', b_text: 'Кольцо выдвинуто', icon: <IconDpuV size={16}/> }
    ]
  },
  {
    id: 'dpu-s',
    series: 'ДПУ-С',
    name: 'Диффузор сопловый',
    modes: [
      { id: 's-compact', name: 'Дальнобойная струя', subtitle: 'Прямой поток', flowType: 'vertical-compact', performanceFlowType: 'compact', b_text: 'Прямо', icon: <IconDpuS size={16}/> }
    ]
  }
];

export const getDiffuserFlowType = (
    modelId: string,
    modeIdx: number = 0,
    explicitFlowType?: string
) => {
    if (explicitFlowType) return explicitFlowType;
    const model = DIFFUSER_CATALOG.find(item => item.id === modelId);
    return model?.modes[modeIdx]?.flowType || model?.modes[0]?.flowType || 'vertical-conical';
};

export const getDiffuserMode = (modelId: string, modeIdx: number = 0) => {
    const model = DIFFUSER_CATALOG.find(item => item.id === modelId);
    return model?.modes[modeIdx] || model?.modes[0] || null;
};

export const getDiffuserPerformanceFlowType = (
    modelId: string,
    modeIdx: number = 0,
    explicitFlowType?: string
) => {
    if (explicitFlowType) return explicitFlowType;
    const mode = getDiffuserMode(modelId, modeIdx);
    return mode?.performanceFlowType || mode?.flowType || 'vertical-conical';
};



// Helper components for Wiki - ESTHETICALLY ENHANCED
const Var = ({c}: {c: string; children?: React.ReactNode}) => <span className="font-serif italic text-blue-200 font-semibold tracking-wide text-xl">{c}</span>;
const Num = ({c}: {c: string; children?: React.ReactNode}) => <span className="font-mono text-emerald-300 font-bold text-lg">{c}</span>;
const Op = ({c}: {c: string; children?: React.ReactNode}) => <span className="mx-2 text-slate-400 font-medium opacity-80 text-xl">{c}</span>;
const Text = ({c}: {c: string; children?: React.ReactNode}) => <span className="text-slate-300 font-sans mx-1 text-base">{c}</span>;
const Sub = ({children}: {children?: React.ReactNode}) => <sub className="text-xs text-slate-400 ml-0.5">{children}</sub>;
const Sup = ({children}: {children?: React.ReactNode}) => <sup className="text-xs text-slate-400 ml-0.5">{children}</sup>;

const Frac = ({num, den}: {num: React.ReactNode, den: React.ReactNode, children?: React.ReactNode}) => (
    <div className="inline-flex flex-col items-center align-middle mx-2" style={{verticalAlign: 'middle'}}>
        <div className="border-b-2 border-white/20 px-3 pb-1 mb-1 text-center w-full">{num}</div>
        <div className="px-2 text-center w-full">{den}</div>
    </div>
);

export const ENGINEERING_WIKI: WikiItem[] = [
  {
    id: "velocity_duct",
    category: "Аэродинамика",
    title: "Скорость воздуха",
    content_blocks: [
      { type: "text", content: "Скорость потока воздуха напрямую зависит от его расхода и площади сечения воздуховода. Для подбора сечения используется следующая зависимость:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="v"/> <Op c="="/> <Frac num={<Var c="L"/>} den={<><Num c="3600"/> <Op c="·"/> <Var c="F"/></>} />
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <Var c="v"/>, definition: "скорость воздуха, м/с"},
          {symbol: <Var c="L"/>, definition: "расход воздуха, м³/ч"},
          {symbol: <Var c="F"/>, definition: "площадь сечения воздуховода, м²"}
      ]},
      { type: "text", content: "Рекомендуемые скорости: для магистралей 6-8 м/с, для ответвлений 4-5 м/с, на решетках 2-3 м/с." }
    ]
  },
  {
    id: "vent_aero_friction",
    category: "Аэродинамика",
    title: "Потери давления на трение",
    content_blocks: [
      { type: "text", content: "Потери давления по длине воздуховода возникают из-за вязкости воздуха и трения о стенки канала. Их можно вычислить по классической формуле Дарси-Вейсбаха:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="Δp"/><Sub>tr</Sub> <Op c="="/> <Var c="λ"/> <Op c="·"/> <Frac num={<Var c="l"/>} den={<Var c="d"/>} /> <Op c="·"/> <Frac num={<><Var c="ρ"/> <Op c="·"/> <Var c="v"/><Sup>2</Sup></>} den={<Num c="2"/>} />
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <Var c="l"/>, definition: "длина участка воздуховода, м"},
          {symbol: <Var c="d"/>, definition: "диаметр воздуховода, м"},
          {symbol: <Var c="λ"/>, definition: "коэффициент трения"},
          {symbol: <Var c="ρ"/>, definition: "плотность воздуха (1.2 кг/м³)"},
          {symbol: <Var c="v"/>, definition: "средняя скорость потока, м/с"}
      ]},
      { type: "text", content: "Для воздуховодов прямоугольного сечения используется эквивалентный диаметр:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="d"/><Sub>eq</Sub> <Op c="="/> <Frac num={<><Num c="2"/><Op c="·"/><Var c="a"/><Op c="·"/><Var c="b"/></>} den={<><Var c="a"/><Op c="+"/><Var c="b"/></>} />
          </div>
      )}
    ]
  },
  {
    id: "vent_aero_local",
    category: "Аэродинамика",
    title: "Местные сопротивления",
    content_blocks: [
      { type: "text", content: "Местные потери давления возникают в фасонных элементах (отводы, тройники) из-за изменения скорости или направления потока:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="Δp"/><Sub>loc</Sub> <Op c="="/> <Var c="ξ"/> <Op c="·"/> <Frac num={<><Var c="ρ"/> <Op c="·"/> <Var c="v"/><Sup>2</Sup></>} den={<Num c="2"/>} />
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <Var c="ξ"/>, definition: "коэффициент местного сопротивления (КМС)"},
          {symbol: <Var c="ρ"/>, definition: "плотность воздуха, кг/м³"},
          {symbol: <Var c="v"/>, definition: "скорость воздуха в сечении, м/с"}
      ]}
    ]
  },
  {
    id: "vent_exchange",
    category: "Вентиляция",
    title: "Расчет воздухообмена",
    content_blocks: [
      { type: "text", content: "Необходимый воздухообмен в помещении определяется по кратности или по количеству людей. Расчет по кратности:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="L"/> <Op c="="/> <Var c="V"/><Sub>room</Sub> <Op c="·"/> <Var c="n"/>
          </div>
      )},
       { type: "variable_list", items: [
          {symbol: <Var c="L"/>, definition: "расход воздуха, м³/ч"},
          {symbol: <><Var c="V"/><Sub>room</Sub></>, definition: "объем помещения, м³"},
          {symbol: <Var c="n"/>, definition: "кратность воздухообмена (1/ч)"}
      ]},
      { type: "text", content: "Расчет по количеству людей:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="L"/> <Op c="="/> <Var c="N"/><Sub>ppl</Sub> <Op c="·"/> <Var c="L"/><Sub>norm</Sub>
          </div>
      )},
       { type: "variable_list", items: [
          {symbol: <><Var c="N"/><Sub>ppl</Sub></>, definition: "количество людей"},
          {symbol: <><Var c="L"/><Sub>norm</Sub></>, definition: "норма воздуха на 1 чел (обычно 60 м³/ч)"}
      ]}
    ]
  },
  {
      id: "heater_calc",
      category: "Отопление",
      title: "Мощность калорифера",
      content_blocks: [
          { type: "text", content: "Мощность, необходимая для нагрева приточного воздуха, рассчитывается по формуле:" },
          { type: "custom_formula", render: () => (
              <div className="flex items-center justify-center p-6 flex-wrap gap-y-4">
                  <Var c="Q"/><Sub>w</Sub> <Op c="="/> <Num c="0.278"/> <Op c="·"/> <Var c="L"/> <Op c="·"/> <Var c="ρ"/> <Op c="·"/> <Var c="c"/> <Op c="·"/> <Text c="(" /><Var c="t"/><Sub>out</Sub> <Op c="-"/> <Var c="t"/><Sub>in</Sub><Text c=")" />
              </div>
          )},
          { type: "variable_list", items: [
              {symbol: <><Var c="Q"/><Sub>w</Sub></>, definition: "тепловая мощность, Вт"},
              {symbol: <Var c="L"/>, definition: "расход воздуха, м³/ч"},
              {symbol: <Var c="ρ"/>, definition: "плотность воздуха (1.2 кг/м³)"},
              {symbol: <Var c="c"/>, definition: "теплоемкость воздуха (1.006 кДж/кг·°C)"},
              {symbol: <><Var c="t"/><Sub>out</Sub></>, definition: "температура на выходе, °C"},
              {symbol: <><Var c="t"/><Sub>in</Sub></>, definition: "температура на входе, °C"}
          ]}
      ]
  },
  {
    id: "mixing_air",
    category: "Термодинамика",
    title: "Смешение воздуха",
    content_blocks: [
      { type: "text", content: "При смешении двух потоков воздуха (например, рециркуляционного и наружного) температура смеси определяется как средневзвешенная величина:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="t"/><Sub>mix</Sub> <Op c="="/> <Frac num={<><Var c="L"/><Sub>1</Sub><Op c="·"/><Var c="t"/><Sub>1</Sub> <Op c="+"/> <Var c="L"/><Sub>2</Sub><Op c="·"/><Var c="t"/><Sub>2</Sub></>} den={<><Var c="L"/><Sub>1</Sub> <Op c="+"/> <Var c="L"/><Sub>2</Sub></>} />
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <><Var c="t"/><Sub>mix</Sub></>, definition: "температура смеси, °C"},
          {symbol: <><Var c="L"/><Sub>1,2</Sub></>, definition: "расход воздуха потоков, м³/ч"},
          {symbol: <><Var c="t"/><Sub>1,2</Sub></>, definition: "температура потоков, °C"}
      ]}
    ]
  },
  {
    id: "psychrometry_h",
    category: "Термодинамика",
    title: "Энтальпия воздуха",
    content_blocks: [
      { type: "text", content: "Энтальпия (теплосодержание) влажного воздуха складывается из энтальпии сухой части и энтальпии водяного пара. Это ключевой параметр для расчетов кондиционирования." },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6 flex-wrap">
             <Var c="h"/> <Op c="="/> <Num c="1.006"/><Op c="·"/><Var c="t"/> <Op c="+"/> <Frac num={<Var c="d"/>} den={<Num c="1000"/>}/> <Op c="·"/> <Text c="(" /><Num c="2501"/> <Op c="+"/> <Num c="1.86"/><Op c="·"/><Var c="t"/><Text c=")" />
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <Var c="h"/>, definition: "энтальпия, кДж/кг"},
          {symbol: <Var c="t"/>, definition: "температура воздуха, °C"},
          {symbol: <Var c="d"/>, definition: "влагосодержание, г/кг"}
      ]}
    ]
  },
  {
    id: "cooling_load_solar",
    category: "Кондиционирование",
    title: "Теплопритоки (Окна)",
    content_blocks: [
      { type: "text", content: "Теплопоступления через остекление от солнечной радиации являются одной из основных составляющих тепловой нагрузки в летний период:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="Q"/><Sub>sun</Sub> <Op c="="/> <Var c="F"/><Sub>win</Sub> <Op c="·"/> <Var c="q"/><Sub>rad</Sub> <Op c="·"/> <Var c="k"/><Sub>shade</Sub>
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <><Var c="F"/><Sub>win</Sub></>, definition: "площадь остекления, м²"},
          {symbol: <><Var c="q"/><Sub>rad</Sub></>, definition: "солнечная радиация (зависит от ориентации), Вт/м²"},
          {symbol: <><Var c="k"/><Sub>shade</Sub></>, definition: "коэффициент затенения (пропускания стекол и штор)"}
      ]}
    ]
  },
  {
    id: "smoke_extraction",
    category: "Безопасность",
    title: "Дымоудаление",
    content_blocks: [
      { type: "text", content: "Массовый расход удаляемых продуктов горения из коридора при пожаре рассчитывается по методике МР ВНИИПО. Базовая зависимость от площади проема:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="G"/><Sub>sm</Sub> <Op c="="/> <Var c="k"/> <Op c="·"/> <Var c="A"/><Sub>d</Sub> <Op c="·"/> <Var c="H"/><Sub>d</Sub><Sup>0.5</Sup>
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <><Var c="G"/><Sub>sm</Sub></>, definition: "массовый расход дыма, кг/с"},
          {symbol: <><Var c="A"/><Sub>d</Sub></>, definition: "площадь дверного проема (ширина x высота), м²"},
          {symbol: <><Var c="H"/><Sub>d</Sub></>, definition: "высота двери, м"},
          {symbol: <Var c="k"/>, definition: "коэффициент (зависит от высоты нейтральной зоны)"}
      ]}
    ]
  },
  {
      id: "acoustics_basic",
      category: "Акустика",
      title: "Суммирование шума",
      content_blocks: [
          { type: "text", content: "При наличии нескольких источников шума общий уровень звукового давления рассчитывается логарифмически:" },
          { type: "custom_formula", render: () => (
              <div className="flex items-center justify-center p-6">
                  <Var c="L"/><Sub>sum</Sub> <Op c="="/> <Num c="10"/> <Op c="·"/> <Text c="lg"/> <Text c="("/> 
                  <Text c="∑"/> <Num c="10"/> <Sup><Text c="0.1·L"/><i>i</i></Sup>
                  <Text c=")"/>
              </div>
          )},
          { type: "text", content: "Если два источника имеют одинаковый уровень шума, общий уровень увеличивается на 3 дБ." }
      ]
  }
];

export const NORMS_DB: NormItem[] = [
    { 
        code: 'СП 60.13330.2020', 
        title: 'Отопление, вентиляция и кондиционирование воздуха', 
        status: 'Действующий (с изм. 1, 2)', 
        desc: 'Главный свод правил для проектировщика ОВиК. Регламентирует расчеты воздухообмена, подачу наружного воздуха, тепловые балансы систем и общие требования к вентиляционному оборудованию.' 
    },
    { 
        code: 'СП 7.13130.2013', 
        title: 'Отопление, вентиляция и кондиционирование. Требования пожарной безопасности', 
        status: 'Действующий', 
        desc: 'Регламентирует устройство систем противодымной защиты, дымоудаления, подпора воздуха и установку огнезадерживающих клапанов (ОЗК) для предотвращения распространения пожара.' 
    },
    { 
        code: 'ГОСТ 30494-2011', 
        title: 'Здания жилые и общественные. Параметры микроклимата в помещениях', 
        status: 'Действующий', 
        desc: 'Устанавливает оптимальные и допустимые параметры температуры, относительной влажности, скорости движения воздуха и результирующей температуры в помещениях разного назначения.' 
    },
    { 
        code: 'СП 131.13330.2020', 
        title: 'Строительная климатология', 
        status: 'Действующий (с изм. 2024-2025)', 
        desc: 'Справочник климатических параметров по регионам РФ: расчетные температуры наружного воздуха самого холодного периода (параметры А и Б), средние скорости ветра и барометрическое давление.' 
    },
    { 
        code: 'СанПиН 1.2.3685-21', 
        title: 'Гигиенические нормативы и требования к обеспечению безопасности факторов среды обитания', 
        status: 'Действующий (ред. 2026)', 
        desc: 'Содержит обязательные нормативы микроклимата жилых, общественных, производственных помещений и предельно допустимые концентрации (ПДК) вредных веществ в приземном слое.' 
    },
    { 
        code: 'ГОСТ Р 21.205-2016', 
        title: 'СПДС. Условные обозначения элементов санитарно-технических систем', 
        status: 'Действующий', 
        desc: 'Стандарт, регламентирующий графические и буквенно-цифровые обозначения трубопроводов, воздуховодов, вентиляторов, клапанов и контрольно-измерительных приборов на плоских чертежах.' 
    },
    { 
        code: 'СП 50.13330.2012', 
        title: 'Тепловая защита зданий', 
        status: 'Действующий', 
        desc: 'Определяет нормируемое сопротивление теплопередаче наружных ограждающих конструкций (стен, окон, перекрытий). Критический документ для расчета теплопотерь зимой и теплопритоков летом.' 
    },
    { 
        code: 'Р НП "АВОК" 5.5.1-2018', 
        title: 'Расчет параметров систем противодымной защиты жилых и общественных зданий', 
        status: 'Рекомендованный', 
        desc: 'Официальные научно-методические рекомендации экспертов АВОК по детальному расчету систем компенсационного притока, дымоудаления из коридоров и подпора воздуха в шахты лифтов.' 
    },
    { 
        code: 'СП 118.13330.2022', 
        title: 'Общественные здания и сооружения', 
        status: 'Действующий', 
        desc: 'Регламентирует нормы воздухообмена по кратностям и на 1 человека для конкретных помещений: учебных классов, офисов, спортивных и зрительных залов, вестибюлей.' 
    }
];

export const AVOK_SYMBOLS: SymbolItem[] = [
  {
    id: 'fan_radial',
    category: 'Оборудование',
    title: 'Вентилятор радиальный',
    desc: 'Радиальный (центробежный) вентилятор. Чертится по ГОСТ 21.205 в виде спирального кожуха ("улитки") с фланцем выпуска воздуха.',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
        <circle cx="12" cy="13" r="6" className="text-slate-500" />
        <path d="M12 7h7v11l-3-3" />
        <path d="M6 13h12" strokeDasharray="1 1" />
        <circle cx="12" cy="13" r="1" fill="currentColor" />
        <path d="M12 13l-4 4" />
      </svg>
    )
  },
  {
    id: 'fan_axial',
    category: 'Оборудование',
    title: 'Вентилятор осевой',
    desc: 'Осевой вентилятор. Чертится в виде круга, пересеченного сквозной стрелкой направления воздушного потока с лопастными линиями.',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
        <circle cx="12" cy="12" r="8" className="text-slate-500"/>
        <path d="M12 4v16" strokeDasharray="1 1" />
        <path d="M4 12h16" />
        <path d="M17 10l3 2-3 2" fill="currentColor" />
        <path d="M8 8c2 1 6 7 8 8" strokeWidth="2.5" />
        <path d="M16 8c-2 1-6 7-8 8" strokeWidth="2.5" />
      </svg>
    )
  },
  {
    id: 'fan_roof',
    category: 'Оборудование',
    title: 'Вентилятор крышный',
    desc: 'Вентилятор крышной установки. Чертится на горизонтальной осевой линии кровли с защитным зонтиком выброса воздуха по сторонам.',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
        <path d="M3 18h18" strokeWidth="2" className="text-slate-500" />
        <path d="M9 18l1-5h4l1 5" fill="currentColor" fillOpacity="0.1" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 8l5-3 5 3" strokeWidth="2" />
        <path d="M12 5v3" />
      </svg>
    )
  },
  {
    id: 'filter_panel',
    category: 'Элементы',
    title: 'Фильтр кассетный (панельный)',
    desc: 'Сухой воздушный фильтр грубой или тонкой очистки (обозначение "Ф"). Сетчатый прямоугольник с пересекающимися диагоналями.',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
         <rect x="2" y="6" width="20" height="12" rx="1" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
         <path d="M2 6l20 12M22 6L2 18" />
         <path d="M7 6v12M12 6v12M17 6v12" strokeDasharray="1 2" />
      </svg>
    )
  },
  {
    id: 'filter_pocket',
    category: 'Элементы',
    title: 'Фильтр карманный',
    desc: 'Воздушный фильтр повышенной пылеемкости. Диагональные зубцы символизируют мягкие фильтрующие тканевые карманы.',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
         <rect x="2" y="6" width="20" height="12" rx="1" className="text-slate-500" />
         <path d="M4 18V6l4 12V6l4 12V6l4 12V6l4 12" />
      </svg>
    )
  },
  {
      id: 'heater_water',
      category: 'Теплообменники',
      title: 'Воздухонагреватель (Калорифер)',
      desc: 'Водяной или паровой нагреватель воздуха. Зигзагообразная перемычка показывает водяной змеевик, патрубки указывают подвод теплоносителя.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="4" y="6" width="16" height="12" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
            <path d="M4 14.5l3-5 3 5 3-5 3 5 4-5" />
            <circle cx="2" cy="8.5" r="1" fill="currentColor" />
            <circle cx="2" cy="15.5" r="1" fill="currentColor" />
            <path d="M2 8.5h2M2 15.5h2" />
        </svg>
      )
  },
  {
      id: 'cooler_freon',
      category: 'Теплообменники',
      title: 'Воздухоохладитель',
      desc: 'Водяной или фреоновый испарительный секционный охладитель. Отличается диагональными патрубками и вертикальной разметкой оседания конденсата.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="4" y="6" width="16" height="12" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
            <path d="M4 9.5l3 5 3-5 3 5 3-5 4 5" />
            <path d="M12 6V18" strokeDasharray="2 1" />
            <circle cx="2" cy="8.5" r="1" fill="currentColor" />
            <circle cx="22" cy="15.5" r="1" fill="currentColor" />
            <path d="M2 8.5h2M20 15.5h2" />
        </svg>
      )
  },
  {
      id: 'recuperator_plate',
      category: 'Теплообменники',
      title: 'Рекуператор перекрестноточный',
      desc: 'Теплообменник пластинчатого типа. Перекрещивающиеся диагонали обозначают независимые, перекрестно направленные потоки воздуха (без смешения).',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="4" y="4" width="16" height="16" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
            <path d="M4 4l16 16M20 4L4 20" />
            <path d="M4 12h16M12 4v16" strokeDasharray="1 2" />
        </svg>
      )
  },
  {
      id: 'recuperator_rotor',
      category: 'Теплообменники',
      title: 'Рекуператор роторный',
      desc: 'Рекуператор с вращающейся теплообменной насадкой. Полукруглая жирная стрелка символизирует роторное вращение теплообменного колеса.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="4" y="4" width="16" height="16" className="text-slate-500" />
            <circle cx="12" cy="12" r="6" />
            <path d="M12 6a6 6 0 0 1 6 6" strokeWidth="3.5" />
            <path d="M18 12l2-2M18 12l-2-2" strokeWidth="1.5" />
            <path d="M4 12V4h8" strokeWidth="1" strokeDasharray="1 1" />
        </svg>
      )
  },
  {
      id: 'damper_manual',
      category: 'Арматура',
      title: 'Заслонка воздушная регулирующая',
      desc: 'Клапан воздушный общего назначения. Чертится в виде прямоугольника с продольной створкой и кружком электропривода/ручки (регулирующий).',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="8" width="16" height="8" className="text-slate-500"/>
             <path d="M4 16L20 8" strokeWidth="2" />
             <circle cx="12" cy="12" r="2" fill="currentColor" />
             <path d="M12 10V6h4" />
        </svg>
      )
  },
  {
      id: 'damper_fire',
      category: 'Арматура',
      title: 'Нормально открытый клапан ОЗК',
      desc: 'Противопожарный огнезадерживающий клапан ОЗК. Диагональ делит сечение пополам, символизируя автоматическое захлопывание механизма при пожаре.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="7" width="16" height="10" className="text-slate-500"/>
             <path d="M4 7l16 10" />
             <path d="M4 17l6-5.12" fill="currentColor" fillOpacity="0.1" />
             <rect x="10" y="3" width="4" height="4" fill="currentColor" />
             <path d="M12 7V11" />
             <text x="12" y="14" fontSize="4.5" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" className="font-sans">ОЗК</text>
        </svg>
      )
  },
  {
      id: 'damper_smoke',
      category: 'Арматура',
      title: 'Клапан дымоудаления (ДУ)',
      desc: 'Клапан противодымной защиты. Чертится полностью скрещенным диагоналями; устанавливается в шахтах вентиляции путей эвакуации.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="7" width="16" height="10" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
             <path d="M4 7l16 10M4 17l16-10" />
             <rect x="10" y="3" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1" />
             <circle cx="12" cy="5" r="0.5" fill="currentColor" />
             <text x="12" y="14.5" fontSize="4.5" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" className="font-sans">ДУ</text>
        </svg>
      )
  },
  {
      id: 'check_valve',
      category: 'Арматура',
      title: 'Клапан обратный',
      desc: 'Пропускает поток только в одну сторону. Створка отклоняется в сторону рабочего давления газа, препятствуя обратному дутью.',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="7" width="16" height="10" className="text-slate-500" />
             <path d="M8 14.5l5.5-4.5" strokeWidth="2.5" />
             <circle cx="13.5" cy="10" r="1.5" fill="currentColor" />
             <path d="M12 7v1" strokeDasharray="1 1" />
         </svg>
      )
  },
  {
      id: 'silencer_rect',
      category: 'Элементы',
      title: 'Шумоглушитель пластинчатый',
      desc: 'Глушитель аэродинамического шума для прямоугольных систем. Обозначается центральной плоской осью и звукопоглощающими стенками.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="2" y="7" width="20" height="10" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
             <path d="M2 12h20" strokeWidth="1" />
             <path d="M5 7v10M10 7v10M15 7v10M20 7v10" strokeDasharray="1 2" />
             <path d="M2 8.5h20M2 15.5h20" strokeDasharray="3 1" />
        </svg>
      )
  },
  {
      id: 'silencer_round',
      category: 'Элементы',
      title: 'Шумоглушитель трубчатый (круглый)',
      desc: 'Шумоглушитель для спирально-навивных каналов. Концентрический пунктирный круг показывает перфорированную внутреннюю трубу.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <circle cx="12" cy="12" r="8" className="text-slate-500" />
             <circle cx="12" cy="12" r="5" strokeDasharray="2 1" />
             <path d="M12 2v20M2 12h20" strokeDasharray="1 3" />
        </svg>
      )
  },
  {
      id: 'duct_transition',
      category: 'Элементы',
      title: 'Переход сечения (конфузор/диффузор)',
      desc: 'Сужающийся или расширяющийся элемент воздуховода для изменения скорости и статического давления в сети.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <path d="M3 6h6l7 4h5v4h-5L9 18H3V6z" className="text-slate-500" fill="currentColor" fillOpacity="0.1" />
             <line x1="9" y1="6" x2="9" y2="18" strokeDasharray="1 1" />
             <line x1="16" y1="10" x2="16" y2="14" strokeDasharray="1 1" />
        </svg>
      )
  },
  {
      id: 'flexible_duct',
      category: 'Элементы',
      title: 'Гибкая вставка воздуховода',
      desc: 'Виброизолирующий соединитель вентилятора с магистралью. Волнистый контур изображает брезентовый демпфер.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="2" y="8" width="20" height="8" strokeDasharray="1 2" className="text-slate-500" />
             <path d="M2 9.5c1.5 2.5 3-2.5 4.5 0s3 2.5 4.5 0c1.5-2.5 3 2.5 4.5 0s3 2.5 4.5 0" strokeWidth="1.75" />
             <path d="M2 14.5c1.5 2.5 3-2.5 4.5 0s3 2.5 4.5 0c1.5-2.5 3 2.5 4.5 0s3 2.5 4.5 0" strokeWidth="1.75" />
        </svg>
      )
  },
  {
      id: 'diffuser_supply',
      category: 'Элементы',
      title: 'Диффузор приточный',
      desc: 'Квадратная или круглая решетка подачи воздуха. Изображается в виде перекрестных диагоналей с направленной стрелкой притока.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="4" width="16" height="16" className="text-slate-500" />
             <path d="M4 4l16 16M20 4L4 20" />
             <path d="M7 12h10" strokeWidth="2" />
             <path d="M14 9l3 3-3 3" fill="currentColor" />
        </svg>
      )
  },
  {
      id: 'diffuser_extract',
      category: 'Элементы',
      title: 'Диффузор вытяжной',
      desc: 'Квадратная решетка забора отработанного воздуха. По ГОСТ имеет заштрихованное или полузакрашенное перекрестное сечение.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="4" width="16" height="16" className="text-slate-500" fill="currentColor" fillOpacity="0.15" />
             <path d="M4 4l16 16M20 4L4 20" />
             <path d="M10 12h4" strokeWidth="1.5" />
        </svg>
      )
  },
  {
      id: 'exhaust_hood',
      category: 'Элементы',
      title: 'Зонт вентиляционный (вытяжной)',
      desc: 'Вытяжной козырек местного отсоса тепла и запахов. Располагается над кухонными плитами или технологическими машинами в цехах.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <path d="M3 15l9-9 9 9z" fill="currentColor" fillOpacity="0.1" />
             <path d="M7 15v4h10v-4" />
             <path d="M12 6V3" strokeDasharray="1 1" />
        </svg>
      )
  },
  {
      id: 'split_ac',
      category: 'Оборудование',
      title: 'Кондиционер (внутренний блок)',
      desc: 'Настенный внутренний блок мульти-сплит системы. Чертится в виде параллелепипеда, обдувающего кондиционированное пространство.',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="2" y="5" width="20" height="8" rx="1" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
             <path d="M5 13h14l-2 3H7l-2-3z" fill="currentColor" fillOpacity="0.1" />
             <path d="M2 9h20M4 11h2M18 11h2" strokeWidth="1" />
        </svg>
      )
  },
  {
      id: 'sensor_temp',
      category: 'Автоматика',
      title: 'Датчик температуры (TE)',
      desc: 'Temperature Element. Измеритель температуры в жиле воздуховода или на водяном трубопроводе смесительного узла.',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <circle cx="12" cy="12" r="8" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
             <text x="12" y="15" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="currentColor" stroke="none" className="font-mono">TE</text>
             <path d="M12 20v2" />
         </svg>
      )
  },
  {
      id: 'sensor_press',
      category: 'Автоматика',
      title: 'Датчик давления (PE)',
      desc: 'Pressure Element. Датчик измерения напора. В основном используется как реле перепада давления (дифманометр) для фильтров.',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <circle cx="12" cy="12" r="8" className="text-slate-500" fill="currentColor" fillOpacity="0.05" />
             <text x="12" y="15" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="currentColor" stroke="none" className="font-mono">PE</text>
             <path d="M12 20v2" />
         </svg>
      )
  }
];

/*
export const SOLAR_GAINS_OLD = {
    North: 50,  // Вт/м2
             <rect x="4" y="8" width="16" height="8" className="text-slate-500"/>
             <path d="M4 16L20 8" />
             <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        </svg>
      )
  },
  {
      id: 'damper_fire',
      category: 'Арматура',
      title: 'Клапан ОЗК',
      desc: 'Огнезадерживающий клапан',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="6" width="16" height="12" className="text-slate-500"/>
             <path d="M4 6L20 18" />
             <path d="M20 6L4 18" />
        </svg>
      )
  },
    {
      id: 'silencer',
      category: 'Элементы',
      title: 'Шумоглушитель',
      desc: 'Секция шумоглушения',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="2" y="8" width="20" height="8" className="text-slate-500"/>
             <path d="M6 8L18 16" />
             <path d="M6 16L18 8" />
        </svg>
      )
  },
  {
      id: 'check_valve',
      category: 'Арматура',
      title: 'Обратный клапан',
      desc: 'Клапан, пропускающий воздух в одном направлении',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="6" width="16" height="12" className="text-slate-500"/>
             <path d="M12 6V18" />
             <path d="M12 6L16 12H8L12 6Z" fill="currentColor"/>
         </svg>
      )
  },
  {
      id: 'sensor_temp',
      category: 'Автоматика',
      title: 'Датчик (TE)',
      desc: 'Датчик температуры (Temperature Element)',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <circle cx="12" cy="12" r="8" className="text-slate-500"/>
             <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">TE</text>
         </svg>
      )
  },
  {
      id: 'sensor_press',
      category: 'Автоматика',
      title: 'Датчик (PE)',
      desc: 'Датчик давления (Pressure Element)',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <circle cx="12" cy="12" r="8" className="text-slate-500"/>
             <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">PE</text>
         </svg>
      )
  },
  {
      id: 'heat_exchanger',
      category: 'Теплообменники',
      title: 'Рекуператор',
      desc: 'Пластинчатый теплообменник',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="4" y="4" width="16" height="16" className="text-slate-500"/>
            <path d="M4 4L20 20" />
            <path d="M20 4L4 20" />
        </svg>
      )
  }
];
*/

export const SOLAR_GAINS = {
    North: 50,  // Вт/м2
    South: 250,
    East: 450,
    West: 550,  // Самое агрессивное солнце
    Horizontal: 700 // Мансардные окна
};

export const WALL_TRANSMISSION = {
    Brick_Old: 1.5, // Вт/м2*К (Старый кирпич)
    Concrete: 2.0,  // Бетон без утепления
    Modern: 0.5,    // Современная стена с утеплителем
    Glass_Single: 5.8, // Однокамерный
    Glass_Double: 2.8  // Двухкамерный
};

export const INTERNAL_LOADS = {
    Person_Office: 120, // Вт
    Person_Active: 250,
    Computer: 200,
    TV: 150,
    Lighting_LED: 10 // Вт/м2
};
