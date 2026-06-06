import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Конфиг тестов отделён от vite.config.ts (там сборка/Tailwind).
// Плагин react нужен, чтобы тесты могли импортировать модули с JSX (constants.tsx и т.п.).
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node',
        include: ['**/*.test.{ts,tsx}'],
        exclude: ['node_modules', 'dist'],
        watch: false,
    },
});
