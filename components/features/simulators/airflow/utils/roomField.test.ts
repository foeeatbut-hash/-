import { describe, it, expect } from 'vitest';
import { sampleRoomField, getJetCoefficients, JetSource, RoomFieldParams } from './roomField';

const jet = (x: number, z: number, supplyTemp = 18): JetSource => {
    const c = getJetCoefficients('dpu-m');
    return {
        x, z, mountHeight: 3, v0: 3, F0: 0.03,
        m: c.m, n: c.n, spreadTan: c.spreadTan,
        supplyTemp, isSuction: false,
    };
};

const room = (sources: JetSource[], roomTemp = 24): RoomFieldParams => ({
    roomW: 6, roomL: 6, roomH: 3, roomTemp, sources,
});

describe('Поле воздухораспределения (теория струй)', () => {
    it('осевая скорость затухает с глубиной (v_x = m·v₀·√F₀/x)', () => {
        const p = room([jet(3, 3)]);
        const shallow = sampleRoomField(3, 2, 3, p); // глубина 1 м
        const deep = sampleRoomField(3, 1, 3, p);    // глубина 2 м
        expect(shallow.speed).toBeGreaterThan(deep.speed);
        expect(deep.speed).toBeGreaterThan(0);
    });

    it('на оси струя направлена вниз, без горизонтального сноса', () => {
        const p = room([jet(3, 3)]);
        const s = sampleRoomField(3, 1.5, 3, p);
        expect(s.vy).toBeLessThan(0);                        // вниз
        expect(Math.hypot(s.vx, s.vz)).toBeLessThan(0.02);   // на оси гориз. ≈ 0
    });

    it('две близкие струи СЛИВАЮТСЯ вниз: между ними гориз. гасится', () => {
        const p = room([jet(2.5, 3), jet(3.5, 3)]);
        const mid = sampleRoomField(3, 1.5, 3, p); // ровно между, в воздухе
        // встречные горизонтальные составляющие гасят друг друга
        expect(Math.abs(mid.vx)).toBeLessThan(Math.abs(mid.vy));
        expect(mid.vy).toBeLessThan(0); // общий поток идёт вниз (слияние), не наружу
    });

    it('у пола в зоне встречи возникает восходящий «фонтан»', () => {
        const p = room([jet(2.5, 3), jet(3.5, 3)]);
        const floorMid = sampleRoomField(3, 0.1, 3, p); // у пола между струями
        const airMid = sampleRoomField(3, 1.5, 3, p);   // в воздухе между струями
        // у пола вертикаль заметно «выше» (фонтан), чем в воздухе (где слияние вниз)
        expect(floorMid.vy).toBeGreaterThan(airMid.vy);
    });

    it('охлаждение даёт температуру ниже комнатной на оси, нагрев — выше', () => {
        const cold = sampleRoomField(3, 1.5, 3, room([jet(3, 3, 16)], 24));
        const hot = sampleRoomField(3, 1.5, 3, room([jet(3, 3, 35)], 24));
        expect(cold.t).toBeLessThan(24);
        expect(hot.t).toBeGreaterThan(24);
    });

    it('одиночная струя не создаёт ложного встречного гашения', () => {
        const p = room([jet(3, 3)]);
        const onAxisFloor = sampleRoomField(3, 0.1, 3, p);
        // под одиночным диффузором фонтана быть не должно — поток вниз или растекание
        expect(onAxisFloor.vy).toBeLessThan(0.05);
    });
});
