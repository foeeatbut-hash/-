import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, GripHorizontal, Loader2, StopCircle, CornerDownLeft, Plus, Clock, Trash2, ArrowLeft, Crop, Check, Copy } from 'lucide-react';
import { motion, useDragControls, useMotionValue } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ScreenshotOverlay } from './ScreenshotOverlay';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    image?: string;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    date: number;
}

const DEFAULT_MESSAGES: Message[] = [
    { id: 'initial-msg', text: 'Привет! Я ИИ-ассистент КлимЛаб. Чем я могу помочь?', sender: 'ai' }
];

const SUGGESTIONS = [
    { label: '🌬️ Аэродинамика', text: 'Расскажи про аэродинамический расчет воздуховодов. Дай основные формулы и нормы скоростей.' },
    { label: '🌡️ Нагрев воздуха', text: 'Как рассчитать требуемую тепловую мощность калорифера для нагрева приточного воздуха?' },
    { label: '💦 Психрометрия', text: 'Объясни психрометрию: формулы энтальпии, влагосодержания и точки росы воздуха.' },
    { label: '❄️ Охлаждение', text: 'Как рассчитывается холодопроизводительность для кондиционирования помещений?' },
    { label: '🌪️ Дымоудаление', text: 'Какие основные формулы и требования предъявляются к системам противодымной защиты?' },
    { label: '📘 СП 60.13330 нормы', text: 'Каковы расчетные параметры наружного воздуха и нормы воздухообмена по СП 60.13330?' },
];

const PreWithCopy = ({ children }: { children: React.ReactNode }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        let text = '';
        React.Children.forEach(children, (child) => {
            const anyChild = child as any;
            if (typeof anyChild === 'string') {
                text += anyChild;
            } else if (anyChild && anyChild.props && anyChild.props.children) {
                const extractText = (el: any): string => {
                    if (typeof el === 'string') return el;
                    if (Array.isArray(el)) return el.map(extractText).join('');
                    if (el && el.props && el.props.children) {
                        return extractText(el.props.children);
                    }
                    return '';
                };
                text += extractText(anyChild.props.children);
            }
        });

        if (!text) {
            text = String(children);
        }

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group/pre my-3">
            <pre className="bg-slate-900 dark:bg-[#0c0c0e] text-slate-100 p-4 pt-10 rounded-xl overflow-x-auto text-xs font-mono border border-slate-800/80 dark:border-white/5 shadow-inner leading-relaxed">
                {children}
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 opacity-0 group-hover/pre:opacity-100 focus:opacity-100 focus:outline-none cursor-pointer flex items-center gap-1.5"
            >
                {copied ? <Check size={10} className="text-emerald-400 animate-pulse" /> : <Copy size={10} />}
                <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
        </div>
    );
};

// Функция стриминга ответов с локального бэкенда с устойчивой буферизацией строк
const fetchStreamingChat = async (query: string, imageBase64: string | undefined, history: Message[], signal: AbortSignal, onChunk: (text: string) => void) => {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, imageBase64, history }),
        signal,
    });

    if (!response.ok) {
        let errMsg = 'Network response was not ok';
        try {
            const errData = await response.json();
            if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
    }

    if (!response.body) throw new Error('No readable stream in response');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Сохраняем последний незаконченный хвост строки для следующей итерации
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') {
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            onChunk(parsed.text);
                        }
                    } catch (e) {
                        // ignore unparseable chunk
                    }
                }
            }
        }
    }
};

