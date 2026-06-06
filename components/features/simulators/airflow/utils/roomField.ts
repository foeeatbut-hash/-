// ============================================================================
//  ПОЛЕ ВОЗДУХОРАСПРЕДЕЛЕНИЯ (аналитическая теория струй)
// ----------------------------------------------------------------------------
//  Единый источник правды для симулятора КлимЛаб: и визуализация (частицы
//  движутся по полю), и инженерный анализ (скорость/температура в рабочей зоне,
//  ADPI, draft, покрытие) считаются по ОДНОМУ полю.
//
//  Методика — инженерная теория турбулентных приточных струй
//  (Гримитлин / Шепелев / ASHRAE):
//   • затухание осевой скорости свободной струи:  v_x = m·v₀·√F₀ / x
//   • затухание избыточной температуры:           Δt_x = n·Δt₀·√F₀ / x
//   • гауссов профиль скорости поперёк струи (Шлихтинг)
//   • отклонение струи под действием гравитации (число Архимеда)
//   • настилание на пол → радиальная пристенная струя
//   • суперпозиция струй: слияние, растекание и «фонтан» при встрече —
//     получаются автоматически из векторной суммы, без ad-hoc столкновений.
//
//  Координаты: x вдоль ширины (0..roomW), z вдоль длины (0..roomL),
//  y — высота (0 = пол, roomH = потолок), вверх = +y.
// ============================================================================

export interface JetSource {
    x: number;            // положение по ширине, м
    z: number;            // положение по длине, м
    mountHeight: number;  // высота установки (выход струи), м
    v0: number;           // начальная скорость на выходе, м/с
    F0: number;           // эффективная площадь выхода, м²  (spec.f0)
    m: number;            // скоростной коэффициент струи (тип ВР)
    n: number;            // температурный коэффициент струи
    spreadTan: number;    // тангенс угла полураскрытия конуса
    supplyTemp: number;   // температура притока, °C
    isSuction: boolean;   // true = вытяжка (сток)
}

export interface RoomFieldParams {
    roomW: number;
    roomL: number;
    roomH: number;
    roomTemp: number;
    sources: JetSource[];
}

export interface FieldSample {
    vx: number;   // скорость по X, м/с
    vy: number;   // скорость по Y (вверх +), м/с
    vz: number;   // скорость по Z, м/с
    t: number;    // температура, °C
    speed: number;// модуль скорости, м/с
}

const G = 9.81;

// Слой настилающейся (пристенной) струи у пола, м.
const WALL_LAYER = 0.5;

// Вклад одной приточной струи (конус + пристенная струя) в точку P.
// Возвращает накопленные компоненты скорости и взвешенную температуру.
const addSupplyJet = (
    d: JetSource,
    px: number, py: number, pz: number,
    roomTemp: number,
    acc: { vx: number; vy: number; vz: number; tw: number; wsum: number; stag: number; }
) => {
    const sqrtF = Math.sqrt(Math.max(d.F0, 1e-6));
    const dt0 = d.supplyTemp - roomTemp;

    // Число Архимеда на выходе (знак: <0 охлаждение тонет, >0 нагрев всплывает).
    const Tk = roomTemp + 273.15;
    const Ar0 = d.v0 > 0.05 ? (G * (dt0 / Tk) * sqrtF) / (d.v0 * d.v0) : 0;

    const dx = px - d.x;
    const dz = pz - d.z;
    const rH = Math.sqrt(dx * dx + dz * dz);     // горизонтальное смещение от оси
    const ux = rH > 1e-6 ? dx / rH : 0;
    const uz = rH > 1e-6 ? dz / rH : 0;

    // ---- 1. Нисходящая коническая струя ----
    const s = d.mountHeight - py;                // глубина вдоль оси (вниз)
    if (s > 0.02) {
        const x0 = Math.max(0.15, 6 * sqrtF);    // длина начального участка (ядро)
        const vAxis = Math.min(d.v0, (d.m * d.v0 * sqrtF) / Math.max(s, x0));

        const Rjet = Math.max(0.05, 0.5 * sqrtF + d.spreadTan * s); // радиус струи
        const rel = rH / Rjet;
        const prof = Math.exp(-2.0 * rel * rel); // гауссов профиль поперёк
        const vmag = vAxis * prof;

        if (vmag > 1e-4) {
            // Направление: на оси — строго вниз; к краю — отклонение наружу на угол α.
            const ang = Math.atan(d.spreadTan) * Math.min(1, rel);
            const ca = Math.cos(ang);
            const sa = Math.sin(ang);

            // Гравитационное отклонение по вертикали (Архимед): охлаждение ускоряет
            // падение, нагрев тормозит/разворачивает вверх. Накапливается с глубиной.
            const buoy = Ar0 * (s / Math.max(x0, 0.1)) * 0.6; // безразмерная поправка
            let vyComp = -vmag * ca + vmag * buoy;            // <0 вниз
            const vhMag = vmag * sa;

            acc.vx += vhMag * ux;
            acc.vz += vhMag * uz;
            acc.vy += vyComp;

            const localT = roomTemp + dt0 * (vmag / d.v0);
            acc.tw += vmag * localT;
            acc.wsum += vmag;
        }
    }

    // ---- 2. Пристенная (настилающаяся) струя у пола ----
    // Когда нисходящая струя достигает пола, она растекается радиально.
    if (py < WALL_LAYER) {
        const heightFade = 1 - py / WALL_LAYER;             // 1 у пола → 0 на границе слоя
        // Скорость струи в момент удара о пол (на глубине ≈ mountHeight).
        const sFloor = Math.max(0.15, d.mountHeight);
        const x0 = Math.max(0.15, 6 * sqrtF);
        const vImpact = Math.min(d.v0, (d.m * d.v0 * sqrtF) / Math.max(sFloor, x0));
        // Радиальное затухание пристенной струи ~ 1/r.
        const r0 = Math.max(0.2, 0.5 * sqrtF + d.spreadTan * sFloor);
        const vWall = vImpact * (r0 / Math.max(rH, r0)) * heightFade;
        if (vWall > 1e-4 && rH > 1e-6) {
            acc.vx += vWall * ux;
            acc.vz += vWall * uz;
            // Температура пристенной струи ≈ перемешанная.
            const localT = roomTemp + dt0 * 0.3;
            acc.tw += vWall * localT;
            acc.wsum += vWall;
        }
    }
};

