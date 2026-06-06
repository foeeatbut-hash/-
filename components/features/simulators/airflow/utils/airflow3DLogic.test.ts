import { describe, it, expect } from 'vitest';
import { buildFlowField, sampleFlowField } from './airflow3DLogic';

// Минимальный диффузор для поля столкновения струй.
const mk = (x: number, y: number): any => ({
    id: 'd' + x, index: 0, x, y,
    modelId: 'dpu-m', flowType: 'vertical', modeIdx: 0,
    diameter: 200, volume: 300, temperature: 18,
    performance: {
        v0: 2.5, pressure: 10, noise: 25, throwDist: 2,
        spec: { f0: 0.03, A: 20000, B: 0, C: 0, D: 0, min: 0, max: 0 },
        workzoneVelocity: 0.35, coverageRadius: 1.6, Ar: 0, error: null,
    },
});

describe('Взаимодействие встречных струй (поле столкновения)', () => {
    // Два диффузора навстречу: x=2 и x=4, встреча по линии x=3.
    const state: any = {
        roomWidth: 6, roomLength: 3, roomHeight: 3,
        placedDiffusers: [mk(2, 1.5), mk(4, 1.5)],
    };
    const f = buildFlowField(state, 0.4)!;

    it('застойное давление максимально в зоне встречи, а не под диффузором', () => {
        const under = sampleFlowField(f, 2.0, 1.5);
        const mid = sampleFlowField(f, 3.0, 1.5);
        expect(mid.p).toBeGreaterThan(under.p);
    });

    it('результирующая скорость в зоне встречи близка к нулю (застой/торможение)', () => {
        const mid = sampleFlowField(f, 3.0, 1.5);
        expect(Math.hypot(mid.vx, mid.vz)).toBeLessThan(0.1);
    });

    it('одиночная струя не создаёт ложного столкновения', () => {
        const single: any = { roomWidth: 6, roomLength: 3, roomHeight: 3, placedDiffusers: [mk(3, 1.5)] };
        const sf = buildFlowField(single, 0.4)!;
        // под единственным диффузором встречного гашения быть не должно
        expect(sampleFlowField(sf, 3.0, 1.5).p).toBeLessThan(0.05);
    });
});
