export interface DiffuserGeometry {
    bodyDepth: number;
    outletOffset: number;
    horizontalOffset: number;
}

export interface VerticalJetProfile {
    emitter: 'ring' | 'disk';
    radiusFactor: number;
    radiusJitter: number;
    coneMinDeg: number;
    coneJitterDeg: number;
    horizontalFactor: number;
    inwardFactor: number;
    tangentialFactor: number;
    speedFactor: number;
    waveAmp: number;
    waveFreq: number;
    drag: number;
}

const MODEL_GEOMETRY_FACTORS: Record<string, DiffuserGeometry> = {
    'dpu-m': { bodyDepth: 1.1, outletOffset: 0.78, horizontalOffset: 0.16 },
    'dpu-k': { bodyDepth: 0.95, outletOffset: 0.72, horizontalOffset: 0.14 },
    'dpu-v': { bodyDepth: 0.8, outletOffset: 0.5, horizontalOffset: 0.12 },
    'dpu-s': { bodyDepth: 1.2, outletOffset: 1.05, horizontalOffset: 0.18 }
};

const DEFAULT_GEOMETRY: DiffuserGeometry = {
    bodyDepth: 1,
    outletOffset: 0.7,
    horizontalOffset: 0.15
};

export const getDiffuserGeometry = (modelId: string, spec: any, ppm: number): DiffuserGeometry => {
    // If we have precise physical dimensions in the spec, use them
    if (spec && spec.bodyHeight !== undefined) {
        return {
            bodyDepth: spec.bodyHeight * ppm,
            outletOffset: (spec.bodyHeight * 0.8) * ppm, // Air originates slightly above the bottom face
            horizontalOffset: (spec.neckDiameter / 2) * ppm
        };
    }

    // Fallback to legacy scaling logic
    const nominalDepth = Math.max(16 * (ppm / 1000), (spec?.D || 55) * (ppm / 1000));
    const factors = MODEL_GEOMETRY_FACTORS[modelId] || DEFAULT_GEOMETRY;
    return {
        bodyDepth: nominalDepth * factors.bodyDepth,
        outletOffset: nominalDepth * factors.outletOffset,
        horizontalOffset: nominalDepth * factors.horizontalOffset
    };
};

export const getVerticalJetProfile = (modelId: string, flowType: string) => {
    // Внимание: все коэффициенты строго откалиброваны под вертикальную 
    // подачу воздуха согласно аэродинамическим характеристикам из каталога.
    
    switch (modelId) {
        case 'dpu-s':
            // ДПУ-С (Сопло): "дальнобойные компактные струи"
            // Струя-игла. Максимальное сохранение кинетической энергии по оси Z.
            return {
                emitter: 'disk',
                radiusFactor: 0.1,
                radiusJitter: 0.1,
                coneMinDeg: 2,       // Практически нулевой угол раскрытия (~4° полный)
                coneJitterDeg: 3,    
                speedFactor: 1.0,    // Вся скорость идет строго вниз
                horizontalFactor: 0.1,
                inwardFactor: 0.0,
                tangentialFactor: 0.0,
                waveAmp: 0.5,        // Поток ламинарный, почти без турбулентности
                waveFreq: 1.5,
                drag: 0.998          // Воздух летит очень далеко (высокая дальнобойность)
            };

        case 'dpu-m':
            // ДПУ-М (Универсальный): Компактная/коническая струя при опущенном обтекателе
            // Воздух выходит из кольца, образуя плотный конус.
            return {
                emitter: 'ring',
                radiusFactor: 0.35,
                radiusJitter: 0.05,
                coneMinDeg: 8,       // Классический угол раскрытия конуса
                coneJitterDeg: 6,
                speedFactor: 0.95,
                horizontalFactor: 0.35,
                inwardFactor: 0.1,   // Легкое аэродинамическое стягивание струи к оси
                tangentialFactor: 0.0,
                waveAmp: 2.0,
                waveFreq: 3.0,
                drag: 0.985          // Хорошая дальнобойность
            };

        case 'dpu-k':
            // ДПУ-К (Веерный): Вставка из нескольких диффузоров
            // Конус получается шире и турбулентнее, чем у ДПУ-М.
            return {
                emitter: 'ring',
                radiusFactor: 0.45,
                radiusJitter: 0.15,
                coneMinDeg: 14,      // Широкий конус из-за веерных колец
                coneJitterDeg: 8,
                speedFactor: 0.85,   // Часть скорости гасится о профиль колец
                horizontalFactor: 0.55,
                inwardFactor: 0.0,
                tangentialFactor: 0.0,
                waveAmp: 3.5,        // Высокая пульсация потока на старте
                waveFreq: 4.5,
                drag: 0.975          // Скорость затухает быстрее, чем у ДПУ-М
            };

        case 'dpu-v':
            // ДПУ-В (Вихревой): Формирование закрученных струй
            // Мощный эффект swirl (торнадо), огромная эжекция комнатного воздуха.
            return {
                emitter: 'ring',
                radiusFactor: 0.4,
                radiusJitter: 0.1,
                coneMinDeg: 20,      // Центробежная сила разваливает конус вширь
                coneJitterDeg: 15,
                speedFactor: 0.65,   // Вертикальная скорость низкая, т.к. вектор направлен по кругу
                horizontalFactor: 0.9,
                inwardFactor: -0.2,  // Отрицательное значение = расталкивание от центра
                tangentialFactor: 0.85, // Экстремальное вращение частиц вокруг оси
                waveAmp: 5.0,        // Мощнейшие завихрения
                waveFreq: 6.0,
                drag: 0.96           // Струя "разбивается" о стоячий воздух очень быстро (минимальная дальнобойность)
            };

        default:
            // Базовый безопасный профиль, если модель не найдена
            return {
                emitter: 'disk',
                radiusFactor: 0.25,
                radiusJitter: 0.25,
                coneMinDeg: 15,
                coneJitterDeg: 10,
                speedFactor: 0.9,
                horizontalFactor: 0.6,
                inwardFactor: 0.0,
                tangentialFactor: 0.0,
                waveAmp: 3,
                waveFreq: 4,
                drag: 0.98
            };
    }
};
