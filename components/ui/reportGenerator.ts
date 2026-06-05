import React from 'react';

export interface ReportItem {
    label: string;
    value: string | number;
    unit?: string;
}

export interface ReportFormula {
    text: string;
    math?: string;
}

export function generateReportHTML(
    calculatorTitle: string,
    inputs: ReportItem[],
    outputs: ReportItem[],
    formulas: ReportFormula[] = [],
    notes: string[] = []
): string {
    const dateStr = new Date().toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const isHeatingOrCooling = calculatorTitle.toLowerCase().includes('нагрев') || calculatorTitle.toLowerCase().includes('охлажд');
    const accentColor = isHeatingOrCooling ? '#f97316' : '#0ea5e9';

    const inputRows = inputs.map(item => `
        <tr>
            <td class="label">${item.label}</td>
            <td class="value font-mono">${item.value} <span class="unit">${item.unit || ''}</span></td>
        </tr>
    `).join('');

    const outputRows = outputs.map(item => `
        <tr class="output-row">
            <td class="label font-bold">${item.label}</td>
            <td class="value font-mono font-black accent-text">${item.value} <span class="unit">${item.unit || ''}</span></td>
        </tr>
    `).join('');

    const formulaItems = formulas.map(f => `
        <div class="formula-card">
            <div class="formula-desc">${f.text}</div>
            ${f.math ? `<div class="formula-latex">${f.math}</div>` : ''}
        </div>
    `).join('');

    const noteItems = notes.map(n => `<li>${n}</li>`).join('');

    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>КлимЛаб - Отчет расчета: ${calculatorTitle}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        
        :root {
            --primary: ${accentColor};
            --primary-light: ${accentColor}11;
            --neutral-dark: #0f172a;
            --neutral-light: #f8fafc;
            --border: #e2e8f0;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: var(--neutral-dark);
            background-color: #fafafa;
            line-height: 1.5;
            padding: 40px 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.03);
            padding: 40px;
            position: relative;
        }

        /* Toolbar */
        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f1f5f9;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 20px;
            margin-bottom: 30px;
        }

        .toolbar-info {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
        }

        .btn-print {
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 12px ${accentColor}44;
            transition: transform 0.1s, opacity 0.2s;
        }

        .btn-print:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 30px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-box {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background-color: var(--neutral-dark);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 20px;
            letter-spacing: -1px;
        }

        .brand-text {
            display: flex;
            flex-direction: column;
        }

        .brand-name {
            font-weight: 900;
            font-size: 18px;
            letter-spacing: -0.5px;
            text-transform: uppercase;
        }

        .brand-sub {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: bold;
            color: var(--primary);
        }

        .meta-info {
            text-align: right;
            font-size: 12px;
            color: #64748b;
        }

        .report-title {
            font-size: 24px;
            font-weight: 900;
            color: var(--neutral-dark);
            letter-spacing: -0.5px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .report-title::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 24px;
            background: var(--primary);
            border-radius: 4px;
        }

        /* Data grids & Tables */
        .section-title {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-top: 30px;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid #f1f5f9;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            padding: 10px 0;
            border-bottom: 2px solid #f1f5f9;
        }

        td {
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
        }

        td.label {
            color: #334155;
            width: 65%;
        }

        td.value {
            text-align: right;
            font-size: 14px;
            font-weight: 700;
            color: var(--neutral-dark);
        }

        .font-mono {
            font-family: 'JetBrains Mono', monospace;
        }

        .font-bold {
            font-weight: 700;
        }

        .font-black {
            font-weight: 900;
        }

        .unit {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
        }

        .output-table {
            background: var(--primary-light);
            border-radius: 12px;
            border: 1px solid ${accentColor}22;
            padding: 15px 20px;
            margin-bottom: 30px;
        }

        .output-table table {
            margin-bottom: 0;
        }

        .output-table td {
            border-bottom-color: ${accentColor}11;
        }

        .output-table tr:last-child td {
            border-bottom: none;
        }

        .accent-text {
            color: var(--primary) !important;
            font-size: 16px !important;
        }

        /* Formulas & Theory */
        .formulas-container {
            display: grid;
            grid-template-cols: 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }

        .formula-card {
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 10px;
            padding: 14px italic;
            padding: 12px 16px;
        }

        .formula-desc {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 6px;
            font-weight: 600;
        }

        .formula-latex {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            font-weight: 700;
            color: var(--neutral-dark);
            background: #f1f5f9;
            padding: 8px 12px;
            border-radius: 6px;
            border-left: 3px solid var(--primary);
            overflow-x: auto;
        }

        /* Notes & Rules */
        .notes-list {
            padding-left: 20px;
            font-size: 12px;
            color: #64748b;
            line-height: 1.6;
        }

        .notes-list li {
            margin-bottom: 6px;
        }

        .footer {
            margin-top: 40px;
            border-top: 1px dashed var(--border);
            padding-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
        }

        /* Print styles */
        @media print {
            body {
                background: #ffffff;
                padding: 0;
                color: #000000;
            }
            .container {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
            }
            .no-print {
                display: none !important;
            }
            .output-table {
                background: none !important;
                border: 1px solid #000000 !important;
                padding: 10px 15px !important;
            }
            .formula-card {
                background: none !important;
                border-color: #e2e8f0 !important;
            }
            .formula-latex {
                background: #fafafa !important;
                border-left-color: #000000 !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Toolbar for Screen only -->
        <div class="toolbar no-print">
            <div class="toolbar-info">
                Для сохранения отчета в формате PDF выберите принтер <strong>"Сохранить как PDF" (Save as PDF)</strong> в открывшемся диалоговом окне печати.
            </div>
            <button class="btn-print" onclick="window.print()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Распечатать / PDF
            </button>
        </div>

        <!-- Header -->
        <div class="header">
            <div class="brand">
                <div class="logo-box">C</div>
                <div class="brand-text">
                    <span class="brand-name">КлимЛаб</span>
                    <span class="brand-sub">Инжиниринг вентиляции</span>
                </div>
            </div>
            <div class="meta-info">
                <div>Протокол расчета № KL-${Math.floor(100000 + Math.random() * 900000)}</div>
                <div>Дата: ${dateStr}</div>
                <div>Статус: Расчет подтвержден</div>
            </div>
        </div>

        <!-- Title -->
        <h1 class="report-title">${calculatorTitle}</h1>

        <!-- Inputs Section -->
        <div class="section-title">Исходные данные (Параметры)</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 65%;">Параметр процесса</th>
                    <th style="text-align: right;">Значение</th>
                </tr>
            </thead>
            <tbody>
                ${inputRows}
            </tbody>
        </table>

        <!-- Outputs Section -->
        <div class="section-title">Результаты расчетов</div>
        <div class="output-table">
            <table>
                <tbody>
                    ${outputRows}
                </tbody>
            </table>
        </div>

        <!-- Formulas Section -->
        ${formulas.length > 0 ? `
            <div class="section-title">Расчетные формулы и физика процесса</div>
            <div class="formulas-container">
                ${formulaItems}
            </div>
        ` : ''}

        <!-- Notes / Standarts Section -->
        ${notes.length > 0 ? `
            <div class="section-title">Нормативы и примечания</div>
            <ul class="notes-list">
                ${noteItems}
            </ul>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            Интерактивный расчетный комплекс КлимЛаб &copy; 2026. Все права защищены.
            <br>
            Внимание: Результаты расчета носят справочно-инженерный характер и соответствуют нормативной базе АВОК / СП.
        </div>
    </div>
</body>
</html>
    `;
}

export function downloadReport(
    calculatorTitle: string,
    inputs: ReportItem[],
    outputs: ReportItem[],
    formulas: ReportFormula[] = [],
    notes: string[] = []
) {
    const html = generateReportHTML(calculatorTitle, inputs, outputs, formulas, notes);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Clean filename
    const cleanTitle = calculatorTitle.toLowerCase()
        .replace(/[^a-zа-я0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
        
    link.setAttribute("download", `klimlab_otchet_${cleanTitle || 'raschet'}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
