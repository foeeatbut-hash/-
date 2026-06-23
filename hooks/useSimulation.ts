
import { useMemo } from 'react';
import { SPECS, ENGINEERING_DATA, getDiffuserFlowType } from '../constants';
import { getVerticalJetProfile } from '../components/features/simulators/airflow/utils/diffuserJetProfile';
import { PerformanceResult, Spec, PlacedDiffuser, ProbeData, GridPoint } from '../types';

// ==========================================
// 4. PHYSICS & SIMULATION LOGIC
// ==========================================

export const interpolate = (val: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
};

// --- GEOMETRY HELPERS (3D Raycasting) ---

// Check if a line segment (P1 to P2) intersects an Axis-Aligned Bounding Box (AABB)
const intersectRayBox = (p1: {x: number, y: number, z: number}, p2: {x: number, y: number, z: number}, box: {minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number}) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (len === 0) return false;

    const dirX = dx / len;
    const dirY = dy / len;
    const dirZ = dz / len;

    let tMin = 0.0;
    let tMax = len;

    if (Math.abs(dirX) < 1e-9) {
        if (p1.x < box.minX || p1.x > box.maxX) return false;
    } else {
        const t1 = (box.minX - p1.x) / dirX;
        const t2 = (box.maxX - p1.x) / dirX;
        tMin = Math.max(tMin, Math.min(t1, t2));
        tMax = Math.min(tMax, Math.max(t1, t2));
    }

    if (Math.abs(dirY) < 1e-9) {
        if (p1.y < box.minY || p1.y > box.maxY) return false;
    } else {
        const t1 = (box.minY - p1.y) / dirY;
        const t2 = (box.maxY - p1.y) / dirY;
        tMin = Math.max(tMin, Math.min(t1, t2));
        tMax = Math.min(tMax, Math.max(t1, t2));
    }

    if (Math.abs(dirZ) < 1e-9) {
        if (p1.z < box.minZ || p1.z > box.maxZ) return false;
    } else {
        const t1 = (box.minZ - p1.z) / dirZ;
        const t2 = (box.maxZ - p1.z) / dirZ;
        tMin = Math.max(tMin, Math.min(t1, t2));
        tMax = Math.min(tMax, Math.max(t1, t2));
    }

    return tMax >= tMin;
};

// --- ARCHIMEDES TRAJECTORY ---
const calculateVerticalDeflection = (x: number, v0: number, dt: number, tr: number) => {
    // dy = K * (dT / Tr) * (x^3 / V0^2)
    // K is empirical constant. Approx 0.05 for typical diffusers.
    if (v0 < 0.1) return 0;
    const K = 0.05; 
    const Tr_K = tr + 273.15; // Room temp in Kelvin
    
    // x is horizontal distance.
    const deflection = K * (dt / Tr_K) * (Math.pow(x, 3) / Math.pow(v0, 2));
    
    // Limit deflection to realistic bounds to prevent math explosions close to 0 or very far
    return Math.max(-3.0, Math.min(3.0, deflection));
};

const calculateEDT = (v: number, t: number, roomTemp: number) => {
    // Effective Draft Temperature
    // (Tx - Tr) - 8 * (Vx - 0.15)
    return (t - roomTemp) - 8 * (v - 0.15);
};

// --- HELPER: CALCULATE ARCHIMEDES NUMBER ---
export const calculateArchimedes = (v0: number, f0: number, supplyTemp: number, roomTemp: number) => {
    if (v0 <= 0.1) return 0;
    const g = 9.81;
    const T_ref = 273.15 + roomTemp; 
    const beta = 1 / T_ref; 
    const dt = supplyTemp - roomTemp; 
    const l0 = Math.sqrt(f0); // Characteristic length
    
    return (g * beta * dt * l0) / (v0 * v0);
};

// --- ГЛАВНАЯ ФУНКЦИЯ РАСЧЕТА СКОРОСТИ ---
export const calculateWorkzoneVelocityAndCoverage = (
    v0: number, 
    spec_A: number, 
    diffuserHeight: number, 
    workZoneHeight: number,
    m: number = 2.0, 
    buoyancyFactor: number = 1.0 
) => {
    const dist = diffuserHeight - workZoneHeight;
    const Ak_m2 = spec_A > 0 ? spec_A / 1000000 : 0; 
    const l0 = Math.sqrt(Ak_m2); 
    const coreZone = 5 * l0; 

    if (dist <= 0) {
        const initialRadius = Math.sqrt(spec_A) / 2000.0;
        return { workzoneVelocity: v0, coverageRadius: initialRadius };
    }

    let vx = v0;
    if (dist < coreZone) {
        vx = v0;
    } else {
        if (dist > 0) {
            vx = (m * v0 * l0) / dist;
        }
    }

    vx = vx * buoyancyFactor;
    vx = Math.max(0.05, vx); 

    const initialRadius = Math.sqrt(spec_A) / 2000.0; 
    const coverageRadius = initialRadius + dist * 0.2; 
    
    return { workzoneVelocity: vx, coverageRadius };
};