// Вклад вытяжки (сток): радиальный приток внутрь, затухающий с расстоянием.
const addSuction = (
    d: JetSource,
    px: number, py: number, pz: number,
    acc: { vx: number; vy: number; vz: number; tw: number; wsum: number; stag: number; }
) => {
    const dx = d.x - px;
    const dz = d.z - pz;
    const dy = d.mountHeight - py;
    const dist = Math.sqrt(dx * dx + dz * dz + dy * dy);
    if (dist < 0.05) return;
    const sqrtF = Math.sqrt(Math.max(d.F0, 1e-6));
    // Сток: скорость ~ Q/(2πr²); нормируем через v0·F0.
    const vSuck = Math.min(d.v0, (d.v0 * d.F0) / (2 * Math.PI * dist * dist + 1e-3));
    if (vSuck > 1e-4) {
        acc.vx += (dx / dist) * vSuck;
        acc.vy += (dy / dist) * vSuck;
        acc.vz += (dz / dist) * vSuck;
    }
};

/**
 * Скорость и температура воздуха в точке (px,py,pz) — суперпозиция всех струй.
 * Слияние, растекание и «фонтан» при встрече возникают автоматически из
 * векторной суммы (континуальность): встречные горизонтальные составляющие
 * гасятся, а у пола остаточный застой переходит в восходящий поток.
 */
export const sampleRoomField = (
    px: number, py: number, pz: number,
    params: RoomFieldParams
): FieldSample => {
    const acc = { vx: 0, vy: 0, vz: 0, tw: 0, wsum: 0, stag: 0 };

    // Сумма модулей горизонтальных вкладов отдельных струй — для меры застоя
    // (насколько встречные струи гасят друг друга).
    let sumAbsH = 0;
    for (let i = 0; i < params.sources.length; i++) {
        const d = params.sources[i];
        if (d.isSuction) {
            addSuction(d, px, py, pz, acc);
        } else {
            const probe = { vx: 0, vy: 0, vz: 0, tw: 0, wsum: 0, stag: 0 };
            addSupplyJet(d, px, py, pz, params.roomTemp, probe);
            sumAbsH += Math.hypot(probe.vx, probe.vz);
            acc.vx += probe.vx; acc.vy += probe.vy; acc.vz += probe.vz;
            acc.tw += probe.tw; acc.wsum += probe.wsum;
        }
    }

    const resH = Math.hypot(acc.vx, acc.vz);
    const stagnation = Math.max(0, sumAbsH - resH); // встречное гашение струй

    // «Фонтан»: у пола застой переходит в восходящий поток (континуальность).
    const fountainGate = Math.max(0, 1 - py / WALL_LAYER);
    acc.vy += stagnation * fountainGate * 0.8;

    const speed = Math.sqrt(acc.vx * acc.vx + acc.vy * acc.vy + acc.vz * acc.vz);
    const t = acc.wsum > 0 ? acc.tw / acc.wsum : params.roomTemp;

    return { vx: acc.vx, vy: acc.vy, vz: acc.vz, t, speed };
};

// Коэффициенты струи по типу воздухораспределителя (для теории струй).
// m — скоростной коэффициент, n — температурный, spreadTan — раскрытие конуса.
export const getJetCoefficients = (modelId: string): { m: number; n: number; spreadTan: number } => {
    switch (modelId) {
        case 'dpu-s': return { m: 6.0, n: 5.0, spreadTan: 0.07 }; // сопло: дальнобойная игла
        case 'dpu-m': return { m: 2.2, n: 1.8, spreadTan: 0.22 }; // универсальный конус
        case 'dpu-k': return { m: 1.8, n: 1.5, spreadTan: 0.34 }; // веерный, шире
        case 'dpu-v': return { m: 1.1, n: 0.9, spreadTan: 0.55 }; // вихревой, очень широкий
        default:      return { m: 2.0, n: 1.6, spreadTan: 0.25 };
    }
};
