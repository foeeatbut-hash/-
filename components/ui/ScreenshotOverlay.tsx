import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ScreenshotOverlayProps {
    onCapture: (base64Url: string) => void;
    onCancel: () => void;
}

export const ScreenshotOverlay: React.FC<ScreenshotOverlayProps> = ({ onCapture, onCancel }) => {
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const overlayRef = useRef<HTMLDivElement>(null);

    // Prevent default drag behaviors
    useEffect(() => {
        const preventDefault = (e: Event) => e.preventDefault();
        window.addEventListener('dragstart', preventDefault);
        return () => window.removeEventListener('dragstart', preventDefault);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (selection) return; // If already selected, do not start again unless we add a clear logic
        setIsSelecting(true);
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isSelecting) return;
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        if (!isSelecting) return;
        setIsSelecting(false);
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(startPos.x - currentPos.x);
        const h = Math.abs(startPos.y - currentPos.y);
        
        if (w > 10 && h > 10) {
            setSelection({ x, y, w, h });
        } else {
            setSelection(null);
        }
    };

    const handleConfirm = async () => {
        if (!selection) return;
        setIsCapturing(true);

        try {
            // Hide overlay briefly to avoid capturing the overlay UI
            if (overlayRef.current) overlayRef.current.style.display = 'none';

            const canvas = await html2canvas(document.body, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false, // Suppress console logs like remote SVG loading errors
                ignoreElements: (element) => {
                    // Ignore elements with CSS background urls that might fail CORS if we wanted to
                    // but logging: false should be enough for the error not polluting the console
                    return false;
                }
            });

            if (overlayRef.current) overlayRef.current.style.display = 'block';

            // Create a cropped canvas
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = selection.w;
            cropCanvas.height = selection.h;
            const ctx = cropCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(
                    canvas,
                    selection.x, selection.y, selection.w, selection.h,
                    0, 0, selection.w, selection.h
                );
            }

            const dataUrl = cropCanvas.toDataURL('image/png');
            onCapture(dataUrl);
        } catch (error) {
            console.error("Failed to capture screenshot", error);
            onCancel();
        } finally {
            setIsCapturing(false);
        }
    };

    const handleReject = () => {
        setSelection(null);
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, []);

    let rectStyle = {};
    if (isSelecting) {
        rectStyle = {
            left: Math.min(startPos.x, currentPos.x),
            top: Math.min(startPos.y, currentPos.y),
            width: Math.abs(startPos.x - currentPos.x),
            height: Math.abs(startPos.y - currentPos.y),
        };
    } else if (selection) {
        rectStyle = {
            left: selection.x,
            top: selection.y,
            width: selection.w,
            height: selection.h,
        };
    }

    return (
        <div 
            ref={overlayRef}
            className={`fixed inset-0 z-[9999] cursor-crosshair select-none ${selection ? 'bg-black/40' : 'bg-transparent'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ 
                // We use a slight opacity in the background if selecting might be useful, 
                // but usually we want to see the screen clearly to crop.
                backgroundColor: (isSelecting || selection) ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)' 
            }}
        >
            {/* The selected area should look bright, we can fake it by putting 4 divs around it, or just highlighting the border */}
            {(isSelecting || selection) && (
                <>
                    <div 
                        className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
                        style={rectStyle}
                    ></div>
                    
                    {selection && !isCapturing && (
                        <div 
                            className="absolute flex items-center gap-2 mt-2"
                            style={{
                                left: selection.x,
                                top: selection.y + selection.h,
                            }}
                            onMouseDown={e => e.stopPropagation()} // prevent new selection
                        >
                            <button 
                                onClick={handleReject}
                                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <button 
                                onClick={handleConfirm}
                                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-600 transition-colors"
                            >
                                <Check size={20} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {isCapturing && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-[10000]">
                    <div className="bg-white p-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Сохранение снимка...
                    </div>
                </div>
            )}
            
            {!isSelecting && !selection && (
                <div className="absolute top-10 w-full text-center pointer-events-none">
                    <span className="bg-black/70 text-white px-4 py-2 rounded-full font-medium text-sm backdrop-blur-md">
                        Выделите область для снимка экрана. Клавиша Esc для отмены.
                    </span>
                </div>
            )}
            
            <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto shadow-md">
                 <button onClick={onCancel} className="bg-white/80 hover:bg-white text-slate-700 p-2 rounded-xl backdrop-blur-sm shadow border border-black/10">
                     <X size={20} />
                 </button>
            </div>
        </div>
    );
};
