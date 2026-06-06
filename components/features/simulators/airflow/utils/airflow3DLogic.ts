import { getDiffuserFlowType, DIFFUSER_CATALOG } from '../../../../../constants';
import { getDiffuserGeometry, getVerticalJetProfile } from './diffuserJetProfile';
import { sampleRoomField, getJetCoefficients, RoomFieldParams, JetSource } from './roomField';
import { PerformanceResult, PlacedDiffuser, Probe } from '../../../../../types';

export const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 8000, 
  SPAWN_RATE_BASE: 12,
  SPAWN_RATE_MULTIPLIER: 0
};

export interface Particle3D {
    active: boolean;
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    buoyancy: number; drag: number; age: number; life: number;
    lastHistoryTime: number;
    history: {x: number, y: number, z: number, age: number}[]; 
    color: string; 
    waveFreq: number; wavePhase: number; waveAmp: number; waveAngle: number;
    isHorizontal: boolean; isSuction: boolean;
    ownerIdx: number; // индекс диффузора-источника (для эжекции к соседним струям)
}

export interface ThreeDViewCanvasProps {
  width: number; 
  height: number;
  physics: PerformanceResult;
  isPowerOn: boolean; 
  isPlaying: boolean;
  temp: number; 
  roomTemp: number;
  flowType: string; 
  modelId: string;
  roomHeight: number; 
  roomWidth: number;
  roomLength: number;
  diffuserHeight: number; 
  workZoneHeight: number;
  viewMode?: '3d';
  placedDiffusers?: PlacedDiffuser[];
  selectedDiffuserIds?: string[];
  onSelectDiffuser?: (id: string | null, multi?: boolean) => void;
  activeTool?: string;
  probes?: Probe[];
  onAddProbe?: (x: number, y: number) => void;
  onUpdateProbePos?: (id: string, pos: {x?: number, y?: number, z?: number}) => void;
}

export const project = (x: number, y: number, z: number, width: number, height: number, rotX: number, rotY: number, scale: number, panX: number, panY: number) => {
    // 1. Вращение по Y
    const cx = Math.cos(rotY), sx = Math.sin(rotY);
    const x1 = x * cx - z * sx;
    const z1 = x * sx + z * cx;

    // 2. Вращение по X
    const cy = Math.cos(rotX), sy = Math.sin(rotX);
    const y2 = y * cy - z1 * sy;
    const z2 = y * sy + z1 * cy; // НАМ НУЖЕН Z ДЛЯ ПЕРСПЕКТИВЫ

    // 3. Перспективное искажение (Focal Length)
    const focalLength = 1500; // Настраиваемая константа
    const distance = focalLength + z2 * scale; // Отодвигаем камеру
    const pScale = distance > 0 ? focalLength / distance : 0; 
    
    // 4. Финальные экранные координаты
    const px = x1 * scale * pScale + width / 2 + panX;
    const py = y2 * scale * pScale + height / 2 + panY;
    
    return { x: px, y: py, s: pScale };
};