export const calculatePerformance = (modelId: string, flowType: string, diameter: string | number, volume: number): Partial<PerformanceResult> | null => {
    const spec = SPECS[diameter];
    if (!spec) return null;

    if ((modelId === 'amn-adn' || modelId === '4ap') && typeof diameter === 'number') return null;
    if (modelId.includes('dpu') && typeof diameter === 'string') return null; 

    const modelData = ENGINEERING_DATA[modelId];
    if (!modelData) return null;

    let modePoints = [];
    if (modelData[flowType] && modelData[flowType][diameter]) {
        modePoints = modelData[flowType][diameter];
    } else {
        return null;
    }
    
    let pressure = 0, noise = 0, throwDist = 0;
    if (modePoints.length > 0) {
        let p1 = modePoints[0];
        let p2 = modePoints[modePoints.length - 1];
        
        for (let i = 0; i < modePoints.length - 1; i++) {
            if (volume >= modePoints[i].vol && volume <= modePoints[i+1].vol) {
                p1 = modePoints[i];
                p2 = modePoints[i+1];
                break;
            }
        }
        
        pressure = interpolate(volume, p1.vol, p2.vol, p1.pa, p2.pa);
        noise = interpolate(volume, p1.vol, p2.vol, p1.db, p2.db);
        throwDist = interpolate(volume, p1.vol, p2.vol, p1.throw, p2.throw);
    }

    const Ak = spec.f0; 
    const v0 = Ak > 0 ? volume / (3600 * Ak) : 0;

    if (throwDist === 0 && flowType === 'suction') {
         throwDist = Math.sqrt(v0 / 2.0); 
    }

    return { v0, pressure, noise, throwDist, spec };
};

export const calculateScientificPerformanceResult = (
    modelId: string,
    flowType: string,
    diameter: string | number,
    volume: number,
    temp: number,
    roomTemp: number,
    diffuserHeight: number,
    workZoneHeight: number
): PerformanceResult => {
    const perf = calculatePerformance(modelId, flowType, diameter, volume);
    const fallbackSpec: Spec = { f0: 0, A: 0, B: 0, C: 0, D: 0, min: 0, max: 0 };

    if (!perf || !perf.spec) {
        return {
            error: '???????????????????? ???? ????????????????????????',
            spec: SPECS[diameter] || fallbackSpec,
            v0: 0,
            throwDist: 0,
            pressure: 0,
            noise: 0,
            workzoneVelocity: 0,
            coverageRadius: 0,
            Ar: 0
        };
    }

    const { v0 = 0, pressure = 0, noise = 0, throwDist = 0, spec } = perf;
    const Ar = calculateArchimedes(v0, spec.f0, temp, roomTemp);

    let kArchimedes = 1.0;
    const VISUAL_GAIN = 15.0;

    if (Math.abs(Ar) > 0.00001) {
        kArchimedes = 1.0 - VISUAL_GAIN * Ar;
        kArchimedes = Math.max(0.1, Math.min(3.0, kArchimedes));
    }

    const finalThrow = Math.max(0, throwDist * kArchimedes);
    const AkMm2 = spec.f0 * 1000000;
    const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
        v0,
        AkMm2,
        diffuserHeight,
        workZoneHeight,
        2.0,
        kArchimedes
    );

    return {
        v0: Math.max(0, v0),
        pressure: Math.max(0, pressure),
        noise: Math.max(0, noise),
        throwDist: finalThrow,
        workzoneVelocity: Math.max(0, workzoneVelocity),
        coverageRadius: Math.max(0, coverageRadius),
        spec,
        Ar,
        error: null
    };
};

export const useScientificSimulation = (
    modelId: string,
    flowType: string,
    diameter: string | number,
    volume: number,
    temp: number,
    roomTemp: number,
    diffuserHeight: number,
    workZoneHeight: number
): PerformanceResult => {
    return useMemo(
        () => calculateScientificPerformanceResult(modelId, flowType, diameter, volume, temp, roomTemp, diffuserHeight, workZoneHeight),
        [modelId, flowType, diameter, volume, temp, roomTemp, diffuserHeight, workZoneHeight]
    );
};

