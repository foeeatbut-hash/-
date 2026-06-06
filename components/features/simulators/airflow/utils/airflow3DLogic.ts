import { getDiffuserFlowType, DIFFUSER_CATALOG } from '../../../../../constants';
import { getDiffuserGeometry, getVerticalJetProfile } from './diffuserJetProfile';
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
    let activeDiffuser: {
        x: number, 
        y: number,
        performance: PerformanceResult,
        modelId: string,
        flowType?: string,
        modeIdx?: number
    };

    const renderableDiffusers = getRenderableDiffusers(state);

    if (renderableDiffusers.length > 0) {
        const idx = Math.floor(Math.random() * renderableDiffusers.length);
        const d = renderableDiffusers[idx];
        
        activeDiffuser = {
            x: (d.x - state.roomWidth / 2) * ppm,
            y: (d.y - state.roomLength / 2) * ppm,
            performance: d.performance,
            modelId: d.modelId,
            flowType: d.flowType,
            modeIdx: d.modeIdx
        };
    } else {
        activeDiffuser = {
            x: 0,
            y: 0,
            performance: state.physics,
            modelId: state.modelId,
            flowType: state.flowType
        };
    }

    const { performance: physics, modelId, x: centerX, y: centerZ, flowType: explicitFlowType, modeIdx } = activeDiffuser;
    const { temp, diffuserHeight, roomHeight } = state;
    
    if (physics.error) return;
    const spec = physics.spec;
    if (!spec || !spec.A) return;

    const flowType = explicitFlowType || state.flowType || 'vertical-conical';

    const nozzleW = (spec.A / 1000) * ppm;
    const geometry = getDiffuserGeometry(modelId, spec, ppm);

    const mountedHeight = Math.max(0, Math.min(diffuserHeight, roomHeight));
    const startY = mountedHeight * ppm - geometry.outletOffset;

    // ИСПРАВЛЕНИЕ 2: Увеличиваем стартовую скорость для более выраженного рисунка
    const pxSpeed = (physics.v0 || 0) * ppm * 0.8;

    let pX = centerX;
    let pY = startY;
    let pZ = centerZ;

    let vx = 0, vy = 0, vz = 0;
    let drag = 0.96;
    let waveAmp = 5;
    let waveFreq = 4 + Math.random() * 4;
    let isHorizontal = false;
    let isSuction = false;

    const physicsAr = physics.Ar || 0; 
    const visualGain = 50.0; 
    const buoyancy = physicsAr * (physics.v0 * physics.v0) * ppm * visualGain;

    if (flowType === 'suction') {
        isSuction = true;
        drag = 1.0; waveAmp = 0;
        p.life = 3.0; 
        p.color = '150, 150, 150';
    } else {
        const verticalProfile = getVerticalJetProfile(modelId, flowType);

        if (verticalProfile) {
            const emitterRadius = nozzleW * (verticalProfile.radiusFactor + Math.random() * verticalProfile.radiusJitter);
            const emitter = verticalProfile.emitter === 'ring'
                ? sampleRingEmitter(emitterRadius)
                : sampleDiskEmitter(emitterRadius);
            const coneAngle = (verticalProfile.coneMinDeg + Math.random() * verticalProfile.coneJitterDeg) * (Math.PI / 180);
            
            // ИСПРАВЛЕНИЕ 3: Умножаем разлет конуса и вихрей в 2.5 раза
            const horizontalSpeed = Math.sin(coneAngle) * pxSpeed * verticalProfile.horizontalFactor;
            const radialDirection = 1 - 2 * verticalProfile.inwardFactor;
            const tangentialSpeed = pxSpeed * verticalProfile.tangentialFactor;

            pX += emitter.x;
            pZ += emitter.z;
            vx = Math.cos(emitter.angle) * horizontalSpeed * radialDirection - Math.sin(emitter.angle) * tangentialSpeed;
            vz = Math.sin(emitter.angle) * horizontalSpeed * radialDirection + Math.cos(emitter.angle) * tangentialSpeed;
            vy = -Math.cos(coneAngle) * pxSpeed * verticalProfile.speedFactor;
            waveAmp = verticalProfile.waveAmp;
            waveFreq = verticalProfile.waveFreq;
            drag = verticalProfile.drag;
        } else {
            const emitter = sampleDiskEmitter(nozzleW * 0.25);
            pX += emitter.x;
            pZ += emitter.z;
            const coneAngle = (15 + Math.random() * 15) * (Math.PI / 180);
            const horizontalSpeed = Math.sin(coneAngle) * pxSpeed * 0.6;
            vx = Math.cos(emitter.angle) * horizontalSpeed;
            vz = Math.sin(emitter.angle) * horizontalSpeed;
            vy = -Math.cos(coneAngle) * pxSpeed;
            waveAmp = 4; drag = 0.98;
        }

        p.life = 6.0 + Math.random() * 4.0;
        p.color = getGlowColor(temp);
    }

    p.x = pX; p.y = pY; p.z = pZ;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.buoyancy = buoyancy; 
    
    // ИСПРАВЛЕНИЕ 4: Смягчаем сопротивление воздуха, чтобы конус не сжимался
    p.drag = drag; 
    
    p.age = 0; 
    p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp; p.waveAngle = Math.random() * Math.PI * 2;
    p.isHorizontal = isHorizontal; p.isSuction = isSuction;
    p.active = true;
    p.lastHistoryTime = 0;
    p.history.length = 0; 
    p.history.push({ x: pX, y: pY, z: pZ, age: 0 });
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
    const field: FlowField = { cols, rows, cell, roomWidth, roomLength, vx, vz, p: pp };
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