const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`; 
    if (t >= 28) return `255, 99, 132`; 
    if (t > 18 && t < 28) return `100, 255, 160`; 
    return `255, 255, 255`;
};

const sampleRingEmitter = (radius: number) => {
    const angle = Math.random() * Math.PI * 2;
    return {
        angle,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius
    };
};

const sampleDiskEmitter = (radius: number) => {
    const angle = Math.random() * Math.PI * 2;
    const localRadius = Math.sqrt(Math.random()) * radius;
    return {
        angle,
        x: Math.cos(angle) * localRadius,
        z: Math.sin(angle) * localRadius
    };
};

const getRenderableDiffusers = (state: ThreeDViewCanvasProps) =>
    (state.placedDiffusers || []).filter(d => !d.performance?.error && !!d.performance?.spec?.A);

export const spawnParticle = (p: Particle3D, state: ThreeDViewCanvasProps, ppm: number) => {
    // Спавним только из ПРИТОЧНЫХ воздухораспределителей; дальше движение задаёт поле.
    const renderableDiffusers = getRenderableDiffusers(state);
    const supply = renderableDiffusers.filter(
        (d) => getDiffuserFlowType(d.modelId, d.modeIdx, d.flowType) !== 'suction'
    );

    let cx = 0, cz = 0, modelId = state.modelId, spec = state.physics.spec, v0 = state.physics.v0 || 1, supplyTemp = state.temp;
    if (supply.length > 0) {
        const d = supply[Math.floor(Math.random() * supply.length)];
        cx = (d.x - state.roomWidth / 2) * ppm;
        cz = (d.y - state.roomLength / 2) * ppm;
        modelId = d.modelId;
        spec = d.performance.spec;
        v0 = d.performance.v0 || 1;
        supplyTemp = d.temperature ?? state.temp;
    } else if (state.physics.error) {
        return;
    }
    if (!spec || !spec.A) return;

    const mountedHeight = Math.max(0, Math.min(state.diffuserHeight, state.roomHeight));
    const geometry = getDiffuserGeometry(modelId, spec, ppm);
    const startY = mountedHeight * ppm - geometry.outletOffset;

    // Рождаемся в пределах выходного отверстия; начальная скорость — вниз,
    // далее частицу подхватывает поле (sampleRoomField).
    const nozzleR = (spec.A / 2000) * ppm;
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * nozzleR;

    p.x = cx + Math.cos(a) * rr;
    p.z = cz + Math.sin(a) * rr;
    p.y = startY;
    p.vx = 0;
    p.vz = 0;
    p.vy = -v0 * ppm * 0.35; // лёгкий стартовый импульс вниз
    p.buoyancy = 0;
    p.drag = 1.0;
    p.age = 0;
    p.life = 6.0 + Math.random() * 4.0;
    p.color = getGlowColor(supplyTemp);
    p.waveFreq = 3 + Math.random() * 3;
    p.wavePhase = Math.random() * Math.PI * 2;
    p.waveAmp = 1.6;
    p.waveAngle = Math.random() * Math.PI * 2;
    p.isHorizontal = false;
    p.isSuction = false;
    p.ownerIdx = -1;
    p.active = true;
    p.lastHistoryTime = 0;
    p.history.length = 0;
    p.history.push({ x: p.x, y: p.y, z: p.z, age: 0 });
};

// ==========================================
// ВЗАИМОДЕЙСТВИЕ СТРУЙ (поле импульса / застойного давления)
// ==========================================
// Лёгкое поле строится из аналитической модели настилающихся струй каждого
// диффузора (стоимость не зависит от числа частиц). Частицы читают из него:
//  - результирующую скорость потока (эжекция/унос соседнего воздуха);
//  - "застойное давление" p = (сумма модулей скоростей) − |векторная сумма|,
//    т.е. меру встречного гашения струй. Высокое p = зона столкновения.
// Это даёт реальное расталкивание встречных потоков и подъём "фонтаном",
// вместо отскока об невидимую плоскость.

export interface FlowField {
    cols: number;
    rows: number;
    cell: number;          // метров на ячейку
    roomWidth: number;
    roomLength: number;
    vx: Float32Array;      // результирующая гориз. скорость по X, м/с
    vz: Float32Array;      // результирующая гориз. скорость по Z, м/с
    p: Float32Array;       // застойное давление (мера столкновения), м/с
    // Источники-струи (для эжекции/слияния), индекс совпадает с ownerIdx частицы.
    sources: { cx: number; cz: number; strength: number; reach: number }[];
}

export const buildFlowField = (state: ThreeDViewCanvasProps, cell = 0.4): FlowField | null => {
    const roomWidth = state.roomWidth;
    const roomLength = state.roomLength;
    if (!roomWidth || !roomLength) return null;

    const cols = Math.max(1, Math.ceil(roomWidth / cell));
    const rows = Math.max(1, Math.ceil(roomLength / cell));
    const vx = new Float32Array(cols * rows);
    const vz = new Float32Array(cols * rows);
    const pp = new Float32Array(cols * rows);

    const renderable = getRenderableDiffusers(state);
    const field: FlowField = { cols, rows, cell, roomWidth, roomLength, vx, vz, p: pp, sources: [] };
    if (renderable.length < 2) return field; // взаимодействие имеет смысл от двух струй

    // Предрасчёт характеристик каждой настилающейся струи на уровне пола/рабочей зоны.
    const sources = renderable.map((d) => {
        const flowType = getDiffuserFlowType(d.modelId, d.modeIdx, d.flowType);
        const vProf = getVerticalJetProfile(d.modelId, flowType);
        const speedFactor = vProf ? vProf.speedFactor : 1.0;
        // Радиус растекания струи по полу (где струи реально встречаются) ≈ дальнобойность.
        const R = Math.max(0.7, (d.performance.throwDist || 0) * 0.7);
        const vCore = Math.max(0, (d.performance.workzoneVelocity || 0) * speedFactor);
        return { cx: d.x, cz: d.y, R, vCore, sign: flowType === 'suction' ? -1 : 1 };
    });
    field.sources = sources.map((s) => ({ cx: s.cx, cz: s.cz, strength: s.vCore, reach: s.R }));

    for (let r = 0; r < rows; r++) {
        const wz = (r + 0.5) * cell;
        for (let c = 0; c < cols; c++) {
            const wx = (c + 0.5) * cell;
            let sx = 0, sz = 0, scalar = 0;
            for (let i = 0; i < sources.length; i++) {
                const s = sources[i];
                const dx = wx - s.cx;
                const dz = wz - s.cz;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist >= s.R) continue;
                const fall = 1 - Math.pow(dist / s.R, 1.3); // плавное затухание скорости струи
                if (fall <= 0) continue;
                const v = s.vCore * fall;
                if (v < 0.001) continue;
                const ux = dist > 1e-4 ? dx / dist : 0;
                const uz = dist > 1e-4 ? dz / dist : 0;
                sx += ux * v * s.sign; // приток радиально наружу (или внутрь для вытяжки)
                sz += uz * v * s.sign;
                scalar += v;
            }
            const idx = r * cols + c;
            vx[idx] = sx;
            vz[idx] = sz;
            // Чем больше сумма модулей превышает модуль суммы — тем сильнее встречное гашение.
            pp[idx] = Math.max(0, scalar - Math.sqrt(sx * sx + sz * sz));
        }
    }
    return field;
};

// Бирлинейная выборка скорости/давления + градиент давления (для расталкивания).
export const sampleFlowField = (f: FlowField, wx: number, wz: number) => {
    const clampC = (c: number) => (c < 0 ? 0 : c > f.cols - 1 ? f.cols - 1 : c);
    const clampR = (r: number) => (r < 0 ? 0 : r > f.rows - 1 ? f.rows - 1 : r);

    const gxf = wx / f.cell - 0.5;
    const gzf = wz / f.cell - 0.5;
    let c0 = Math.floor(gxf);
    let r0 = Math.floor(gzf);
    const fx = gxf - c0;
    const fz = gzf - r0;
    const c1 = clampC(c0 + 1);
    const r1 = clampR(r0 + 1);
    c0 = clampC(c0);
    r0 = clampR(r0);

    const i00 = r0 * f.cols + c0;
    const i10 = r0 * f.cols + c1;
    const i01 = r1 * f.cols + c0;
    const i11 = r1 * f.cols + c1;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const bil = (arr: Float32Array) =>
        lerp(lerp(arr[i00], arr[i10], fx), lerp(arr[i01], arr[i11], fx), fz);

    const vxs = bil(f.vx);
    const vzs = bil(f.vz);
    const ps = bil(f.p);

    // Градиент давления центральными разностями в опорной ячейке.
    const cL = clampC(c0 - 1), cR = clampC(c0 + 1);
    const rU = clampR(r0 - 1), rD = clampR(r0 + 1);
    const gpx = (f.p[r0 * f.cols + cR] - f.p[r0 * f.cols + cL]) / (2 * f.cell);
    const gpz = (f.p[rD * f.cols + c0] - f.p[rU * f.cols + c0]) / (2 * f.cell);

    return { vx: vxs, vz: vzs, p: ps, gx: gpx, gz: gpz };
};

// Построение параметров поля воздухораспределения из размещённых диффузоров.
export const buildRoomFieldParams = (state: ThreeDViewCanvasProps): RoomFieldParams => {
    const mountHeight = Math.max(0, Math.min(state.diffuserHeight, state.roomHeight));
    const sources: JetSource[] = getRenderableDiffusers(state).map((d) => {
        const flowType = getDiffuserFlowType(d.modelId, d.modeIdx, d.flowType);
        const c = getJetCoefficients(d.modelId);
        return {
            x: d.x,
            z: d.y,
            mountHeight,
            v0: d.performance.v0 || 0,
            F0: d.performance.spec?.f0 || 0.01,
            m: c.m, n: c.n, spreadTan: c.spreadTan,
            supplyTemp: d.temperature ?? state.temp,
            isSuction: flowType === 'suction',
        };
    });
    return {
        roomW: state.roomWidth,
        roomL: state.roomLength,
        roomH: state.roomHeight,
        roomTemp: state.roomTemp,
        sources,
    };
};

// Адвекция частицы по полю воздухораспределения: частица движется по
// результирующему полю скоростей (слияние/растекание/фонтан — из суперпозиции).
export const updateParticlePhysics = (p: Particle3D, dt: number, state: ThreeDViewCanvasProps, ppm: number, fieldParams?: RoomFieldParams | null) => {
    const ceilingY = state.roomHeight * ppm;
    const halfW = (state.roomWidth * ppm) / 2;
    const halfL = (state.roomLength * ppm) / 2;

    if (fieldParams && fieldParams.sources.length > 0) {
        // Мировые координаты частицы (м): x:0..W, y:0..H (вверх +), z:0..L.
        const wx = p.x / ppm + state.roomWidth / 2;
        const wy = p.y / ppm;
        const wz = p.z / ppm + state.roomLength / 2;
        const f = sampleRoomField(wx, wy, wz, fieldParams);

        // Частица подстраивается под локальную скорость поля (в пикселях/с).
        const k = Math.min(1, 9 * dt);
        p.vx += (f.vx * ppm - p.vx) * k;
        p.vy += (f.vy * ppm - p.vy) * k;
        p.vz += (f.vz * ppm - p.vz) * k;

        // Лёгкая турбулентность для живости картинки.
        const turb = 0.3 * ppm * dt;
        p.vx += (Math.random() - 0.5) * turb;
        p.vy += (Math.random() - 0.5) * turb * 0.4;
        p.vz += (Math.random() - 0.5) * turb;

        // Цвет — по локальной температуре поля.
        p.color = getGlowColor(f.t);

        // В почти стоячем воздухе укорачиваем жизнь (чтобы частицы не зависали).
        if (f.speed < 0.04) p.life = Math.min(p.life, p.age + 0.6);
    } else {
        p.vy -= 0.5 * ppm * dt; // нет поля (превью одного ВР): простое падение
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;

    if (p.y > ceilingY) { p.y = ceilingY; p.vy = Math.min(0, p.vy); }
    if (p.y < 0) { p.y = 0; p.vy = Math.max(0, p.vy); p.isHorizontal = true; }

    if (p.x < -halfW || p.x > halfW || p.z < -halfL || p.z > halfL) {
        p.active = false;
    }
};