// --- PROBE PHYSICS ---
// Updated to use same Logic as calculateSimulationField where possible
// For single point probe, we can simulate vector addition from all diffusers
const hasRenderableDiffuserSpec = (diffuser: PlacedDiffuser) =>
    !diffuser?.performance?.error && !!diffuser?.performance?.spec?.A;

export const calculateProbeData = (
    probe: { x: number, y: number, z: number }, 
    diffusers: PlacedDiffuser[], 
    roomTemp: number = 24, 
    supplyTemp: number = 20,
    roomWidth: number,
    roomLength: number,
    roomHeight: number
): ProbeData => {
    
    // Vectors accumulator
    let vxSum = 0;
    let vySum = 0;
    let scalarSum = 0; // for temperature weighting and mixing
    let weightedTempSum = 0;

    // Used for vector damping logic
    const vectors: {vx: number, vy: number, mag: number}[] = [];

    const safeDiffusers = Array.isArray(diffusers) ? diffusers.filter(hasRenderableDiffuserSpec) : [];

    safeDiffusers.forEach(d => {
        const diffZ = roomHeight; 
        
        const shadowFactor = 1.0;

        const dist2D = Math.sqrt(Math.pow(d.x - probe.x, 2) + Math.pow(d.y - probe.y, 2));
        
        const flowType = getDiffuserFlowType(d.modelId, d.modeIdx, d.flowType);
        let vPoint = 0;

        // Use diffuser specific temperature if available
        const dTemp = d.temperature || supplyTemp;

        const vProf = getVerticalJetProfile(d.modelId, flowType);
        const speedFactor = vProf ? vProf.speedFactor : 1.0;
        const horizontalFactor = vProf ? vProf.horizontalFactor : 0.5;
        
        const radius = d.performance.coverageRadius * (0.5 + horizontalFactor);
        if (dist2D <= radius) {
            const vCore = d.performance.workzoneVelocity * speedFactor;
            vPoint = vCore * Math.max(0, 1 - Math.pow(dist2D / radius, 1.5));
        }

        vPoint *= shadowFactor;

        if (vPoint > 0.01) {
            // Direction unit vector (from diffuser TO point)
            let ux = 0, uy = 0;
            if (dist2D > 0.001) {
                ux = (probe.x - d.x) / dist2D;
                uy = (probe.y - d.y) / dist2D;
            }
            
            const vx = vPoint * ux;
            const vy = vPoint * uy;

            vxSum += vx;
            vySum += vy;
            scalarSum += vPoint;
            
            const tempDecayFactor = vPoint / (d.performance.v0 || 1); 
            const localT = roomTemp + (dTemp - roomTemp) * tempDecayFactor; 
            
            weightedTempSum += vPoint * localT;
            
            vectors.push({ vx, vy, mag: vPoint });
        }
    });

    // Resultant Vector
    let vMag = Math.sqrt(vxSum*vxSum + vySum*vySum);

    // Collision Damping
    if (vectors.length >= 2) {
        vectors.sort((a, b) => b.mag - a.mag);
        const vA = vectors[0];
        const vB = vectors[1];
        const dot = vA.vx * vB.vx + vA.vy * vB.vy;
        const magMult = vA.mag * vB.mag;
        if (magMult > 0.0001) {
            const cosTheta = dot / magMult;
            if (cosTheta < 0) {
                const fColl = -cosTheta;
                vMag *= (1 - 0.5 * fColl);
            }
        }
    }

    const t = scalarSum > 0 ? weightedTempSum / scalarSum : roomTemp;
    const angle = Math.atan2(vySum, vxSum);

    let dr = 0;
    const vCalc = Math.max(0.05, vMag); 
    if (vCalc > 0.05) {
        const term1 = (34 - t);
        const term2 = Math.pow(vCalc - 0.05, 0.62);
        dr = term1 * term2 * (0.37 * vCalc * 40 + 3.14);
    }
    
    return {
        v: vMag,
        t: t,
        angle: angle,
        dr: Math.min(100, Math.max(0, dr))
    };
};

