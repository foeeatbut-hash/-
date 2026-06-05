import React, { useRef, useState, useEffect } from 'react';

interface ViewCubeProps {
    rotX: number;
    rotY: number;
    setCamera: any;
}

const PI = Math.PI;

// Конфигурация всех 6 граней с их идеальными векторами привязки (Snap Vectors)
const FACES = [
    {
        label: 'СПЕРЕДИ',
        transform: `translateZ(30px)`,
        getSnap: (r: number, c: number) => ({
            rx: [PI/4, 0, -PI/4][r],
            ry: [PI/4, 0, -PI/4][c]
        })
    },
    {
        label: 'СЗАДИ',
        transform: `rotateY(180deg) translateZ(30px)`,
        getSnap: (r: number, c: number) => ({
            rx: [PI/4, 0, -PI/4][r],
            ry: [3*PI/4, PI, -3*PI/4][c]
        })
    },
    {
        label: 'СПРАВА',
        transform: `rotateY(90deg) translateZ(30px)`,
        getSnap: (r: number, c: number) => ({
            rx: [PI/4, 0, -PI/4][r],
            ry: [-PI/4, -PI/2, -3*PI/4][c]
        })
    },
    {
        label: 'СЛЕВА',
        transform: `rotateY(-90deg) translateZ(30px)`,
        getSnap: (r: number, c: number) => ({
            rx: [PI/4, 0, -PI/4][r],
            ry: [3*PI/4, PI/2, PI/4][c]
        })
    },
    {
        label: 'СВЕРХУ',
        transform: `rotateX(90deg) translateZ(30px)`,
        getSnap: (r: number, c: number) => {
            if (r === 1 && c === 1) return { rx: PI/2, ry: 0 };
            const ryMap = [
                [3*PI/4, PI, -3*PI/4],
                [PI/2,   0,  -PI/2],
                [PI/4,   0,  -PI/4]
            ];
            return { rx: PI/4, ry: ryMap[r][c] };
        }
    },
    {
        label: 'СНИЗУ',
        transform: `rotateX(-90deg) translateZ(30px)`,
        getSnap: (r: number, c: number) => {
            if (r === 1 && c === 1) return { rx: -PI/2, ry: 0 };
            const ryMap = [
                [PI/4,   0,  -PI/4],
                [PI/2,   0,  -PI/2],
                [3*PI/4, PI, -3*PI/4]
            ];
            return { rx: -PI/4, ry: ryMap[r][c] };
        }
    }
];

const ViewCube: React.FC<ViewCubeProps> = ({ rotX, rotY, setCamera }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });
    const dragHasMoved = useRef(false); // Защита от случайного клика при перетаскивании

    const rX = -rotX * (180 / Math.PI);
    const rY = rotY * (180 / Math.PI);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragHasMoved.current = false;
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            rotX: rotX,
            rotY: rotY
        };
        e.stopPropagation();
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                dragHasMoved.current = true;
            }

            const sens = 0.01;
            let newRotY = dragStart.current.rotY + dx * sens;
            let newRotX = dragStart.current.rotX + dy * sens;

            // Блокируем камеру от переворота вверх ногами (gimbal lock prevention)
            newRotX = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, newRotX));

            setCamera({ rotX: newRotX, rotY: newRotY });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, setCamera]);

    return (
        <div className="absolute top-8 right-8 w-[60px] h-[60px] z-50 group pointer-events-auto" style={{ perspective: '400px' }}>
            {/* Кнопка Домой (Home) - появляется при наведении на зону куба */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setCamera({ rotX: 0.3, rotY: -0.6 }); // Исходный изометрический ракурс
                }}
                className="absolute -top-6 -left-6 w-5 h-5 bg-[#e4e4e4] hover:bg-[#cde6ff] hover:border-[#005fb8] border border-[#a1a1a1] rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-sm text-gray-700 cursor-pointer"
                title="Исходный вид"
            >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
            </button>

            {/* Контейнер куба */}
            <div
                className="relative w-full h-full cursor-move transition-transform ease-out"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${rX}deg) rotateY(${rY}deg)`,
                    transitionDuration: isDragging ? '0ms' : '150ms' // Плавный Snap, мгновенный Drag
                }}
                onMouseDown={handleMouseDown}
            >
                {FACES.map((face, idx) => (
                    <div
                        key={idx}
                        className="absolute inset-0 flex items-center justify-center bg-[#e4e4e4] border border-[#9fa4a8] select-none"
                        style={{ transform: face.transform, transformStyle: 'preserve-3d' }}
                    >
                        {/* Внутренняя фаска (Bevel) для эффекта объема как в Revit */}
                        <div className="absolute inset-0 border-[2px] border-white/40 pointer-events-none" />

                        {/* Текст грани */}
                        <div className="absolute font-sans font-bold text-[10px] text-[#3b4045] tracking-widest pointer-events-none uppercase">
                            {face.label}
                        </div>

                        {/* Сетка 3x3 для кликов (Грань, Рёбра, Углы) */}
                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '25% 50% 25%', gridTemplateRows: '25% 50% 25%' }}>
                            {[0, 1, 2].map(row => (
                                [0, 1, 2].map(col => {
                                    const isCenter = row === 1 && col === 1;
                                    const hoverClass = isCenter
                                        ? 'hover:bg-[#005fb8]/20 hover:border hover:border-[#005fb8]/40'
                                        : 'hover:bg-[#005fb8]/30';

                                    return (
                                        <div
                                            key={`${row}-${col}`}
                                            className={`w-full h-full cursor-pointer transition-colors duration-100 ${hoverClass}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Отменяем клик, если пользователь просто перетаскивал куб
                                                if (dragHasMoved.current) return;
                                                const { rx, ry } = face.getSnap(row, col);
                                                setCamera({ rotX: rx, rotY: ry });
                                            }}
                                        />
                                    )
                                })
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ViewCube;