<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1luu94xCNFZTeZnPKH0Cg5wKibpH3jAIh

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Опционально) Задать `GEMINI_API_KEY` для онлайн-ИИ. Без ключа чат работает в офлайн-режиме.
3. Run the app:
   `npm run dev`

## Цикл разработки (правка → тест)

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Запуск приложения с **горячей перезагрузкой**: фронтенд через Vite HMR, сервер `server.ts` авто-перезапускается (`tsx watch`). Открыть http://localhost:3000 |
| `npm run test:watch` | **Тесты в watch-режиме** — перезапускаются при каждой правке (Vitest) |
| `npm test` | Прогнать все тесты один раз |
| `npm run typecheck` | Проверка типов (`tsc --noEmit`) |
| `npm run build` | Прод-сборка в `dist/` |

**Рабочий поток:** держи открытыми два терминала — `npm run dev` (видишь изменения в браузере сразу) и `npm run test:watch` (логика/формулы проверяются на лету). Тесты лежат рядом с кодом в файлах `*.test.ts`.

Переменную окружения для онлайн-ИИ можно задать так:

```bash
# Linux/macOS
export GEMINI_API_KEY=твой_ключ && npm run dev
```
```powershell
# Windows PowerShell
$env:GEMINI_API_KEY="твой_ключ"; npm run dev
```
