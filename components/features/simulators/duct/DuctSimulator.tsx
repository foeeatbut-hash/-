import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Wind, 
  Settings, 
  Play, 
  Trash2, 
  Plus, 
  Sparkles, 
  ChevronLeft, 
  Grid, 
  RotateCcw, 
  Info, 
  Check, 
  AlertTriangle, 
  Download, 
  MousePointer, 
  FileText, 
  Cpu, 
  Sliders, 
  HelpCircle,
  Eye,
  Maximize2,
  Zap
} from 'lucide-react';

// --- ИНЖЕНЕРНЫЕ ТИПЫ ДАННЫХ ---
export interface DuctNode {
  id: string;
  x: number; // м
  y: number; // м
  type: 'source' | 'vent' | 'junction'; // Источник (ПВУ), диффузор, обычный узел (отвод, тройник, крестовина)
  flow: number; // м³/ч
  name: string;
  systemType: 'supply' | 'exhaust'; // 'supply' (Приток - Красный), 'exhaust' (Вытяжка - Синий)
}

export interface DuctSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  shape: 'round' | 'rectangular';
  diameter: number; // мм
  width: number;    // мм
  height: number;   // мм
  name: string;
  systemType: 'supply' | 'exhaust';
}

export interface SegmentCalcResult {
  segmentId: string;
  flow: number;
  area: number;
  velocity: number;
  dynPressure: number;
  eqDiameter: number;
  rTriction: number;
  pTriction: number;
  pKms: number;
  pTotal: number;
  length: number;
  isCritical: boolean;
}

const STANDARD_DIAMETERS = [100, 125, 150, 160, 200, 250, 315, 355, 400];
const STANDARD_RECT_SIZES = [100, 150, 200, 250, 300, 400, 500];