export const updateParticlePhysics = (p: Particle3D, dt: number, state: ThreeDViewCanvasProps, ppm: number, field?: FlowField | null) => {
    const mountedHeight = Math.max(0, Math.min(state.diffuserHeight, state.roomHeight));

    p.age += dt;

    if (p.isSuction) {
        p.x += p.vx * dt; 
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const diffY = mountedHeight * ppm;
        if (p.y > diffY - 10) p.active = false; 
    } else {
        p.vy += p.buoyancy * dt;
        
        if (!p.isHorizontal) {
            const turb = 2.0 * ppm * dt;
            p.vx += (Math.random() - 0.5) * turb;
            p.vz += (Math.random() - 0.5) * turb;
        }

        // --- ВЗАИМОДЕЙСТВИЕ СО ВСТРЕЧНЫМИ СТРУЯМИ ---
        // Зона встречи струй ведёт себя как плоскость растекания (stagnation plane):
        // лобовую (нормальную к плоскости) компоненту скорости НЕ отражаем назад
        // — отражение и давало эффект «невидимой стены», — а гасим и переводим
        // вбок (растекание вдоль плоскости) и вверх («фонтан»), как реальные
        // сталкивающиеся струи.
        if (field) {
            const wx = p.x / ppm + state.roomWidth / 2;
            const wz = p.z / ppm + state.roomLength / 2;
            const s = sampleFlowField(field, wx, wz);
            const gmag = Math.sqrt(s.gx * s.gx + s.gz * s.gz);

            if (s.p > 0.015 && gmag > 1e-4) {
                const ceilingY = (state.roomHeight || 3) * ppm;
                const hFactor = Math.max(0, 1 - p.y / ceilingY); // 1 у пола → 0 у потолка

                const nx = s.gx / gmag;
                const nz = s.gz / gmag;
                const vn = p.vx * nx + p.vz * nz; // лобовая горизонтальная компонента навстречу
                if (vn > 0) {
                    // Гасим встречную горизонтальную составляющую НА ВСЕЙ ВЫСОТЕ:
                    // поэтому в зоне перекрытия струи не проходят сквозь друг друга, а
                    // СЛИВАЮТСЯ и идут вниз вместе (реальное слияние струй), а не
                    // пересекаются крест-накрест.
                    const redirect = vn * Math.min(1, s.p * 3.0);
                    p.vx -= redirect * nx;
                    p.vz -= redirect * nz;

                    // У пола встретившиеся настилающиеся струи растекаются вбок и
                    // поднимаются «фонтаном»; в воздухе этого нет (там только слияние).
                    const floorGate = Math.max(0, (hFactor - 0.55) / 0.45);
                    if (floorGate > 0) {
                        const tx = -nz, tz = nx;
                        const tDot = p.vx * tx + p.vz * tz;
                        const tSign = Math.abs(tDot) > 1e-3 ? Math.sign(tDot) : (Math.random() < 0.5 ? -1 : 1);
                        p.vx += redirect * 0.5 * floorGate * tSign * tx;
                        p.vz += redirect * 0.5 * floorGate * tSign * tz;
                        p.vy += redirect * floorGate * 1.1;
                    }
                }
            }
        }

        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vz *= p.drag;
        
        p.x += p.vx * dt; 
        p.y += p.vy * dt; 
        p.z += p.vz * dt;
    }

    const ceilingY = state.roomHeight * ppm;
    if (p.y > ceilingY) {
        p.y = ceilingY;
        p.vy = Math.min(0, p.vy * -0.05);
    }
    if (p.y <= 0) {
        p.y = 0;
        if (!p.isHorizontal) {
            p.isHorizontal = true;
            const energyLoss = 0.6;
            const impactSpeed = Math.abs(p.vy) * energyLoss;
            p.vy = 0;
            
            const currentSpeed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
            if (currentSpeed > 0.1) {
                const angle = Math.atan2(p.vz, p.vx) + (Math.random() - 0.5) * 1.5;
                p.vx += Math.cos(angle) * impactSpeed;
                p.vz += Math.sin(angle) * impactSpeed;
            } else {
                const angle = Math.random() * Math.PI * 2;
                p.vx += Math.cos(angle) * impactSpeed;
                p.vz += Math.sin(angle) * impactSpeed;
            }
            p.drag = 0.95;
        }
    }
    
    const halfW = (state.roomWidth * ppm) / 2;
    const halfL = (state.roomLength * ppm) / 2;
    
    if (p.x < -halfW) {
        p.x = -halfW;
        p.active = false;
    } else if (p.x > halfW) {
        p.x = halfW;
        p.active = false;
    }

    if (p.z < -halfL) {
        p.z = -halfL;
        p.active = false;
    } else if (p.z > halfL) {
        p.z = halfL;
        p.active = false;
    }
};