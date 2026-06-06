import { describe, it, expect } from 'vitest';
import { getOfflineResponse } from './offlineDb';

describe('Офлайн ИИ-чат: подбор ответа', () => {
    it('отвечает на приветствие', () => {
        expect(getOfflineResponse('привет', [])).toContain('ИИ-ассистент КлимЛаб');
    });

    it('понимает словоформы (рекуперацию → рекуперация)', () => {
        const r = getOfflineResponse('как рассчитать рекуперацию тепла', []);
        expect(r).toContain('Рекуперация');
    });

    it('маршрутизирует новые темы ОВиК', () => {
        expect(getOfflineResponse('норма воздухообмена для кухни и санузла', [])).toContain('воздухообмен');
        expect(getOfflineResponse('классы фильтров вентиляции', [])).toContain('фильтр');
        expect(getOfflineResponse('подпор воздуха в лестничную клетку', [])).toContain('одпор');
    });

    it('не путает близкие темы по ключам', () => {
        expect(getOfflineResponse('законы пропорциональности вентилятора', [])).toContain('ентилятор');
    });

    it('даёт осмысленный фолбэк на мусор', () => {
        expect(getOfflineResponse('asdf qwerty zzz', [])).toContain('получил ваш запрос');
    });
});