export const AIChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false); // Состояние первичного ожидания (до первого чанка)
    const [isGenerating, setIsGenerating] = useState(false); // Состояние активной генерации ответа (стриминг)
    const [isOnline, setIsOnline] = useState<boolean>(true); // Статус API

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/chat/status');
                if (res.ok) {
                    const data = await res.json();
                    setIsOnline(data.active);
                } else {
                    setIsOnline(false);
                }
            } catch (e) {
                setIsOnline(false);
            }
        };
        checkStatus();
        // Периодически обновляем статус в фоне
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);
    
    // Screenshot states
    const [isScreenshotMode, setIsScreenshotMode] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);

    // Chat history state
    const [chatHistory, setChatHistory] = useLocalStorage<ChatSession[]>('klimlab-chat-history', []);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [view, setView] = useState<'chat' | 'history'>('chat');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const dragControls = useDragControls();
    
    // Ссылка на контроллер отмены запроса, чтобы прерывать fetch (Race Condition, ручная отмена)
    const abortControllerRef = useRef<AbortController | null>(null);

    const [confirmClear, setConfirmClear] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const chatRef = useRef<HTMLDivElement>(null);
    // Initialize width depending on mobile vs desktop.
    const chatSizeRef = useRef({ width: typeof window !== 'undefined' && window.innerWidth < 640 ? 350 : 450, height: 550 });

    const minW = 320;
    const minH = 400;

    const handleResizeStart = (e: React.PointerEvent, edges: string[]) => {
        e.preventDefault();
        e.stopPropagation();

        document.body.style.userSelect = 'none';

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = chatSizeRef.current.width;
        const startH = chatSizeRef.current.height;
        const startX_m = x.get();
        const startY_m = y.get();

        const maxW = typeof window !== 'undefined' ? window.innerWidth * 0.9 : 800;
        const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.85 : 800;

        const handlePointerMove = (evt: PointerEvent) => {
            const dx = evt.clientX - startX;
            const dy = evt.clientY - startY;

            let newW = startW;
            let newH = startH;
            let newX = startX_m;
            let newY = startY_m;

            if (edges.includes('l')) {
                newW = Math.max(minW, Math.min(startW - dx, maxW));
            }
            if (edges.includes('r')) {
                newW = Math.max(minW, Math.min(startW + dx, maxW));
                const effDx = newW - startW;
                newX = startX_m + effDx;
            }
            if (edges.includes('t')) {
                newH = Math.max(minH, Math.min(startH - dy, maxH));
            }
            if (edges.includes('b')) {
                newH = Math.max(minH, Math.min(startH + dy, maxH));
                const effDy = newH - startH;
                newY = startY_m + effDy;
            }

            chatSizeRef.current = { width: newW, height: newH };
            if (chatRef.current) {
                chatRef.current.style.width = `${newW}px`;
                chatRef.current.style.height = `${newH}px`;
            }
            x.set(newX);
            y.set(newY);
        };

        const handlePointerUp = () => {
            document.body.style.userSelect = '';
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    const scrollToBottomSmart = (force = false) => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // Порог: скроллим только если пользователь находится у самого низа (до 150px вверх) или принудительно (force)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (force || isNearBottom) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: force ? 'auto' : 'smooth'
            });
        }
    };

    // Автоматическая подгонка высоты textarea под контент
    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [inputText]);

    // Клик на интерактивную подсказку-плашку
    const handleSuggestionClick = (text: string) => {
        setInputText(text);
        setTimeout(() => {
            inputRef.current?.focus();
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
            }
            // Выполняем принудительный скролл формы вниз
            scrollToBottomSmart(true);
        }, 50);
    };

    // Auto-save chat history when messages change and we are not generating
    useEffect(() => {
        if (!isGenerating && messages.length > 1) { // Has more than initial message
            if (!currentSessionId) {
                const newId = Date.now().toString();
                setCurrentSessionId(newId);
                const title = messages[1]?.text.slice(0, 30) + (messages[1]?.text.length > 30 ? '...' : '');
                setChatHistory(prev => [{ id: newId, title, messages, date: Date.now() }, ...prev]);
            } else {
                setChatHistory(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages, date: Date.now() } : s));
            }
        }
    }, [isGenerating, messages, currentSessionId, setChatHistory]);

    const handleNewChat = () => {
        if (isGenerating) handleStopGeneration();
        setMessages(DEFAULT_MESSAGES);
        setCurrentSessionId(null);
        setView('chat');
    };

    const loadSession = (session: ChatSession) => {
        if (isGenerating) handleStopGeneration();
        setMessages(session.messages);
        setCurrentSessionId(session.id);
        setView('chat');
    };

    const deleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setChatHistory(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) {
            handleNewChat();
        }
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottomSmart(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            // Если чат закрывается, безопасно отменяем генерацию
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
                setIsGenerating(false);
                setIsTyping(false);
            }
        }
    }, [isOpen]);

    // Прокрутка при изменении сообщений в процессе стриминга (умный скролл)
    useEffect(() => {
        if (isOpen) {
            scrollToBottomSmart(false);
        }
    }, [messages, isTyping, isOpen]);

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsGenerating(false);
            setIsTyping(false);
        }
    };

    const handleSend = async () => {
        const userText = inputText.trim();
        if (!userText && !attachedImage) return;

        // Если уже есть текущий запрос, отменяем его принудительно - предотвращение Race Conditions
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsGenerating(false);
        }

        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(7);
        const userMsg: Message = { id: newId, text: userText, sender: 'user', image: attachedImage || undefined };
        
        setMessages(prev => [...prev, userMsg]);
        setTimeout(() => scrollToBottomSmart(true), 50);

        const imgToSend = attachedImage; // Capture before clearing state
        setInputText('');
        setAttachedImage(null);
        setIsTyping(true); // Включаем "Анализ..." (поиск контекста)
        setIsGenerating(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const aiId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + 'ai';
        // Инициализируем пустое сообщение для стриминга
        setMessages(prev => [...prev, { id: aiId, text: '', sender: 'ai' }]);

        try {
            let aiText = '';
            
            await fetchStreamingChat(userText, imgToSend || undefined, messages, controller.signal, (chunkText) => {
                // Как только получаем первый чанк, убираем индикатор ожидания
                setIsTyping(false);

                aiText += chunkText;
                setMessages(prev => 
                    prev.map(msg => msg.id === aiId ? { ...msg, text: aiText } : msg)
                );
            });

        } catch (error: any) {
            if (error.name === 'AbortError' || controller.signal.aborted) {
                console.log('Генерация отменена пользователем');
                setMessages(prev => prev.map(msg => msg.id === aiId ? { ...msg, text: msg.text + '\n\n🛑 *Остановлено*' } : msg));
            } else {
                console.error('Ошибка генерации:', error);
                setMessages(prev => prev.map(msg => msg.id === aiId ? { ...msg, text: msg.text + '\n\n❌ *(Ошибка при получении ответа)*' } : msg));
            }
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
                setIsGenerating(false);
            }
            setIsTyping(false);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <motion.div 
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            style={{ x, y, touchAction: 'none' }}
            className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3"
        >
            {isOpen && (
                <div 
                    ref={chatRef}
                    style={{ width: chatSizeRef.current.width, height: chatSizeRef.current.height }}
                    className="relative bg-white/90 dark:bg-[#121217]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300"
                >
                    {/* Resize handles */}
                    <div className="absolute top-0 left-0 w-full h-1 cursor-ns-resize z-50 hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors" onPointerDown={(e) => handleResizeStart(e, ['t'])} />
                    <div className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize z-50 hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors" onPointerDown={(e) => handleResizeStart(e, ['b'])} />
                    <div className="absolute top-0 left-0 w-1 h-full cursor-ew-resize z-50 hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors" onPointerDown={(e) => handleResizeStart(e, ['l'])} />
                    <div className="absolute top-0 right-0 w-1 h-full cursor-ew-resize z-50 hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors" onPointerDown={(e) => handleResizeStart(e, ['r'])} />
                    <div className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[51]" onPointerDown={(e) => handleResizeStart(e, ['t', 'l'])} />
                    <div className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[51]" onPointerDown={(e) => handleResizeStart(e, ['t', 'r'])} />
                    <div className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[51]" onPointerDown={(e) => handleResizeStart(e, ['b', 'l'])} />
                    <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[51]" onPointerDown={(e) => handleResizeStart(e, ['b', 'r'])} />

                    <div 
                        onPointerDown={(e) => dragControls.start(e)}
                        className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center text-white shrink-0 cursor-grab active:cursor-grabbing select-none"
                    >
                        <div className="flex items-center gap-2">
                            <Bot size={20} />
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">ИИ Ассистент</span>
                                {isOnline ? (
                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1.5 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                        онлайн
                                    </span>
                                ) : (
                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 flex items-center gap-1.5 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                        офлайн
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                title="Новый чат"
                                onPointerDown={(e) => e.stopPropagation()} 
                                onClick={handleNewChat} 
                                className="text-white/70 hover:text-white transition-colors p-1.5 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer"
                            >
                                <Plus size={16} />
                            </button>
                            <button 
                                title="История чатов"
                                onPointerDown={(e) => e.stopPropagation()} 
                                onClick={() => setView(view === 'history' ? 'chat' : 'history')} 
                                className={`text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/20 rounded-xl cursor-pointer ${view === 'history' ? 'bg-white/20 text-white' : 'bg-white/10'}`}
                            >
                                <Clock size={16} />
                            </button>
                            <div className="w-px h-4 bg-white/20 mx-1"></div>
                            <button 
                                title="Закрыть"
                                onPointerDown={(e) => e.stopPropagation()} 
                                onClick={() => setIsOpen(false)} 
                                className="text-white/70 hover:text-white transition-colors p-1.5 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                    
                    {view === 'history' ? (
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-black/20" onPointerDown={(e) => e.stopPropagation()}>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">История чатов</h3>
                                {chatHistory.length > 0 && (
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        {confirmClear ? (
                                            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                                                <button 
                                                    onClick={() => {
                                                        setChatHistory([]);
                                                        handleNewChat();
                                                        setConfirmClear(false);
                                                    }}
                                                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20 active:scale-95 transition-all"
                                                >
                                                    Да, удалить
                                                </button>
                                                <button 
                                                    onClick={() => setConfirmClear(false)}
                                                    className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg active:scale-95 transition-all"
                                                >
                                                    Нет
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setConfirmClear(true)}
                                                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                                            >
                                                <Trash2 size={12} />
                                                <span>Очистить всё</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {chatHistory.length === 0 ? (
                                <div className="text-center text-slate-500 mt-10 text-sm">
                                    История пуста. Начните новый диалог!
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {chatHistory.map(session => (
                                        <div 
                                            key={session.id} 
                                            onClick={() => loadSession(session)}
                                            className={`p-3 rounded-xl cursor-pointer border transition-colors relative group flex items-start justify-between ${currentSessionId === session.id ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30' : 'bg-white dark:bg-[#1a1a24] border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30'}`}
                                        >
                                            <div className="pr-6">
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-1 break-all">{session.title}</div>
                                                <div className="text-xs text-slate-500 mt-1">{new Date(session.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })} • {session.messages.length} сообщ.</div>
                                            </div>
                                            <button 
                                                onClick={(e) => deleteSession(e, session.id)} 
                                                title="Удалить чат"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/20 dark:bg-black/5" onPointerDown={(e) => e.stopPropagation()}>
                            {messages.map((msg, index) => (
                                <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-2 max-w-[90%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.sender === 'user' ? 'bg-blue-500' : 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'}`}>
                                            {msg.sender === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} />}
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm break-words whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}>
                                            {msg.image && (
                                                <img src={msg.image} className="max-w-full rounded-lg mb-2 shadow-sm" alt="Снимок экрана пользователя" />
                                            )}
                                            {msg.sender === 'user' ? (
                                                msg.text
                                            ) : (
                                                <div className="markdown-body">
                                                    {/* Интеграция markdown и math */}
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={{
                                                            p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                                            ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                                            ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                                            li: ({children}) => <li className="mb-1">{children}</li>,
                                                            table: ({children}) => <div className="overflow-x-auto my-3"><table className="border-collapse border border-slate-300 dark:border-slate-600 text-xs w-full">{children}</table></div>,
                                                            th: ({children}) => <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 bg-slate-100 dark:bg-slate-800/50 font-semibold">{children}</th>,
                                                            td: ({children}) => <td className="border border-slate-300 dark:border-slate-600 px-3 py-2">{children}</td>,
                                                            a: ({children, href}) => <a href={href} className="text-blue-500 hover:underline">{children}</a>,
                                                            pre: ({children}) => <PreWithCopy>{children}</PreWithCopy>,
                                                            code: ({children, className}) => {
                                                                return <code className={`${className || ''} ${!className ? 'bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[0.9em] font-mono' : ''}`}>{children}</code>;
                                                            }
                                                        }}
                                                    >
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                    {/* Пульсирующий курсор при потоковой генерации */}
                                                    {isGenerating && index === messages.length - 1 && !isTyping && (
                                                        <span className="inline-block w-2 h-4 bg-indigo-500/50 animate-pulse align-middle ml-1 rounded-sm"></span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {messages.length <= 1 && (
                                <div className="mt-4 px-1 pb-2 animate-in fade-in duration-500 slide-in-from-bottom-2">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-3 pl-1 uppercase tracking-wider">Рекомендуемые вопросы Клиентов:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SUGGESTIONS.map((sug, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSuggestionClick(sug.text)}
                                                className="text-left p-3 rounded-2xl bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-blue-50/30 dark:hover:bg-blue-500/10 text-xs text-slate-800 dark:text-slate-200 transition-all shadow-sm hover:shadow active:scale-[0.97] cursor-pointer font-medium leading-normal flex flex-col justify-between gap-1 group/sug"
                                            >
                                                <span className="group-hover/sug:text-blue-600 dark:group-hover/sug:text-blue-400 transition-colors font-semibold text-slate-900 dark:text-slate-100">{sug.label}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal line-clamp-1">{sug.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {isTyping && (
                                <div className="flex w-full justify-start animate-in fade-in duration-300">
                                    <div className="flex gap-2 max-w-[85%] flex-row">
                                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-500 dark:text-indigo-400">
                                            <Bot size={16} className="animate-pulse" />
                                        </div>
                                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/10 text-slate-500 flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="text-xs font-medium">Анализ запроса...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    {view === 'chat' && (
                        <div className="p-3 bg-transparent shrink-0 flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
                            {attachedImage && (
                                <div className="relative animate-in fade-in zoom-in-95 self-start mb-2 ml-1">
                                    <img src={attachedImage} alt="Скриншот экрана" className="h-20 w-auto rounded-lg border border-black/10 dark:border-white/10 shadow-sm" />
                                    <button 
                                        onClick={() => setAttachedImage(null)}
                                        className="absolute -top-2 -right-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-black/80 dark:hover:bg-black dark:text-slate-300 rounded-full p-1 border border-black/10 dark:border-white/10 shadow-sm transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}
                            <div className="relative flex gap-2 items-end">
                                <button 
                                    onClick={() => { setIsOpen(false); setIsScreenshotMode(true); }}
                                    title="Сделать снимок экрана"
                                    className="shrink-0 w-12 h-12 mb-0 flex items-center justify-center bg-black/5 dark:bg-[#1a1a24]/50 border border-black/10 dark:border-white/10 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 text-slate-500 rounded-2xl transition-all shadow-sm"
                                >
                                    <Crop size={20} />
                                </button>
                                <textarea
                                    ref={inputRef}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Спросите меня о чем-угодно..."
                                    rows={1}
                                    className="flex-1 max-h-32 min-h-[48px] bg-black/5 dark:bg-[#1a1a24]/50 border border-black/10 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none slim-scrollbar"
                                />
                                {isGenerating ? (
                                    <button 
                                        onClick={handleStopGeneration}
                                        title="Остановить генерацию"
                                        className="shrink-0 w-12 h-12 mb-0 flex items-center justify-center bg-slate-200 dark:bg-white/10 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-500 rounded-2xl transition-colors shadow-sm"
                                    >
                                        <StopCircle size={22} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSend}
                                        disabled={!inputText.trim() && !attachedImage}
                                        title="Отправить запрос"
                                        className="shrink-0 w-12 h-12 mb-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-white/10 disabled:text-slate-400 text-white rounded-2xl transition-colors shadow-sm"
                                    >
                                        <Send size={20} className="-ml-0.5 mt-0.5" />
                                    </button>
                                )}
                            </div>
                            <div className="text-[10px] flex items-center justify-center mt-1 text-slate-400 dark:text-slate-500 font-medium tracking-wide w-full">
                                <CornerDownLeft size={10} className="mr-1 opacity-50"/> Нажмите Enter для отправки
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex items-center gap-1 bg-white/60 dark:bg-[#1a1a24]/80 backdrop-blur-xl p-1.5 rounded-full shadow-lg border border-black/5 dark:border-white/5">
                <div 
                    onPointerDown={(e) => dragControls.start(e)}
                    className="p-3 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                    <GripHorizontal size={22} />
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
                >
                    {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
                </button>
            </div>

            {isScreenshotMode && (
                <ScreenshotOverlay 
                    onCapture={(base64) => {
                        setAttachedImage(base64);
                        setIsScreenshotMode(false);
                        setIsOpen(true);
                    }}
                    onCancel={() => {
                        setIsScreenshotMode(false);
                        setIsOpen(true);
                    }}
                />
            )}
        </motion.div>
    );
};