export default function DuctSimulator({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
  // --- НАСТРОЙКИ ПОМЕЩЕНИЯ ---
  const [roomWidth, setRoomWidth] = useState<number>(10);   // м
  const [roomLength, setRoomLength] = useState<number>(8);  // м
  const [gridSnapSize, setGridSnapSize] = useState<number>(0.5); // м

  // --- СОСТОЯНИЕ РЕВИД/АВТОКАД СЕТИ ---
  const [nodes, setNodes] = useState<DuctNode[]>([
    // Приточная система (Красная)
    { id: 'n-s1', x: 1.5, y: 1.5, type: 'source', flow: 0, name: 'ПВУ-Приток', systemType: 'supply' },
    { id: 'n-j1', x: 4.5, y: 1.5, type: 'junction', flow: 0, name: 'Тройник П1', systemType: 'supply' },
    { id: 'n-v1', x: 4.5, y: 4.5, type: 'vent', flow: 150, name: 'Диффузор П1', systemType: 'supply' },
    { id: 'n-v2', x: 7.5, y: 1.5, type: 'vent', flow: 250, name: 'Диффузор П2', systemType: 'supply' },
    
    // Вытяжная система (Синяя)
    { id: 'n-s2', x: 1.5, y: 6.5, type: 'source', flow: 0, name: 'ПВУ-Вытяжка', systemType: 'exhaust' },
    { id: 'n-j2', x: 5.5, y: 6.5, type: 'junction', flow: 0, name: 'Тройник В1', systemType: 'exhaust' },
    { id: 'n-v3', x: 5.5, y: 3.5, type: 'vent', flow: 200, name: 'Диффузор В1', systemType: 'exhaust' },
    { id: 'n-v4', x: 8.5, y: 6.5, type: 'vent', flow: 200, name: 'Диффузор В2', systemType: 'exhaust' },
  ]);

  const [segments, setSegments] = useState<DuctSegment[]>([
    // Приточные воздуховоды
    { id: 's-1', fromNodeId: 'n-s1', toNodeId: 'n-j1', shape: 'round', diameter: 200, width: 250, height: 150, name: 'Магистраль П1', systemType: 'supply' },
    { id: 's-2', fromNodeId: 'n-j1', toNodeId: 'n-v1', shape: 'round', diameter: 160, width: 200, height: 150, name: 'Ветка П1', systemType: 'supply' },
    { id: 's-3', fromNodeId: 'n-j1', toNodeId: 'n-v2', shape: 'round', diameter: 160, width: 200, height: 150, name: 'Ветка П2', systemType: 'supply' },
    
    // Вытяжные воздуховоды
    { id: 's-4', fromNodeId: 'n-s2', toNodeId: 'n-j2', shape: 'round', diameter: 200, width: 250, height: 150, name: 'Магистраль В1', systemType: 'exhaust' },
    { id: 's-5', fromNodeId: 'n-j2', toNodeId: 'n-v3', shape: 'round', diameter: 160, width: 200, height: 150, name: 'Ветка В1', systemType: 'exhaust' },
    { id: 's-6', fromNodeId: 'n-j2', toNodeId: 'n-v4', shape: 'round', diameter: 160, width: 200, height: 150, name: 'Ветка В2', systemType: 'exhaust' },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // --- ИНСТРУМЕНТЫ АВТОКАДА ---
  // 'select' - Выбор
  // 'draw-duct' - Начертить воздуховод (Клик-Клик за цепочкой)
  // 'add-vent' - Добавить Диффузор (Автоклип)
  // 'add-source' - Добавить ПВУ
  // 'delete' - Быстрое стирание
  const [activeTool, setActiveTool] = useState<'select' | 'draw-duct' | 'add-vent' | 'add-source' | 'delete'>('select');
  
  // НАСТРОЙКИ ЧЕРЧЕНИЯ (ПЕРЕД РИСОВАНИЕМ)
  const [systemTypeToDraw, setSystemTypeToDraw] = useState<'supply' | 'exhaust'>('supply');
  const [ductShape, setDuctShape] = useState<'round' | 'rectangular'>('round');
  const [ductDiameter, setDuctDiameter] = useState<number>(160);
  const [rectWidth, setRectWidth] = useState<number>(200);
  const [rectHeight, setRectHeight] = useState<number>(150);
  
  const [ventFlow, setVentFlow] = useState<number>(150); // м³/ч

  // Временные координаты для начертания в AutoCAD (линия-призрак)
  const [drawingStartNodeId, setDrawingStartNodeId] = useState<string | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);

  // Визуальные настройки
  const [zoom, setZoom] = useState<number>(1);
  const [bgPreset, setBgPreset] = useState<'empty' | 'apartment' | 'office'>('apartment');
  const [showFlowAnimations, setShowFlowAnimations] = useState<boolean>(true);
  const [showVelocityColors, setShowVelocityColors] = useState<boolean>(true);

  // Ссылка на холст-контейнер
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  // Ссылка на сам вьюпорт для блокирования прокрутки страницы при масштабировании
  const viewportRef = useRef<HTMLDivElement>(null);

  // Масштаб: 1 метр = 50 пикселей * зум
  const scale = 50 * zoom;

  const snapToGrid = (val: number) => {
    return Math.round(val / gridSnapSize) * gridSnapSize;
  };

  // --- НАВИГАЦИЯ И УПРАВЛЕНИЕ ХОЛСТОМ ---
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  
  // Геометрические направляющие выравнивания (Revit-style)
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number; y?: number } | null>(null);

  // Масштабирование колесиком мыши с фокусом на точку курсора (в стиле AutoCAD/Figma)
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // Полностью блокируем прокрутку страницы!
      
      const zoomFactor = 1.08;
      const nextZoom = e.deltaY < 0 ? Math.min(2.2, zoom * zoomFactor) : Math.max(0.4, zoom / zoomFactor);
      
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Получаем относительные координаты модели до изменения масштаба
      const modelX = (mouseX - panOffset.x) / zoom;
      const modelY = (mouseY - panOffset.y) / zoom;
      
      // Пересчитываем сдвиг, чтобы точка под курсором осталась неподвижной
      setPanOffset({
        x: mouseX - modelX * nextZoom,
        y: mouseY - modelY * nextZoom
      });
      setZoom(nextZoom);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', onWheel);
    };
  }, [zoom, panOffset]);

  // Панорамирование при зажатии СКМ (колесика) или Пробел + ЛКМ
  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleViewportMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleViewportMouseUp = () => {
    setIsPanning(false);
  };

  const handleViewportMouseLeave = () => {
    setIsPanning(false);
  };

  // Автоматическое центрирование и подгонка масштаба для отображения всей инженерной сети
  const handleZoomToFit = () => {
    if (nodes.length === 0) {
      setPanOffset({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const spacing = 50; // Базовая плотность пикселей
    const contentW = Math.max(1, maxX - minX) * spacing;
    const contentH = Math.max(1, maxY - minY) * spacing;
    
    const container = canvasContainerRef.current;
    if (!container) return;
    
    const containerW = container.clientWidth - 140; // Безопасные отступы по краям
    const containerH = container.clientHeight - 140;
    
    const optimalZoom = Math.max(0.4, Math.min(1.8, Math.min(containerW / contentW, containerH / contentH)));
    
    const centerX = (minX + maxX) / 2 * spacing;
    const centerY = (minY + maxY) / 2 * spacing;
    
    setPanOffset({
      x: container.clientWidth / 2 - centerX * optimalZoom,
      y: container.clientHeight / 2 - centerY * optimalZoom
    });
    setZoom(optimalZoom);
  };

  // Клавиатурные Shortcuts (Горячие клавиши Revit/AutoCAD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем клавиши в текстовых полях ввода
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'SELECT' || 
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      const key = e.key.toLowerCase();
      
      if (e.key === 'Escape') {
        setDrawingStartNodeId(null);
        setSelectedNodeId(null);
        setSelectedSegmentId(null);
        setActiveTool('select');
      } else if (key === '1' || key === 'q' || key === 'й') {
        setActiveTool('select');
      } else if (key === '2' || key === 'w' || key === 'ц') {
        setActiveTool('draw-duct');
      } else if (key === '3' || key === 'e' || key === 'у') {
        setActiveTool('add-vent');
      } else if (key === '4' || key === 'r' || key === 'к') {
        setActiveTool('add-source');
      } else if (key === 'd' || key === 'в' || e.key === 'Delete' || e.key === 'Backspace') {
        setActiveTool('delete');
      } else if (key === 'f' || key === 'а') {
        e.preventDefault();
        handleZoomToFit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nodes]);

  // Контекстное интуитивное управление выбранными элементами прямо на холсте
  const floatingPanelPosition = useMemo(() => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node) {
        return {
          left: node.x * scale + panOffset.x,
          top: (node.y - 0.7) * scale + panOffset.y,
          visible: true,
          type: 'node',
          id: node.id,
          nodeType: node.type
        };
      }
    }
    if (selectedSegmentId) {
      const seg = segments.find(s => s.id === selectedSegmentId);
      if (seg) {
        const fromN = nodes.find(n => n.id === seg.fromNodeId);
        const toN = nodes.find(n => n.id === seg.toNodeId);
        if (fromN && toN) {
          const midX = (fromN.x + toN.x) / 2;
          const midY = (fromN.y + toN.y) / 2;
          return {
            left: midX * scale + panOffset.x,
            top: (midY - 0.6) * scale + panOffset.y,
            visible: true,
            type: 'segment',
            id: seg.id
          };
        }
      }
    }
    return { visible: false };
  }, [selectedNodeId, selectedSegmentId, nodes, segments, scale, panOffset]);

  // --- ГЕОМЕТРИЧЕСКИЙ АНАЛИЗ СВЯЗЕЙ (РЕВИТ ФИТИНГИ) ---
  // Для каждого узла определяем, какое физическое соединение он собой представляет в зависимости от числа подключений
  const nodeConnections = useMemo(() => {
    const map: { [nodeId: string]: { list: DuctSegment[], type: 'endpoint' | 'elbow' | 'tee' | 'cross' | 'union', angleDeg?: number } } = {};
    
    nodes.forEach(n => {
      const connSegs = segments.filter(s => s.fromNodeId === n.id || s.toNodeId === n.id);
      let type: 'endpoint' | 'elbow' | 'tee' | 'cross' | 'union' = 'endpoint';
      let angleDeg = 180;

      if (connSegs.length === 2) {
        // Вычисляем угол между двумя воздуховодами
        const seg1 = connSegs[0];
        const seg2 = connSegs[1];
        
        const other1 = nodes.find(o => o.id === (seg1.fromNodeId === n.id ? seg1.toNodeId : seg1.fromNodeId));
        const other2 = nodes.find(o => o.id === (seg2.fromNodeId === n.id ? seg2.toNodeId : seg2.fromNodeId));
        
        if (other1 && other2) {
          const v1x = other1.x - n.x;
          const v1y = other1.y - n.y;
          const v2x = other2.x - n.x;
          const v2y = other2.y - n.y;
          
          const dot = v1x * v2x + v1y * v2y;
          const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
          const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
          
          if (len1 > 0 && len2 > 0) {
            const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
            angleDeg = Math.round((Math.acos(cosAngle) * 180) / Math.PI);
            
            // Если угол близок к 180 (прямая линия), то это просто прямое соединение (union)
            // Если угол < 165, то это Отвод/Колено (elbow)
            if (angleDeg < 155) {
              type = 'elbow';
            } else {
              type = 'union';
            }
          }
        }
      } else if (connSegs.length === 3) {
        type = 'tee';
      } else if (connSegs.length >= 4) {
        type = 'cross';
      }

      map[n.id] = { list: connSegs, type, angleDeg };
    });

    return map;
  }, [nodes, segments]);

  // --- ВЫЧИСЛИТЕЛЬНОЕ ЯДРО (АЭРОДИНАМИКА СП 60.13330) ---
  const aerodynamics = useMemo(() => {
    // Выполняем расчет индивидуально для каждой ПВУ (Supply/Exhaust)
    const sources = nodes.filter(n => n.type === 'source');
    const segmentsCalculations: { [segmentId: string]: SegmentCalcResult } = {};
    let globalMaxLoss = 0;
    let criticalSegments = new Set<string>();

    if (sources.length === 0) {
      return { success: false, error: 'Установите ПВУ для запуска расчетов', list: [] as SegmentCalcResult[], totalSupply: 0, totalExhaust: 0, maxLoss: 0 };
    }

    let totalSupplyFlow = 0;
    let totalExhaustFlow = 0;

    sources.forEach(source => {
      // Строим ориентированное дерево от источника через BFS
      const visited = new Set<string>([source.id]);
      const queue: string[] = [source.id];
      const parentMap: { [nodeId: string]: { parentId: string; segment: DuctSegment } } = {};
      const order: string[] = [];

      // Шаг 1: BFS
      while (queue.length > 0) {
        const curr = queue.shift()!;
        order.push(curr);
        
        // Находим все подключенные воздуховоды того же системного типа
        const connectedSegments = segments.filter(s => 
          s.systemType === source.systemType && (s.fromNodeId === curr || s.toNodeId === curr)
        );

        connectedSegments.forEach(seg => {
          const neighborId = seg.fromNodeId === curr ? seg.toNodeId : seg.fromNodeId;
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            parentMap[neighborId] = { parentId: curr, segment: seg };
            queue.push(neighborId);
          }
        });
      }

      // Шаг 2: Распространение расходов снизу вверх
      const resolvedNodeFlow: { [nodeId: string]: number } = {};
      nodes.forEach(n => {
        resolvedNodeFlow[n.id] = n.type === 'vent' && n.systemType === source.systemType ? n.flow : 0;
      });

      for (let i = order.length - 1; i >= 0; i--) {
        const uId = order[i];
        const pInfo = parentMap[uId];
        if (pInfo) {
          resolvedNodeFlow[pInfo.parentId] += resolvedNodeFlow[uId];
        }
      }

      if (source.systemType === 'supply') {
        totalSupplyFlow += resolvedNodeFlow[source.id] || 0;
      } else {
        totalExhaustFlow += resolvedNodeFlow[source.id] || 0;
      }

      // Шаг 3: Аэродинамический расчет каждого сегмента в системе
      const systemSegments = segments.filter(s => s.systemType === source.systemType);
      systemSegments.forEach(seg => {
        // Определяем дочерний узел
        let childId = '';
        if (parentMap[seg.toNodeId]?.parentId === seg.fromNodeId) childId = seg.toNodeId;
        else if (parentMap[seg.fromNodeId]?.parentId === seg.toNodeId) childId = seg.fromNodeId;

        const flow = childId ? resolvedNodeFlow[childId] : 0;

        // Физическая длина участка
        const nFrom = nodes.find(n => n.id === seg.fromNodeId);
        const nTo = nodes.find(n => n.id === seg.toNodeId);
        let length = 1.0;
        if (nFrom && nTo) {
          length = Math.sqrt(Math.pow(nTo.x - nFrom.x, 2) + Math.pow(nTo.y - nFrom.y, 2));
        }

        // Сечение
        let area = 0;
        let eqDiameter = 0;
        if (seg.shape === 'round') {
          const dm = seg.diameter / 1000;
          area = (Math.PI * dm * dm) / 4;
          eqDiameter = dm;
        } else {
          const wm = seg.width / 1000;
          const hm = seg.height / 1000;
          area = wm * hm;
          eqDiameter = (2 * wm * hm) / (wm + hm);
        }

        const velocity = flow > 0 && area > 0 ? flow / (3600 * area) : 0;
        const dynPressure = 0.5 * 1.2 * velocity * velocity;

        // Местные сопротивления (Автоматический расчет КМС по фитингам концов узлов!)
        let kmsSum = 0.2; // базовый зазор
        [seg.fromNodeId, seg.toNodeId].forEach(nid => {
          const fit = nodeConnections[nid];
          if (fit) {
            if (fit.type === 'elbow') kmsSum += seg.shape === 'round' ? 0.35 : 1.2;
            else if (fit.type === 'tee') kmsSum += 0.8;
            else if (fit.type === 'cross') kmsSum += 1.5;
          }
        });

        // Потери на трение (lambda) по формуле шероховатости стали k = 0.1мм
        const reynolds = (velocity * eqDiameter) / 15.06e-6;
        let lambda = 0.025;
        if (velocity > 0.1 && reynolds > 2300) {
          lambda = 0.11 * Math.pow((0.0001 / eqDiameter) + (68 / reynolds), 0.25);
        }

        const rTriction = eqDiameter > 0 ? (lambda * dynPressure) / eqDiameter : 0;
        const pTriction = rTriction * length;
        const pKms = kmsSum * dynPressure;
        const pTotal = pTriction + pKms;

        segmentsCalculations[seg.id] = {
          segmentId: seg.id,
          flow,
          area,
          velocity,
          dynPressure,
          eqDiameter,
          rTriction,
          pTriction,
          pKms,
          pTotal,
          length,
          isCritical: false
        };
      });

      // Шаг 4: Поиск критического пути (Ветки с наибольшим затуханием давления)
      const nodePressure: { [nodeId: string]: number } = { [source.id]: 0 };
      const nodePath: { [nodeId: string]: string[] } = { [source.id]: [] };

      // Локальный стэк вниз
      const sysQueue = [source.id];
      const visitedDown = new Set<string>([source.id]);

      while (sysQueue.length > 0) {
        const currId = sysQueue.shift()!;
        const currP = nodePressure[currId] || 0;
        const currPath = nodePath[currId] || [];

        const children = Object.keys(parentMap).filter(nid => parentMap[nid].parentId === currId);
        children.forEach(childId => {
          if (!visitedDown.has(childId)) {
            visitedDown.add(childId);
            const seg = parentMap[childId].segment;
            const calc = segmentsCalculations[seg.id];
            const loss = calc ? calc.pTotal : 0;

            nodePressure[childId] = currP + loss;
            nodePath[childId] = [...currPath, seg.id];
            sysQueue.push(childId);
          }
        });
      }

      // Находим терминал с самым большим сопротивлением
      let systemMaxLoss = 0;
      let systemCriticalPath: string[] = [];
      nodes.forEach(n => {
        if (n.systemType === source.systemType) {
          const p = nodePressure[n.id] || 0;
          if (p > systemMaxLoss) {
            systemMaxLoss = p;
            systemCriticalPath = nodePath[n.id] || [];
          }
        }
      });

      systemCriticalPath.forEach(sid => {
        criticalSegments.add(sid);
        if (segmentsCalculations[sid]) {
          segmentsCalculations[sid].isCritical = true;
        }
      });

      if (systemMaxLoss > globalMaxLoss) {
        globalMaxLoss = systemMaxLoss;
      }
    });

    const activeList = segments.map(s => {
      return segmentsCalculations[s.id] || {
        segmentId: s.id,
        flow: 0,
        area: 0,
        velocity: 0,
        dynPressure: 0,
        eqDiameter: 0.1,
        rTriction: 0,
        pTriction: 0,
        pKms: 0,
        pTotal: 0,
        length: 1,
        isCritical: false
      };
    });

    return {
      success: true,
      list: activeList,
      totalSupply: totalSupplyFlow,
      totalExhaust: totalExhaustFlow,
      maxLoss: globalMaxLoss,
      error: null
    };
  }, [nodes, segments, nodeConnections]);

  // --- ТОПОЛОГИЯ ХЕНДЛЕРЫ АВТОКАДА / РЕВИД ---

  // Клик на холст
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    // Не кликаем при перетаскивании/панорамировании
    if (isSpacePressed || isPanning) return;

    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const rawX = (e.clientX - r.left) / scale;
    const rawY = (e.clientY - r.top) / scale;

    let x = snapToGrid(rawX);
    let y = snapToGrid(rawY);

    // AutoCAD Ortho Snapping: При зажатом Shift чертится строго горизонтально или вертикально
    if (activeTool === 'draw-duct' && drawingStartNodeId && e.shiftKey) {
      const startN = nodes.find(n => n.id === drawingStartNodeId);
      if (startN) {
        const dx = Math.abs(x - startN.x);
        const dy = Math.abs(y - startN.y);
        if (dx > dy) {
          y = startN.y;
        } else {
          x = startN.x;
        }
      }
    }

    if (activeTool === 'add-vent') {
      // Ищем, не кликнули ли мы РЯДОМ С ВОЗДУХОВОДОД (Авто-Тройник как в Revit)
      let snapSegment: DuctSegment | null = null;
      let minDistance = 0.35; // в метрах диапазон захвата
      let snapX = x;
      let snapY = y;

      segments.forEach(seg => {
        const fromN = nodes.find(n => n.id === seg.fromNodeId);
        const toN = nodes.find(n => n.id === seg.toNodeId);
        if (fromN && toN) {
          // Вычисляем проекцию точки на отрезок
          const dx = toN.x - fromN.x;
          const dy = toN.y - fromN.y;
          const len2 = dx * dx + dy * dy;
          if (len2 > 0) {
            const t = Math.max(0.1, Math.min(0.9, ((x - fromN.x) * dx + (y - fromN.y) * dy) / len2));
            const projX = fromN.x + t * dx;
            const projY = fromN.y + t * dy;
            const dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
            if (dist < minDistance) {
              minDistance = dist;
              snapSegment = seg;
              snapX = snapToGrid(projX);
              snapY = snapToGrid(projY);
            }
          }
        }
      });

      if (snapSegment) {
        // РЕВИД СПЛИТ: Разрезаем старый воздуховод, ставим тройник-узел и ветку к диффузору
        const seg: DuctSegment = snapSegment;
        const jNodeId = `n-j-${Date.now()}`;
        const ventNodeId = `n-v-${Date.now()}`;

        // Создаем Узел ответвления
        const newJNode: DuctNode = {
          id: jNodeId,
          x: snapX,
          y: snapY,
          type: 'junction',
          flow: 0,
          name: 'Тройник авт.',
          systemType: seg.systemType
        };

        // Считаем перпендикуляр для красивого отвода диффузора наружу на 1 метр
        const fromN = nodes.find(n => n.id === seg.fromNodeId)!;
        const toN = nodes.find(n => n.id === seg.toNodeId)!;
        const dx = toN.x - fromN.x;
        const dy = toN.y - fromN.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = len > 0 ? -dy / len : 0;
        const ny = len > 0 ? dx / len : -1;

        let vX = snapToGrid(snapX + nx * 1.0);
        let vY = snapToGrid(snapY + ny * 1.0);
        // Зажимаем на карте
        vX = Math.max(0.5, Math.min(roomWidth - 0.5, vX));
        vY = Math.max(0.5, Math.min(roomLength - 0.5, vY));

        const newVentNode: DuctNode = {
          id: ventNodeId,
          x: vX,
          y: vY,
          type: 'vent',
          flow: ventFlow,
          name: 'Диффузор ' + (nodes.filter(n => n.type === 'vent').length + 1),
          systemType: seg.systemType
        };

        // Добавляем узлы
        setNodes(prev => [...prev, newJNode, newVentNode]);

        // Удаляем старый сегмент, прокладываем 3 новых: (from -> J), (J -> to) и ответвление (J -> Vent)
        setSegments(prev => {
          const filtered = prev.filter(s => s.id !== seg.id);
          const s1: DuctSegment = {
            id: `s-split-a-${Date.now()}`,
            fromNodeId: seg.fromNodeId,
            toNodeId: jNodeId,
            shape: seg.shape,
            diameter: seg.diameter,
            width: seg.width,
            height: seg.height,
            name: seg.name + ' А',
            systemType: seg.systemType
          };
          const s2: DuctSegment = {
            id: `s-split-b-${Date.now()}`,
            fromNodeId: jNodeId,
            toNodeId: seg.toNodeId,
            shape: seg.shape,
            diameter: seg.diameter,
            width: seg.width,
            height: seg.height,
            name: seg.name + ' Б',
            systemType: seg.systemType
          };
          const sBranch: DuctSegment = {
            id: `s-branch-${Date.now()}`,
            fromNodeId: jNodeId,
            toNodeId: ventNodeId,
            shape: ductShape,
            diameter: 125,
            width: 150,
            height: 100,
            name: 'Отвод диф.',
            systemType: seg.systemType
          };
          return [...filtered, s1, s2, sBranch];
        });

        setSelectedNodeId(ventNodeId);
        setActiveTool('select');
      } else {
        // Ставим обычный свободный диффузор на свободное место
        const id = `n-v-${Date.now()}`;
        const newN: DuctNode = {
          id,
          x,
          y,
          type: 'vent',
          flow: ventFlow,
          name: 'Диффузор ' + (nodes.filter(n => n.type === 'vent').length + 1),
          systemType: systemTypeToDraw
        };
        setNodes(prev => [...prev, newN]);
        setSelectedNodeId(id);
        setActiveTool('select');
      }
    } else if (activeTool === 'add-source') {
      const id = `n-src-${Date.now()}`;
      const newN: DuctNode = {
        id,
        x,
        y,
        type: 'source',
        flow: 0,
        name: systemTypeToDraw === 'supply' ? 'ПВУ-Приток' : 'ПВУ-Вытяжка',
        systemType: systemTypeToDraw
      };
      setNodes(prev => [...prev, newN]);
      setSelectedNodeId(id);
      setActiveTool('select');
    } else if (activeTool === 'draw-duct') {
      // Если рисуем свободную трассу воздуховода
      if (!drawingStartNodeId) {
        // Начать новую свободную трассу из пустой точки или существующего узла
        const matchedNode = nodes.find(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.y - y) < 0.1);
        if (matchedNode) {
          setDrawingStartNodeId(matchedNode.id);
        } else {
          // Создаем промежуточный узел черчения
          const newId = `n-j-${Date.now()}`;
          const newN: DuctNode = {
            id: newId,
            x,
            y,
            type: 'junction',
            flow: 0,
            name: 'Узел',
            systemType: systemTypeToDraw
          };
          setNodes(prev => [...prev, newN]);
          setDrawingStartNodeId(newId);
        }
      } else {
        // Соединяем с текущим узлом или создаем новый в этой точке цепочки
        const startNode = nodes.find(n => n.id === drawingStartNodeId)!;
        let destNodeId = '';
        const matchedNode = nodes.find(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.y - y) < 0.1 && n.id !== startNode.id);

        if (matchedNode) {
          destNodeId = matchedNode.id;
        } else {
          destNodeId = `n-j-${Date.now()}`;
          const newN: DuctNode = {
            id: destNodeId,
            x,
            y,
            type: 'junction',
            flow: 0,
            name: 'Узел',
            systemType: systemTypeToDraw
          };
          setNodes(prev => [...prev, newN]);
        }

        // Проверяем, существует ли уже такая связь
        const link = segments.some(s => 
          (s.fromNodeId === drawingStartNodeId && s.toNodeId === destNodeId) ||
          (s.fromNodeId === destNodeId && s.toNodeId === drawingStartNodeId)
        );

        if (!link) {
          const newSeg: DuctSegment = {
            id: `s-${Date.now()}`,
            fromNodeId: drawingStartNodeId,
            toNodeId: destNodeId,
            shape: ductShape,
            diameter: ductDiameter,
            width: rectWidth,
            height: rectHeight,
            name: 'Воздуховод П/В',
            systemType: systemTypeToDraw
          };
          setSegments(prev => [...prev, newSeg]);
        }

        // Цепочка автокада: делаем новый узел стартовым для быстрого продолжения черчения в один клик!
        setDrawingStartNodeId(destNodeId);
      }
    } else {
      setSelectedNodeId(null);
      setSelectedSegmentId(null);
      setDrawingStartNodeId(null);
    }
  };

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      setNodes(prev => prev.filter(n => n.id !== id));
      setSegments(prev => prev.filter(s => s.fromNodeId !== id && s.toNodeId !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
      return;
    }
    
    if (activeTool === 'draw-duct') {
      if (!drawingStartNodeId) {
        setDrawingStartNodeId(id);
      } else {
        if (drawingStartNodeId === id) return;
        // Проверяем систему
        const start = nodes.find(n => n.id === drawingStartNodeId);
        const end = nodes.find(n => n.id === id);
        if (start && end) {
          const seg: DuctSegment = {
            id: `s-${Date.now()}`,
            fromNodeId: drawingStartNodeId,
            toNodeId: id,
            shape: ductShape,
            diameter: ductDiameter,
            width: rectWidth,
            height: rectHeight,
            name: 'Участок',
            systemType: start.systemType
          };
          setSegments(prev => [...prev, seg]);
          // Переключаемся на продолжение черчения
          setDrawingStartNodeId(id);
        }
      }
    } else {
      setSelectedNodeId(id);
      setSelectedSegmentId(null);
    }
  };

  const handleSegmentClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      setSegments(prev => prev.filter(s => s.id !== id));
      if (selectedSegmentId === id) setSelectedSegmentId(null);
      return;
    }
    setSelectedSegmentId(id);
    setSelectedNodeId(null);

    const seg = segments.find(s => s.id === id);
    if (seg) {
      setDuctShape(seg.shape);
      setDuctDiameter(seg.diameter);
      setRectWidth(seg.width);
      setRectHeight(seg.height);
    }
  };

  const handleNodeDrag = (nodeId: string, e: React.MouseEvent<SVGElement, MouseEvent>) => {
    if (activeTool !== 'select' || isSpacePressed) return;
    const svg = e.currentTarget.closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    const handleMouseMove = (me: MouseEvent) => {
      const rx = (me.clientX - rect.left) / scale;
      const ry = (me.clientY - rect.top) / scale;
      
      let x = snapToGrid(rx);
      let y = snapToGrid(ry);

      // Магнитный захват выравнивания (Revit-Style Alignment Guide Snapping)
      let guideX: number | undefined = undefined;
      let guideY: number | undefined = undefined;

      nodes.forEach(o => {
        if (o.id === nodeId) return;
        // Захват по оси X (вертикальное сопоставление)
        if (Math.abs(o.x - x) < 0.22) {
          x = o.x;
          guideX = o.x;
        }
        // Захват по оси Y (горизонтальное сопоставление)
        if (Math.abs(o.y - y) < 0.22) {
          y = o.y;
          guideY = o.y;
        }
      });

      // Отображаем направляющие привязки
      setAlignmentGuides(guideX !== undefined || guideY !== undefined ? { x: guideX, y: guideY } : null);

      x = Math.max(0.5, Math.min(roomWidth - 0.5, x));
      y = Math.max(0.5, Math.min(roomLength - 0.5, y));
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
    };

    const handleMouseUp = () => {
      setAlignmentGuides(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // --- ИИ АВТОПОДБОР ДИАМЕТРОВ ---
  const autoSizeDucts = () => {
    if (!aerodynamics.success) return;
    setSegments(prev => prev.map(seg => {
      const calc = aerodynamics.list.find(c => c.segmentId === seg.id);
      if (!calc || calc.flow === 0) return seg;
      const targetV = seg.name.toLowerCase().includes('магистраль') ? 5.0 : 3.5;
      const areaOpt = calc.flow / (3600 * targetV);

      if (seg.shape === 'round') {
        const dOpt = Math.sqrt((4 * areaOpt) / Math.PI) * 1000;
        const diam = STANDARD_DIAMETERS.reduce((p, c) => Math.abs(c - dOpt) < Math.abs(p - dOpt) ? c : p);
        return { ...seg, diameter: diam };
      } else {
        const wOpt = (areaOpt / (seg.height / 1000)) * 1000;
        const width = STANDARD_RECT_SIZES.reduce((p, c) => Math.abs(c - wOpt) < Math.abs(p - wOpt) ? c : p);
        return { ...seg, width };
      }
    }));
  };

  // --- ЭКСПОРТ РАСЧЕТОВ ---
  const generateReport = () => {
    if (!aerodynamics.success) return;
    const win = window.open('', '_blank');
    if (!win) {
      alert("Всплывающее окно заблокировано! Разрешите вывод.");
      return;
    }

    let rows = '';
    aerodynamics.list.forEach((calc, i) => {
      const seg = segments.find(s => s.id === calc.segmentId);
      if (!seg) return;
      const sizeStr = seg.shape === 'round' ? `Ø ${seg.diameter} мм` : `${seg.width}x${seg.height} мм`;
      const sysName = seg.systemType === 'supply' ? '<span style="color:red">Приток</span>' : '<span style="color:blue">Вытяжка</span>';
      
      rows += `<tr style="border-bottom: 1.5px solid #eaeaea;">
        <td style="padding:10px; text-align:center;">${i+1}</td>
        <td style="padding:10px;">${seg.name}</td>
        <td style="padding:10px; text-align:center;">${sysName}</td>
        <td style="padding:10px; text-align:center;">${sizeStr}</td>
        <td style="padding:10px; text-align:center;">${calc.length.toFixed(1)} м</td>
        <td style="padding:10px; text-align:center; font-weight:bold;">${calc.flow.toFixed(0)} м³/ч</td>
        <td style="padding:10px; text-align:center; font-weight:bold; color: ${calc.velocity > 5 ? '#e11d48' : '#059669'}">${calc.velocity.toFixed(2)} м/с</td>
        <td style="padding:10px; text-align:center;">${calc.pTotal.toFixed(1)} Па</td>
      </tr>`;
    });

    win.document.write(`
      <html>
        <head><title>КлимЛаб - Аэродинамика</title></head>
        <body style="font-family:sans-serif; color:#333; padding:30px;">
          <h2>Аэродинамический расчет вентиляционной сети</h2>
          <p>Сгенерировано в реальном времени. СП 60.13330.2020.</p>
          <div style="display:flex; gap:20px; margin-bottom:20px;">
            <div style="border:1px solid #ddd; padding:15px; border-radius:10px;"><b>Расход Приток:</b> ${aerodynamics.totalSupply.toFixed(0)} м³/ч</div>
            <div style="border:1px solid #ddd; padding:15px; border-radius:10px;"><b>Расход Вытяжка:</b> ${aerodynamics.totalExhaust.toFixed(0)} м³/ч</div>
            <div style="border:1px solid #ddd; padding:15px; border-radius:10px; background:#fef3c7;"><b>Потери давления сети (max):</b> ${aerodynamics.maxLoss.toFixed(1)} Па</div>
          </div>
          <table style="width:100%; border-collapse:collapse;" border="1" cellpadding="0" cellspacing="0">
            <thead style="background:#f5f5f5;">
               <tr>
                 <th style="padding:10px;">#</th>
                 <th style="padding:10px;">Сегмент</th>
                 <th style="padding:10px;">Система</th>
                 <th style="padding:10px;">Размеры</th>
                 <th style="padding:10px;">Длина</th>
                 <th style="padding:10px;">Расход</th>
                 <th style="padding:10px;">Скорость</th>
                 <th style="padding:10px;">Потери давления</th>
               </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6] dark:bg-[#0c0c0f] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* HEADER */}
      <header className="px-4 py-4 md:px-8 md:py-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all active:scale-95 animate-fade-in"
            title="Назад"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="text-red-500 fill-red-500 animate-pulse" size={24} />
              <span>КЛИМЛАБCAD</span>
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
              Интерактивное современное CAD-черчение в реальном времени с ИИ-балансировкой
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onHome}
            className="px-4 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            В меню
          </button>
        </div>
      </header>

      {/* CORE FRAMEWORK */}
      <div className="flex-1 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-slate-200 dark:divide-white/5">
        
        {/* ЛЕВАЯ ПАНЕЛЬ: ЧЕРТЕЖНЫЙ ИНСТРУМЕНТАРИЙ */}
        <div className="w-full xl:w-96 p-4 md:p-6 space-y-5 bg-white dark:bg-[#0f0f13] flex-shrink-0 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-100px)]">
          
          <div className="space-y-5">
            {/* Тулбар выбора инструментов */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase text-slate-400 tracking-widest block">Инструменталка черчения</span>
              <div className="grid grid-cols-2 gap-1.5 font-semibold text-[11px]">
                <button
                  onClick={() => setActiveTool('select')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    activeTool === 'select'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                  }`}
                >
                  <MousePointer size={14} />
                  <span>Выбор и сдвиг</span>
                  <span className="ml-auto text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/15 text-slate-500 dark:text-slate-400 font-bold">Q/1</span>
                </button>
                <button
                  onClick={() => setActiveTool('draw-duct')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    activeTool === 'draw-duct'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                  }`}
                >
                  <Wind size={14} />
                  <span>Воздуховод</span>
                  <span className="ml-auto text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/15 text-slate-500 dark:text-slate-400 font-bold">W/2</span>
                </button>
                <button
                  onClick={() => setActiveTool('add-vent')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    activeTool === 'add-vent'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                  }`}
                >
                  <Grid size={14} />
                  <span>Диффузор</span>
                  <span className="ml-auto text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/15 text-slate-500 dark:text-slate-400 font-bold">E/3</span>
                </button>
                <button
                  onClick={() => setActiveTool('add-source')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    activeTool === 'add-source'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                  }`}
                >
                  <Cpu size={14} />
                  <span>Поставить ПВУ</span>
                  <span className="ml-auto text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/15 text-slate-500 dark:text-slate-400 font-bold">R/4</span>
                </button>
              </div>

              <button
                onClick={() => setActiveTool('delete')}
                className={`py-2 px-4 rounded-xl border w-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTool === 'delete'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-red-500/10 text-red-500 border-red-500/10 hover:bg-red-500/20'
                }`}
              >
                <Trash2 size={13} />
                <span>Режим быстрого удаления (Стиралка)</span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/25 text-[9.5px] font-mono font-bold text-white">D</span>
              </button>
            </div>

            {/* ПАРАМЕТРЫ ПЕРЕД ЧЕРЧЕНИЕМ */}
            <div className="bg-slate-50 dark:bg-[#16161c] p-4 rounded-2xl border border-slate-200/40 dark:border-white/5 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                <span>Параметры элемента черчения</span>
                <span className="text-[10px] text-blue-500 font-mono">CAD-Properties</span>
              </h3>

              {/* Выбор Системы */}
              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-2">
                  Тип системы (Назначение)
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-bold text-xs">
                  <button
                    onClick={() => setSystemTypeToDraw('supply')}
                    className={`py-2 rounded-xl transition-all border ${
                      systemTypeToDraw === 'supply'
                        ? 'bg-red-500 text-white border-red-500 shadow-sm'
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    ПРИТОК (Красный)
                  </button>
                  <button
                    onClick={() => setSystemTypeToDraw('exhaust')}
                    className={`py-2 rounded-xl transition-all border ${
                      systemTypeToDraw === 'exhaust'
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    ВЫТЯЖКА (Синий)
                  </button>
                </div>
              </div>

              {/* Настройки сечения */}
              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-2">
                  Форма сечения
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-bold text-xs mb-3">
                  <button
                    onClick={() => setDuctShape('round')}
                    className={`py-2 rounded-xl border ${
                      ductShape === 'round'
                        ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800'
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-500 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Круглый (Ø)
                  </button>
                  <button
                    onClick={() => setDuctShape('rectangular')}
                    className={`py-2 rounded-xl border ${
                      ductShape === 'rectangular'
                        ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800'
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-500 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Прямоуг. (AxB)
                  </button>
                </div>

                {ductShape === 'round' ? (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Диаметр воздуховода</span>
                    <select
                      value={ductDiameter}
                      onChange={(e) => setDuctDiameter(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 dark:text-white"
                    >
                      {STANDARD_DIAMETERS.map(d => (
                        <option key={d} value={d}>Ø {d} мм</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Ширина A, мм</span>
                      <select
                        value={rectWidth}
                        onChange={(e) => setRectWidth(Number(e.target.value))}
                        className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10"
                      >
                        {STANDARD_RECT_SIZES.map(w => <option key={w} value={w}>{w} мм</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Высота B, мм</span>
                      <select
                        value={rectHeight}
                        onChange={(e) => setRectHeight(Number(e.target.value))}
                        className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10"
                      >
                        {STANDARD_RECT_SIZES.map(h => <option key={h} value={h}>{h} мм</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Расход диффузора */}
              {activeTool === 'add-vent' && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Расход устанавливаемых диффузоров (L, м³/ч)
                  </label>
                  <input
                    type="number"
                    min="20" max="600" step="10"
                    value={ventFlow}
                    onChange={(e) => setVentFlow(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold"
                  />
                </div>
              )}
            </div>

            {/* СВОЙСТВА ВЫБРАННОГО ОБЪЕКТА */}
            {selectedNodeId && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
                <span className="text-xs font-black uppercase text-blue-500">Свойства узла</span>
                {nodes.find(n => n.id === selectedNodeId)?.type === 'vent' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase font-black mb-1">Расход воздуха L, м³/ч</label>
                    <input
                      type="number"
                      value={nodes.find(n => n.id === selectedNodeId)?.flow || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, flow: val } : n));
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#16161c] border dark:border-white/10 font-mono font-bold"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase font-black mb-1">Переназначить Систему</label>
                  <div className="grid grid-cols-2 gap-2 mt-1 font-bold text-[10px]">
                    <button
                      onClick={() => {
                        setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, systemType: 'supply' } : n));
                        // также все сегменты от него
                        setSegments(prev => prev.map(s => s.fromNodeId === selectedNodeId || s.toNodeId === selectedNodeId ? { ...s, systemType: 'supply' } : s));
                      }}
                      className="py-1 text-center border rounded bg-red-500/10 text-red-500 border-red-500/20"
                    >
                      Приток П1
                    </button>
                    <button
                      onClick={() => {
                        setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, systemType: 'exhaust' } : n));
                        setSegments(prev => prev.map(s => s.fromNodeId === selectedNodeId || s.toNodeId === selectedNodeId ? { ...s, systemType: 'exhaust' } : s));
                      }}
                      className="py-1 text-center border rounded bg-blue-500/10 text-blue-500 border-blue-500/20"
                    >
                      Вытяжка В1
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Визуальные шаблоны */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 space-y-3">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Фоновая планировка</span>
              <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                {['empty', 'apartment', 'office'].map(k => (
                  <button
                    key={k}
                    onClick={() => setBgPreset(k as any)}
                    className={`py-1 rounded border capitalize ${
                      bgPreset === k 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900' 
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {k === 'empty' ? 'Без плана' : k === 'apartment' ? 'Квартира' : 'Офис'}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center justify-between cursor-pointer text-xs font-semibold">
                  <span>Анимация потока</span>
                  <input
                    type="checkbox"
                    checked={showFlowAnimations}
                    onChange={(e) => setShowFlowAnimations(e.target.checked)}
                    className="rounded h-3.5 w-3.5 text-blue-500 border-slate-200"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-xs font-semibold">
                  <span>Цвета скоростей (Карта)</span>
                  <input
                    type="checkbox"
                    checked={showVelocityColors}
                    onChange={(e) => setShowVelocityColors(e.target.checked)}
                    className="rounded h-3.5 w-3.5 text-blue-500 border-slate-200"
                  />
                </label>
              </div>
            </div>

          </div>

          {/* ИИ И ПЕЧАТЬ */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
            <button 
              onClick={autoSizeDucts}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              <span>ИИ-автоподбор диаметров</span>
            </button>
            <button 
              onClick={generateReport}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FileText size={14} />
              <span>Генерировать отчет</span>
            </button>
          </div>

        </div>

        {/* ЦЕНТР: AutoCAD ХОЛСТ */}
        <div className="flex-1 bg-[#eaecef] dark:bg-[#070709] p-4 flex flex-col relative" ref={canvasContainerRef}>
          
          {/* Панель Управления Навигацией Видового Экрана */}
          <div className="absolute top-6 left-6 z-10 flex gap-1.5 p-1.5 rounded-xl bg-white/75 dark:bg-[#121217]/75 backdrop-blur-md border border-slate-200/50 dark:border-white/5 shadow-md items-center">
            <button 
              onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold hover:bg-slate-100 dark:hover:bg-white/5"
              title="Уменьшить масштаб (Колесико мыши вниз)"
            >
              -
            </button>
            <span className="px-2 flex items-center justify-center text-[10px] font-bold font-mono min-w-[50px]">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(z => Math.min(2.2, z + 0.1))} 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold hover:bg-slate-100 dark:hover:bg-white/5"
              title="Увеличить масштаб (Колесико мыши вверх)"
            >
              +
            </button>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10" />
            <button 
              onClick={handleZoomToFit}
              className="px-2.5 py-1.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg font-black uppercase tracking-wider flex items-center gap-1 text-slate-700 dark:text-slate-300 transition-all"
              title="Вписать все построенные элементы в видовой экран [F]"
            >
              <Maximize2 size={11} />
              <span>Вписать [F]</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10" />
            <button 
              onClick={() => {
                if (window.confirm("Очистить чертеж и начать заново?")) {
                  setNodes([]);
                  setSegments([]);
                  setSelectedNodeId(null);
                  setSelectedSegmentId(null);
                  setDrawingStartNodeId(null);
                }
              }} 
              className="px-3 text-[10px] uppercase font-bold text-red-500 hover:text-red-600 tracking-wider transition-colors"
            >
              Очистить
            </button>
          </div>

          {/* Статус-бар панели */}
          <div className="absolute top-6 right-6 z-10 px-3.5 py-2 rounded-xl bg-slate-900/95 text-white backdrop-blur-md shadow-lg text-[10px] font-bold tracking-wide uppercase flex items-center gap-2 border border-white/10 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>
              {activeTool === 'select' && 'Режим: Выбор и сдвиг узлов'}
              {activeTool === 'draw-duct' && (!drawingStartNodeId ? 'ЧЕРЧЕНИЕ: Кликните начальную точку' : 'ЧЕПОЧКА: Тяните и кликайте (Shift - Орто, Esc - Закончить)')}
              {activeTool === 'add-vent' && 'ВРЕЗКА: Клик на воздуховод врежет тройник!'}
              {activeTool === 'add-source' && 'УСТАНОВКА: Поставьте вентиляционную ПВУ'}
              {activeTool === 'delete' && 'ЛАСТИК: Быстрое удаление кликом'}
            </span>
          </div>

          {/* Клик-Вьюпорт зона панорамирования */}
          <div 
            ref={viewportRef}
            className="flex-1 w-full h-full flex items-center justify-center overflow-hidden rounded-3xl border border-slate-300/40 dark:border-white/5 bg-white dark:bg-[#0c0c10] shadow-inner relative"
            style={{ cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onMouseLeave={handleViewportMouseLeave}
          >
            {/* SVG ЧЕРТЕЖ */}
            <svg
              width={roomWidth * scale}
              height={roomLength * scale}
              onClick={handleCanvasClick}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                let x = snapToGrid((e.clientX - rect.left) / scale);
                let y = snapToGrid((e.clientY - rect.top) / scale);
                
                // AutoCAD Ortho Snapping по зажатой клавише Shift
                if (activeTool === 'draw-duct' && drawingStartNodeId && e.shiftKey) {
                  const startN = nodes.find(n => n.id === drawingStartNodeId);
                  if (startN) {
                    const dx = Math.abs(x - startN.x);
                    const dy = Math.abs(y - startN.y);
                    if (dx > dy) {
                      y = startN.y;
                    } else {
                      x = startN.x;
                    }
                  }
                }
                setCursorCoords({ x, y });
              }}
              onMouseLeave={() => setCursorCoords(null)}
              className="bg-slate-50 dark:bg-[#0b0b0e] border border-slate-300 dark:border-white/10 select-none overflow-visible shadow-lg rounded-xl"
              style={{
                position: 'absolute',
                left: `${panOffset.x}px`,
                top: `${panOffset.y}px`,
                transformOrigin: 'top left',
                pointerEvents: isPanning ? 'none' : 'auto',
                transition: isPanning ? 'none' : 'left 0.08s ease-out, top 0.08s ease-out'
              }}
            >
              {/* Сетка AutoCAD */}
              <defs>
                <pattern id="grid-pattern" width={gridSnapSize * scale} height={gridSnapSize * scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSnapSize * scale} 0 L 0 0 0 ${gridSnapSize * scale}`} fill="none" stroke="currentColor" className="text-slate-200 dark:text-white/[0.04]" strokeWidth="1" />
                </pattern>
                <style>
                  {`
                    @keyframes hvacFlow {
                      from { stroke-dashoffset: 24; }
                      to { stroke-dashoffset: 0; }
                    }
                    .hvac-flow-line {
                      stroke-dasharray: 6 12;
                      animation: hvacFlow var(--flow-dur, 1.2s) linear infinite;
                    }
                  `}
                </style>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />

              {/* ПЛАНИРОВКА ПОМЕЩЕНИЙ */}
              {bgPreset === 'apartment' && (
                <g className="opacity-20 pointer-events-none stroke-slate-450 dark:stroke-slate-700 text-slate-400 dark:text-slate-500 text-[10px] font-bold">
                  <line x1={roomWidth*0.4*scale} y1={0} x2={roomWidth*0.4*scale} y2={roomLength*scale} strokeWidth="1.5" />
                  <line x1={0} y1={roomLength*0.5*scale} x2={roomWidth*0.4*scale} y2={roomLength*0.5*scale} strokeWidth="1.5" />
                  <line x1={roomWidth*0.4*scale} y1={roomLength*0.6*scale} x2={roomWidth*scale} y2={roomLength*0.6*scale} strokeWidth="1.5" strokeDasharray="4 4" />
                  
                  <text x={roomWidth*0.2*scale} y={roomLength*0.25*scale} textAnchor="middle">КУХНЯ</text>
                  <text x={roomWidth*0.2*scale} y={roomLength*0.75*scale} textAnchor="middle">ВАННАЯ</text>
                  <text x={roomWidth*0.7*scale} y={roomLength*0.3*scale} textAnchor="middle">ГОСТИНАЯ</text>
                  <text x={roomWidth*0.7*scale} y={roomLength*0.8*scale} textAnchor="middle">СПАЛЬНЯ</text>
                </g>
              )}

              {bgPreset === 'office' && (
                <g className="opacity-20 pointer-events-none stroke-slate-450 dark:stroke-slate-700 text-slate-400 dark:text-slate-500 text-[10px] font-bold">
                  <line x1={roomWidth*0.5*scale} y1={0} x2={roomWidth*0.5*scale} y2={roomLength*scale} strokeWidth="2" />
                  <line x1={0} y1={roomLength*0.4*scale} x2={roomWidth*0.5*scale} y2={roomLength*0.4*scale} strokeWidth="1.5" />
                  <line x1={roomWidth*0.5*scale} y1={roomLength*0.5*scale} x2={roomWidth*scale} y2={roomLength*0.5*scale} strokeWidth="1.5" />
                  
                  <text x={roomWidth*0.25*scale} y={roomLength*0.2*scale} textAnchor="middle">КАБИНЕТ 1</text>
                  <text x={roomWidth*0.25*scale} y={roomLength*0.7*scale} textAnchor="middle">ПЕРЕГОВОРНАЯ</text>
                  <text x={roomWidth*0.75*scale} y={roomLength*0.4*scale} textAnchor="middle">OPEN SPACE ЗОНА</text>
                </g>
              )}

              {/* Направляющие Линии Выравнивания (Revit alignment snaplines) */}
              {alignmentGuides && (
                <g className="pointer-events-none opacity-60">
                  {alignmentGuides.x !== undefined && (
                    <line
                      x1={alignmentGuides.x * scale}
                      y1={0}
                      x2={alignmentGuides.x * scale}
                      y2={roomLength * scale}
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                  )}
                  {alignmentGuides.y !== undefined && (
                    <line
                      x1={0}
                      y1={alignmentGuides.y * scale}
                      x2={roomWidth * scale}
                      y2={alignmentGuides.y * scale}
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                  )}
                </g>
              )}

              {/* 1. ПОДГОТОВКА СЕГМЕНТОВ С ДВОЙНОЙ СТЕНОЙ (CAD СТИЛИЗАЦИЯ) */}
              {segments.map(seg => {
                const nFrom = nodes.find(n => n.id === seg.fromNodeId);
                const nTo = nodes.find(n => n.id === seg.toNodeId);
                if (!nFrom || !nTo) return null;

                const calc = aerodynamics.success ? aerodynamics.list.find(c => c.segmentId === seg.id) : null;
                const isSelected = selectedSegmentId === seg.id;

                const dx = nTo.x - nFrom.x;
                const dy = nTo.y - nFrom.y;
                const angleRad = Math.atan2(dy, dx);
                const distPixels = Math.sqrt(dx * dx + dy * dy) * scale;

                const sizeMm = seg.shape === 'round' ? seg.diameter : seg.width;
                const thickness = Math.max(4, (sizeMm / 1000) * scale);

                let sysColorVal = seg.systemType === 'supply' ? '#ef4444' : '#3b82f6';
                if (showVelocityColors && calc && calc.flow > 0) {
                  if (calc.velocity > 5.5) sysColorVal = '#f43f5e';
                  else if (calc.velocity > 4.0) sysColorVal = '#fb923c';
                  else sysColorVal = '#10b981';
                }

                return (
                  <g 
                    key={seg.id} 
                    onClick={(e) => handleSegmentClick(seg.id, e)}
                    className="cursor-pointer group/seg"
                  >
                    {/* Хитбокс */}
                    <line
                      x1={nFrom.x * scale} y1={nFrom.y * scale}
                      x2={nTo.x * scale} y2={nTo.y * scale}
                      stroke="transparent"
                      strokeWidth={thickness + 16}
                    />

                    {/* Физические стенки */}
                    <line
                      x1={nFrom.x * scale} y1={nFrom.y * scale}
                      x2={nTo.x * scale} y2={nTo.y * scale}
                      stroke={sysColorVal}
                      strokeWidth={thickness}
                      strokeLinecap="butt"
                      className="opacity-25"
                    />

                    {/* Наружная кромка */}
                    <line
                      x1={nFrom.x * scale} y1={nFrom.y * scale}
                      x2={nTo.x * scale} y2={nTo.y * scale}
                      stroke={sysColorVal}
                      strokeWidth={thickness}
                      strokeLinecap="butt"
                      fill="none"
                      className="stroke-[1.5px] opacity-75"
                    />

                    {/* Осевая линия */}
                    <line
                      x1={nFrom.x * scale} y1={nFrom.y * scale}
                      x2={nTo.x * scale} y2={nTo.y * scale}
                      stroke={sysColorVal}
                      strokeWidth="1.2"
                      strokeDasharray="5 4"
                      className="opacity-90"
                    />

                    {/* Анимированный поток частиц */}
                    {showFlowAnimations && calc && calc.flow > 0 && (
                      <line
                        x1={nFrom.x * scale} y1={nFrom.y * scale}
                        x2={nTo.x * scale} y2={nTo.y * scale}
                        stroke={seg.systemType === 'supply' ? '#f43f5e' : '#3b82f6'}
                        strokeWidth={Math.max(1.5, thickness / 5)}
                        fill="none"
                        className="hvac-flow-line opacity-80"
                        style={{
                          '--flow-dur': `${Math.max(0.4, Math.min(3, 4.5 / (calc.velocity || 1)))}s`
                        } as React.CSSProperties}
                      />
                    )}

                    {/* Выделение */}
                    {isSelected && (
                      <line
                        x1={nFrom.x * scale} y1={nFrom.y * scale}
                        x2={nTo.x * scale} y2={nTo.y * scale}
                        stroke="#fbbf24"
                        strokeWidth={thickness + 6}
                        strokeLinecap="round"
                        className="fill-none opacity-45 animate-pulse"
                      />
                    )}

                    {/* Расход и скорость */}
                    {calc && calc.flow > 1 && (
                      <g transform={`translate(${(nFrom.x + nTo.x)/2 * scale}, ${(nFrom.y + nTo.y)/2 * scale})`}>
                        <rect
                          x="-28" y="-9" width="56" height="18" rx="4"
                          className="fill-white/95 dark:fill-[#0c0c10]/95 stroke-slate-200 dark:stroke-white/10"
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle" y="-1" fontSize="8" fontWeight="bold"
                          className="fill-slate-700 dark:fill-slate-300 font-mono"
                        >
                          {calc.flow.toFixed(0)} м³/ч
                        </text>
                        <text
                          textAnchor="middle" y="7" fontSize="7.5"
                          className="fill-blue-500 dark:fill-blue-400 font-mono"
                        >
                          {calc.velocity.toFixed(1)} м/с
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* УЗЛЫ */}
              {nodes.map(n => {
                const isSelected = selectedNodeId === n.id;
                const fit = nodeConnections[n.id];
                const colorVal = n.systemType === 'supply' ? 'text-red-500' : 'text-blue-500';
                const nodeColor = n.systemType === 'supply' ? '#ef4444' : '#3b82f6';

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x * scale}, ${n.y * scale})`}
                    onClick={(e) => handleNodeClick(n.id, e)}
                    onMouseDown={(e) => handleNodeDrag(n.id, e)}
                    className="cursor-move select-none"
                  >
                    <circle r="16" fill="transparent" />

                    {/* Фитинги */}
                    {n.type === 'junction' && fit && (
                      <g>
                        {fit.type === 'elbow' && (
                          <circle r="6" fill="none" stroke={nodeColor} strokeWidth="3" className="opacity-80" />
                        )}
                        {fit.type === 'tee' && (
                          <path d="M-6,-3 L6,-3 M0,-3 L0,6" stroke={nodeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                        {fit.type === 'cross' && (
                          <path d="M-6,0 L6,0 M0,-6 L0,6" stroke={nodeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                        {fit.type === 'union' && (
                          <circle r="3" fill="none" stroke={nodeColor} strokeWidth="2" />
                        )}
                        <circle r="4" className="fill-slate-600 dark:fill-white" />
                      </g>
                    )}

                    {/* ПВУ */}
                    {n.type === 'source' && (
                      <g>
                        <rect x="-14" y="-14" width="28" height="28" rx="6" fill={nodeColor} className="shadow-lg" />
                        <Wind size={14} className="text-white absolute transform -translate-x-[7px] -translate-y-[7px]" />
                        <rect x="-16" y="-16" width="32" height="32" fill="none" stroke={nodeColor} strokeWidth="1.5" strokeDasharray="3 3" />
                      </g>
                    )}

                    {/* ДИФФУЗОР */}
                    {n.type === 'vent' && (
                      <g className="animate-fade-in">
                        <circle r="11" fill="white" stroke={nodeColor} strokeWidth="3" className="shadow-md dark:fill-[#151520]" />
                        <line x1="-6" y1="-6" x2="6" y2="6" stroke={nodeColor} strokeWidth="1.5" />
                        <line x1="6" y1="-6" x2="-6" y2="6" stroke={nodeColor} strokeWidth="1.5" />
                        <circle r="3" fill={nodeColor} />
                        {n.flow > 0 && (
                          <text y="-14" textAnchor="middle" fontSize="8" className="fill-slate-600 dark:fill-slate-400 font-mono font-black animate-pulse">
                            {n.flow} м³/ч
                          </text>
                        )}
                      </g>
                    )}

                    {/* Фоновое желтое сияние выделения */}
                    {isSelected && (
                      <circle r="18" fill="none" stroke="#eab308" strokeWidth="2.5" className="animate-pulse" />
                    )}

                    {/* Имя */}
                    <text y="22" textAnchor="middle" fontSize="8" fontWeight="bold" className="fill-slate-600 dark:fill-slate-400 tracking-tight uppercase">
                      {n.name}
                    </text>
                  </g>
                );
              })}

              {/* ЛИНИЯ-ПРИЗРАК ЧЕРЧЕНИЯ (AutoCAD Tracer Line) */}
              {activeTool === 'draw-duct' && drawingStartNodeId && cursorCoords && (
                (() => {
                  const startN = nodes.find(n => n.id === drawingStartNodeId);
                  if (!startN) return null;
                  const targetStyle = systemTypeToDraw === 'supply' ? '#ef4444' : '#3b82f6';
                  
                  // Вычисляем длину чертящегося воздуховода в метрах
                  const segmentLengthMeters = Math.sqrt(Math.pow(cursorCoords.x - startN.x, 2) + Math.pow(cursorCoords.y - startN.y, 2));

                  return (
                    <g className="pointer-events-none opacity-70">
                      <line
                        x1={startN.x * scale}
                        y1={startN.y * scale}
                        x2={cursorCoords.x * scale}
                        y2={cursorCoords.y * scale}
                        stroke={targetStyle}
                        strokeWidth="3.5"
                        strokeDasharray="5 5"
                      />
                      <circle
                        cx={cursorCoords.x * scale}
                        cy={cursorCoords.y * scale}
                        r="6"
                        fill="none"
                        stroke={targetStyle}
                        strokeWidth="2"
                        className="animate-ping"
                      />
                      
                      {/* Метка размера прямо на резиновой линии */}
                      <g transform={`translate(${(startN.x + cursorCoords.x)/2 * scale}, ${(startN.y + cursorCoords.y)/2 * scale - 12})`}>
                        <rect x="-24" y="-8" width="48" height="15" rx="3" className="fill-slate-900 stroke-white/10" strokeWidth="1" />
                        <text textAnchor="middle" y="2" fontSize="7.5" fontWeight="bold" fill="#fff" className="font-mono">
                          {segmentLengthMeters.toFixed(1)} м
                        </text>
                      </g>
                    </g>
                  );
                })()
              )}

              {/* Revit Диффузор авт-Врезка SNAP PREVIEW */}
              {activeTool === 'add-vent' && cursorCoords && (
                (() => {
                  let closestSeg: DuctSegment | null = null;
                  let minDistance = 0.45;
                  let projX = cursorCoords.x;
                  let projY = cursorCoords.y;

                  segments.forEach(seg => {
                    const fromN = nodes.find(n => n.id === seg.fromNodeId);
                    const toN = nodes.find(n => n.id === seg.toNodeId);
                    if (fromN && toN) {
                      const dx = toN.x - fromN.x;
                      const dy = toN.y - fromN.y;
                      const len2 = dx * dx + dy * dy;
                      if (len2 > 0) {
                        const t = Math.max(0.1, Math.min(0.9, ((cursorCoords.x - fromN.x) * dx + (cursorCoords.y - fromN.y) * dy) / len2));
                        const px = fromN.x + t * dx;
                        const py = fromN.y + t * dy;
                        const dist = Math.sqrt(Math.pow(cursorCoords.x - px, 2) + Math.pow(cursorCoords.y - py, 2));
                        if (dist < minDistance) {
                          minDistance = dist;
                          closestSeg = seg;
                          projX = px;
                          projY = py;
                        }
                      }
                    }
                  });

                  if (closestSeg) {
                    const segColor = (closestSeg as DuctSegment).systemType === 'supply' ? '#ef4444' : '#3b82f6';
                    return (
                      <g className="pointer-events-none opacity-85">
                        <circle cx={projX * scale} cy={projY * scale} r="5" fill="#10b981" />
                        <line
                          x1={projX * scale} y1={projY * scale}
                          x2={cursorCoords.x * scale} y2={cursorCoords.y * scale}
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeDasharray="3 3"
                        />
                        <circle cx={cursorCoords.x * scale} cy={cursorCoords.y * scale} r="10" fill="none" stroke={segColor} strokeWidth="2.5" />
                        <text x={cursorCoords.x * scale} y={(cursorCoords.y - 1.2) * scale} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#10b981">
                          РЕВИД: Авт-врезка Тройника
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()
              )}
            </svg>

            {/* КОНТЕКСТНЫЙ ИНТУИТИВНЫЙ РЕДАКТОР ПРЯМО НА ХОЛСТЕ */}
            {floatingPanelPosition.visible && (
              <div 
                style={{ 
                  position: 'absolute',
                  left: `${floatingPanelPosition.left}px`,
                  top: `${floatingPanelPosition.top - 20}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                className="z-30 p-2.5 bg-slate-900/95 dark:bg-[#121217]/95 text-white rounded-xl shadow-xl border border-white/10 flex items-center gap-2.5 animate-fade-in text-xs max-w-[280px] backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()} /* Предотвращает перетягивание видового экрана */
              >
                {floatingPanelPosition.type === 'node' && (
                  <>
                    {floatingPanelPosition.nodeType === 'vent' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Расход:</span>
                        <input 
                          type="number"
                          value={nodes.find(n => n.id === selectedNodeId)?.flow || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, flow: val } : n));
                          }}
                          className="w-14 bg-white/10 px-1 py-0.5 rounded text-white font-bold text-center border border-white/10 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                        />
                        <span className="text-[8px] font-bold text-slate-400">м³/ч</span>
                      </div>
                    ) : (
                      <span className="font-bold truncate text-[11px] max-w-[100px]" title={nodes.find(n => n.id === selectedNodeId)?.name}>
                        {nodes.find(n => n.id === selectedNodeId)?.name}
                      </span>
                    )}
                    
                    <div className="h-4 w-[1px] bg-white/10" />
                    
                    {/* Кнопка смены системы */}
                    <button
                      onClick={() => {
                        const currentSys = nodes.find(n => n.id === selectedNodeId)?.systemType;
                        const newSys = currentSys === 'supply' ? 'exhaust' : 'supply';
                        setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, systemType: newSys, name: n.type === 'source' ? (newSys === 'supply' ? 'ПВУ-Приток' : 'ПВУ-Вытяжка') : n.name } : n));
                        setSegments(prev => prev.map(s => s.fromNodeId === selectedNodeId || s.toNodeId === selectedNodeId ? { ...s, systemType: newSys } : s));
                      }}
                      className={`px-2 py-1 rounded text-[9.5px] font-bold transition-all ${
                        nodes.find(n => n.id === selectedNodeId)?.systemType === 'supply' 
                          ? 'bg-red-500/30 text-red-300 border border-red-500/20' 
                          : 'bg-blue-500/30 text-blue-300 border border-blue-500/20'
                      }`}
                    >
                      {nodes.find(n => n.id === selectedNodeId)?.systemType === 'supply' ? 'Приток' : 'Вытяжка'}
                    </button>

                    <div className="h-4 w-[1px] bg-white/10" />
                    
                    {/* Удалить элемент */}
                    <button 
                      onClick={() => {
                        setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
                        setSegments(prev => prev.filter(s => s.fromNodeId !== selectedNodeId && s.toNodeId !== selectedNodeId));
                        setSelectedNodeId(null);
                      }}
                      className="p-1 hover:bg-rose-500/30 text-rose-400 rounded transition-all cursor-pointer"
                      title="Удалить узел"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}

                {floatingPanelPosition.type === 'segment' && (() => {
                  const seg = segments.find(s => s.id === selectedSegmentId);
                  if (!seg) return null;
                  return (
                    <div className="flex items-center gap-2">
                      {/* Тип сечения */}
                      <button
                        onClick={() => setSegments(prev => prev.map(s => s.id === selectedSegmentId ? { ...s, shape: s.shape === 'round' ? 'rectangular' : 'round' } : s))}
                        className="p-1 rounded bg-white/10 font-bold hover:bg-white/20 text-[9.5px] px-1.5 transition-all text-slate-200"
                      >
                        {seg.shape === 'round' ? 'Круглый (Ø)' : 'Прямоуг. (AxB)'}
                      </button>
                      
                      <div className="h-4 w-[1px] bg-white/10" />

                      {/* Сечение */}
                      {seg.shape === 'round' ? (
                        <select
                          value={seg.diameter}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSegments(prev => prev.map(s => s.id === selectedSegmentId ? { ...s, diameter: val } : s));
                          }}
                          className="bg-white/15 text-white rounded px-1.5 py-0.5 text-[10px] font-bold border border-white/10 focus:outline-none"
                        >
                          {STANDARD_DIAMETERS.map(d => (
                            <option key={d} value={d} className="bg-slate-950">Ø{d} мм</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <select
                            value={seg.width}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSegments(prev => prev.map(s => s.id === selectedSegmentId ? { ...s, width: val } : s));
                            }}
                            className="bg-white/15 text-white rounded px-1 text-[10px] font-bold border border-white/10 focus:outline-none"
                          >
                            {STANDARD_RECT_SIZES.map(w => (
                              <option key={w} value={w} className="bg-slate-950">{w}</option>
                            ))}
                          </select>
                          <span className="text-slate-450">x</span>
                          <select
                            value={seg.height}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSegments(prev => prev.map(s => s.id === selectedSegmentId ? { ...s, height: val } : s));
                            }}
                            className="bg-white/15 text-white rounded px-1 text-[10px] font-bold border border-white/10 focus:outline-none"
                          >
                            {STANDARD_RECT_SIZES.map(h => (
                              <option key={h} value={h} className="bg-slate-950">{h}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="h-4 w-[1px] bg-white/10" />
                      
                      {/* Удалить воздуховод */}
                      <button 
                        onClick={() => {
                          setSegments(prev => prev.filter(s => s.id !== selectedSegmentId));
                          setSelectedSegmentId(null);
                        }}
                        className="p-1 hover:bg-rose-500/30 text-rose-400 rounded transition-all cursor-pointer"
                        title="Удалить воздуховод"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Постоянная КлимЛаб Координатная Строка / AutoCAD-Statusbar */}
            <div className="absolute bottom-5 left-5 z-10 px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-[10px] font-bold text-slate-300 border border-white/5 shadow-md flex gap-4 items-center select-none font-mono">
              <span className="text-emerald-400 font-black">
                {cursorCoords ? `X: ${cursorCoords.x.toFixed(2)}м , Y: ${cursorCoords.y.toFixed(2)}м` : 'X: -- , Y: --'}
              </span>
              <div className="h-3 w-[1px] bg-white/10" />
              <span>[Колесико: Зум]</span>
              <span>[Зажмите Колесико / Space + ЛКМ: Панорама]</span>
              <span>[Зажмите Shift: Орто]</span>
            </div>
          </div>

          {/* Быстрая панель управления AutoCAD цепочкой рисования */}
          {activeTool === 'draw-duct' && drawingStartNodeId && (
            <div className="mt-3 p-3 bg-white dark:bg-[#121217] rounded-2.5xl flex items-center justify-between border dark:border-white/10 shadow-lg animate-fade-in relative z-15">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                <span>✏️ Цепочка черчения активна. Нажмите <kbd className="bg-slate-150 p-1 text-[10px] rounded dark:bg-white/10">ESC</kbd> или кнопку справа для фиксации воздуховода.</span>
              </span>
              <button
                onClick={() => setDrawingStartNodeId(null)}
                className="py-1 px-4 text-xs font-black uppercase rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow hover:opacity-90"
              >
                Фиксировать трассу
              </button>
            </div>
          )}
        </div>

        {/* СПРАВА: КОКПИТ АЭРОДИНАМИКИ И ОВК ОТЧЕТ */}
        <div className="w-full xl:w-96 p-4 md:p-6 space-y-5 bg-white dark:bg-[#0f0f13] flex-shrink-0 overflow-y-auto max-h-[calc(100vh-100px)]">
          
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
              Панель Балансировки
            </h3>

            {/* Карточки общих данных */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-red-500/[0.03] border border-red-500/10 text-red-500">
                <span className="text-[10px] uppercase font-bold text-red-400 block mb-0.5">Входной Приток</span>
                <span className="text-lg font-black">{aerodynamics.totalSupply.toFixed(0)}</span>
                <span className="text-[10px] font-bold"> м³/ч</span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/[0.03] border border-blue-500/10 text-blue-500">
                <span className="text-[10px] uppercase font-bold text-blue-400 block mb-0.5">Выходная Вытяжка</span>
                <span className="text-lg font-black">{aerodynamics.totalExhaust.toFixed(0)}</span>
                <span className="text-[10px] font-bold"> м³/ч</span>
              </div>
            </div>

            {/* Карта Макс. Потерь в сети */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Требуемый напор вентилятора</span>
                <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold">СП 60</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {aerodynamics.maxLoss.toFixed(1)}
                </span>
                <span className="text-[10px] font-bold text-slate-400"> Па</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    aerodynamics.maxLoss > 80 ? 'bg-red-500' : aerodynamics.maxLoss > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (aerodynamics.maxLoss / 120) * 100)}%` }}
                />
              </div>
            </div>

            {/* ДИАГНОСТИКА ОШИБОК ЧЕРТЕЖА */}
            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-white/[0.02] border-slate-250 dark:border-white/5 space-y-2.5 text-xs">
              <h4 className="font-extrabold uppercase text-[10.5px] text-slate-400 tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" />
                <span>Рекомендации КлимЛаб AI</span>
              </h4>

              {aerodynamics.success ? (
                (() => {
                  const badSegs = aerodynamics.list.filter(c => c.velocity > 5.5);
                  const noisySegs = aerodynamics.list.filter(c => c.velocity > 4.2 && c.velocity <= 5.5);

                  return (
                    <div className="space-y-2 leading-relaxed">
                      {badSegs.length === 0 && noisySegs.length === 0 ? (
                        <p className="text-emerald-500 font-bold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/15">
                          ✓ Конфигурация отличная! Все скорости воздуха в норме (менее 4.0 м/с). Шум вентиляции будет минимальным.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {badSegs.length > 0 && (
                            <div className="p-2.5 bg-red-500/5 text-red-500 border border-red-500/20 rounded-xl">
                              <strong>Критическая скорость!</strong> На {badSegs.length} участках скорость выше 5.5 м/с. Воздух будет свистеть в каналах. Рекомендуется увеличить сечение.
                            </div>
                          )}
                          {noisySegs.length > 0 && badSegs.length === 0 && (
                            <div className="p-2.5 bg-amber-500/5 text-amber-500 border border-amber-500/20 rounded-xl">
                              <strong>Повышенный шум.</strong> На {noisySegs.length} участках скорость 4.0 - 5.5 м/с. Возможен легкий гул. Примените шумоглушители.
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 bg-white dark:bg-white/5 p-2 rounded">
                        💡 <b>Подсказка Revit:</b> При врезке диффузоров прямо в трубы, КлимЛаб автоматически подсчитает тройники и увеличит сопротивление.
                      </p>
                    </div>
                  );
                })()
              ) : (
                <p className="text-red-500 italic">Расчет временно недоступен</p>
              )}
            </div>

            {/* СПЕЦИФИКАЦИЯ СЕГМЕНТОВ */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Спецификация участков ({segments.length} шт.)
              </span>

              {aerodynamics.success && aerodynamics.list.map((calc, idx) => {
                const seg = segments.find(s => s.id === calc.segmentId);
                if (!seg) return null;
                const sysTypeColor = seg.systemType === 'supply' ? 'border-red-500/15 bg-red-500/[0.01]' : 'border-blue-500/15 bg-blue-500/[0.01]';
                
                return (
                  <div 
                    key={seg.id}
                    onClick={() => setSelectedSegmentId(seg.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                      selectedSegmentId === seg.id 
                        ? 'border-amber-500 bg-amber-500/5' 
                        : calc.isCritical
                          ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
                          : `border-slate-200 hover:border-slate-350 dark:border-white/5 dark:hover:border-white/10`
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${seg.systemType === 'supply' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {seg.name || `Участок ${idx+1}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500">
                        {seg.shape === 'round' ? `Ø${seg.diameter}` : `${seg.width}x${seg.height}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Расход</span>
                        <strong className="text-slate-700 dark:text-slate-300">{calc.flow.toFixed(0)}</strong> м³/ч
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Скорость</span>
                        <strong className={calc.velocity > 5 ? 'text-rose-500' : calc.velocity > 4 ? 'text-amber-500' : 'text-emerald-500'}>
                          {calc.velocity.toFixed(1)}
                        </strong> м/с
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px]">Потери P</span>
                        <strong className="text-slate-700 dark:text-slate-300">{calc.pTotal.toFixed(1)}</strong> Па
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