// Replaces calculateVelocityField
export const calculateSimulationField = (
    roomWidth: number, roomLength: number, placedDiffusers: PlacedDiffuser[], 
    diffuserHeight: number, workZoneHeight: number, gridStep: number = 0.5,
    supplyTemp: number = 20,
    roomTemp: number = 24,
    isCeilingMounted: boolean = true
): GridPoint[][] => {
    const cols = Math.ceil(roomWidth / gridStep);
    const rows = Math.ceil(roomLength / gridStep);
    const field: GridPoint[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));

    const diffusersWithProps = placedDiffusers
        .filter(hasRenderableDiffuserSpec)
        .map((d) => {
            const flowType = getDiffuserFlowType(d.modelId, d.modeIdx, d.flowType);
            const specArea = d.performance.spec?.A || 0;
            const Ak_m = Math.sqrt(specArea / 1000000);
            return { ...d, Ak_m, flowType };
        });

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * gridStep + gridStep / 2;
            const y = r * gridStep + gridStep / 2;
            const z = workZoneHeight; // Use workZoneHeight instead of hardcoded 1.1
            
            let vxSum = 0;
            let vySum = 0;
            let scalarSum = 0;
            let weightedTempSum = 0;
            const vectors: {vx: number, vy: number, mag: number}[] = [];
            
            diffusersWithProps.forEach((d) => {
                const dist2D = Math.sqrt(Math.pow(x - d.x, 2) + Math.pow(y - d.y, 2));
                let vPoint = 0;
                
                // Use per-diffuser temp
                const dTemp = d.temperature || supplyTemp;

                const vProf = getVerticalJetProfile(d.modelId, d.flowType);
                const speedFactor = vProf ? vProf.speedFactor : 1.0;
                const horizontalFactor = vProf ? vProf.horizontalFactor : 0.5;
                
                const radius = d.performance.coverageRadius * (0.5 + horizontalFactor);
                if (dist2D <= radius) {
                    const vCore = d.performance.workzoneVelocity * speedFactor;
                    vPoint = vCore * Math.max(0, 1 - Math.pow(dist2D / radius, 1.5));
                }

                if (vPoint > 0.01) {
                    let ux = 0, uy = 0;
                    if (dist2D > 0.001) {
                        ux = (x - d.x) / dist2D;
                        uy = (y - d.y) / dist2D;
                    }
                    const vx = vPoint * ux;
                    const vy = vPoint * uy;
                    vxSum += vx;
                    vySum += vy;
                    scalarSum += vPoint;
                    
                    const tempDecayFactor = vPoint / (d.performance.v0 || 1);
                    const localT = roomTemp + (dTemp - roomTemp) * tempDecayFactor;
                    weightedTempSum += vPoint * localT;

                    vectors.push({ vx, vy, mag: vPoint });
                }
            });

            // Vector Sum Magnitude
            let vMag = Math.sqrt(vxSum*vxSum + vySum*vySum);

            // Collision Damping Logic
            if (vectors.length >= 2) {
                vectors.sort((a, b) => b.mag - a.mag);
                const vA = vectors[0];
                const vB = vectors[1];
                const dot = vA.vx * vB.vx + vA.vy * vB.vy;
                const magMult = vA.mag * vB.mag;
                if (magMult > 0.0001) {
                    const cosTheta = dot / magMult;
                    if (cosTheta < 0) {
                        const fColl = -cosTheta; // 0 to 1
                        vMag *= (1 - 0.5 * fColl);
                    }
                }
            }

            const turbulence = scalarSum - vMag;
            const tPoint = scalarSum > 0 ? weightedTempSum / scalarSum : roomTemp;
            const edt = calculateEDT(vMag, tPoint, roomTemp);

            field[r][c] = { v: vMag, t: tPoint, edt, turbulence };
        }
    }
    return field; 
};

export const analyzeField = (field: GridPoint[][]) => {
    let totalPoints = 0;
    let coveredPoints = 0;
    let totalVelocity = 0;
    let comfortZones = 0;
    let warningZones = 0; 
    let draftZones = 0; 
    let deadZones = 0;
    
    // ADPI Calculation
    let adpiGoodPoints = 0;

    field.forEach(row => {
        row.forEach(pt => {
            if (!pt) return;
            totalPoints++;
            const { v, edt } = pt;
            
            if (v > 0.05) coveredPoints++; 
            totalVelocity += v;

            if (v < 0.1) deadZones++;
            else if (v >= 0.1 && v <= 0.25) comfortZones++;
            else if (v > 0.25 && v <= 0.5) warningZones++;
            else if (v > 0.5) draftZones++;

            if (edt > -3 && edt < 2 && v < 0.35 && v > 0.15) {
                adpiGoodPoints++;
            }
        });
    });

    if (totalPoints === 0) {
        return {
            totalCoverage: 0, avgVelocity: 0, comfortZones: 0,
            warningZones: 0, draftZones: 0, deadZones: 0, adpi: 0
        };
    }

    return {
        totalCoverage: (coveredPoints / totalPoints) * 100,
        avgVelocity: totalVelocity / totalPoints,
        comfortZones,
        warningZones,
        draftZones,
        deadZones,
        adpi: (adpiGoodPoints / totalPoints) * 100
    };
};
