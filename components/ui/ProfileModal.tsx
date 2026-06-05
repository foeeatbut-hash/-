import React, { useState, useEffect } from 'react';
import { X, User, Save, Upload, Plus, AlertTriangle, LogOut, Download, Lock, CheckCircle2, FileUp } from 'lucide-react';
import { GlassButton } from './Shared';

interface WorkspaceData {
    id: string;
    name: string;
    date: string;
    data: Record<string, string>;
}

interface UserProfile {
    login: string;
    password: string; // For mock client-side auth
    firstName: string;
    lastName: string;
    role: 'Teacher' | 'Student' | 'Engineer' | string;
    avatar: string;
    workspaces: WorkspaceData[];
}

export const ProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [currentUserLogin, setCurrentUserLogin] = useState<string | null>(null);

    const [isLoginView, setIsLoginView] = useState(true);
    const [loginStr, setLoginStr] = useState('');
    const [passwordStr, setPasswordStr] = useState('');
    const [regFirstName, setRegFirstName] = useState('');
    const [regLastName, setRegLastName] = useState('');
    const [regRole, setRegRole] = useState('Студент');
    
    const [newWorkspaceName, setNewWorkspaceName] = useState('');

    useEffect(() => {
        try {
            const usersStr = localStorage.getItem('hvac-auth-users');
            if (usersStr) setUsers(JSON.parse(usersStr));
            
            const curStr = localStorage.getItem('hvac-current-user');
            if (curStr) setCurrentUserLogin(curStr);
        } catch(e) {}
    }, [isOpen]);

    if (!isOpen) return null;

    const saveUsers = (u: UserProfile[]) => {
        setUsers(u);
        localStorage.setItem('hvac-auth-users', JSON.stringify(u));
    };

    const currentUser = users.find(u => u.login === currentUserLogin);

    const handleLogin = () => {
        const u = users.find(x => x.login === loginStr && x.password === passwordStr);
        if (u) {
            setCurrentUserLogin(u.login);
            localStorage.setItem('hvac-current-user', u.login);
            setLoginStr('');
            setPasswordStr('');
        } else {
            alert('Неверный логин или пароль');
        }
    };

    const handleRegister = () => {
        if (!loginStr || !passwordStr || !regFirstName || !regLastName) {
            alert('Заполните все поля');
            return;
        }
        if (users.some(x => x.login === loginStr)) {
            alert('Этот логин уже занят');
            return;
        }

        const newUser: UserProfile = {
            login: loginStr,
            password: passwordStr,
            firstName: regFirstName,
            lastName: regLastName,
            role: regRole,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${regFirstName} ${regLastName}&backgroundColor=0ea5e9,10b981&textColor=ffffff`,
            workspaces: []
        };

        saveUsers([...users, newUser]);
        setCurrentUserLogin(newUser.login);
        localStorage.setItem('hvac-current-user', newUser.login);
        setIsLoginView(true);
        setLoginStr('');
        setPasswordStr('');
    };

    const handleLogout = () => {
        setCurrentUserLogin(null);
        localStorage.removeItem('hvac-current-user');
    };

    const getCurrentStateData = () => {
        const wData: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('hvac-') && key !== 'hvac-auth-users' && key !== 'hvac-current-user') {
                wData[key] = localStorage.getItem(key) || '';
            }
        }
        return wData;
    };

    const saveWorkspace = () => {
        if (!currentUser) return;
        const name = newWorkspaceName.trim() || `Сохранение от ${new Date().toLocaleDateString()}`;
        
        const wData = getCurrentStateData();

        const newWs: WorkspaceData = {
            id: Date.now().toString(),
            name,
            date: new Date().toLocaleString(),
            data: wData
        };

        const updatedUsers = users.map(u => {
            if (u.login === currentUser.login) {
                return { ...u, workspaces: [newWs, ...u.workspaces] };
            }
            return u;
        });

        saveUsers(updatedUsers);
        setNewWorkspaceName('');
    };

    const loadWorkspace = (ws: WorkspaceData) => {
        if (!window.confirm('Загрузить конфигурацию в приложение? Текущие расчеты будут перезаписаны.')) return;
        
        // Remove old hvac- variables, so we completely replace state with the workspace data, 
        // to avoid merging with unrelated stuff? Or just overwrite. Let's overwrite and clear out variables that might not be in workspace, optionally.
        // For safety, just overwrite what is in workspace.
        Object.keys(ws.data).forEach(key => {
            localStorage.setItem(key, ws.data[key]);
        });
        
        window.location.reload();
    };

    const exportWorkspaceFile = (ws: WorkspaceData) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ws));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `hvac_workspace_${ws.name.replace(/\s+/g, '_')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const importWorkspaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const fileReader = new FileReader();
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (ev) => {
                if (ev.target && typeof ev.target.result === 'string') {
                    try {
                        const parsedWs = JSON.parse(ev.target.result) as WorkspaceData;
                        if (parsedWs.name && parsedWs.data) {
                            if (!currentUser) return;
                            const newWs = { ...parsedWs, id: Date.now().toString() };
                            const updatedUsers = users.map(u => {
                                if (u.login === currentUser.login) {
                                    return { ...u, workspaces: [newWs, ...u.workspaces] };
                                }
                                return u;
                            });
                            saveUsers(updatedUsers);
                            alert("Файл успешно импортирован в ваш профиль.");
                        } else {
                            alert("Неверный формат файла.");
                        }
                    } catch (err) {
                        alert("Ошибка чтения файла.");
                    }
                }
            };
            // Clear input so same file can be selected again
            e.target.value = '';
        }
    };

    const deleteWorkspace = (id: string) => {
        if (!currentUser) return;
        if (!window.confirm('Удалить эту запись?')) return;
        
        const updatedUsers = users.map(u => {
            if (u.login === currentUser.login) {
                return { ...u, workspaces: u.workspaces.filter(w => w.id !== id) };
            }
            return u;
        });
        saveUsers(updatedUsers);
    };

    const renderAuth = () => (
        <div className="flex justify-center items-center h-full p-6 animate-in fade-in duration-300">
            <div className="bg-white/80 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-xl backdrop-blur-xl">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex justify-center items-center">
                        <Lock size={32} />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-center mb-8 text-slate-800 dark:text-white">
                    {isLoginView ? 'Вход в аккаунт' : 'Регистрация'}
                </h2>

                <div className="space-y-4 mb-6">
                    {!isLoginView && (
                        <>
                            <input 
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Имя"
                                value={regFirstName} onChange={e => setRegFirstName(e.target.value)}
                            />
                            <input 
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Фамилия"
                                value={regLastName} onChange={e => setRegLastName(e.target.value)}
                            />
                            <select 
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
                                value={regRole} onChange={e => setRegRole(e.target.value)}
                            >
                                <option value="Студент">Студент</option>
                                <option value="Преподаватель">Преподаватель</option>
                                <option value="Инженер">Инженер</option>
                            </select>
                        </>
                    )}
                    <input 
                        className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Логин"
                        value={loginStr} onChange={e => setLoginStr(e.target.value)}
                    />
                    <input 
                        className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Пароль"
                        type="password"
                        value={passwordStr} onChange={e => setPasswordStr(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={isLoginView ? handleLogin : handleRegister}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        {isLoginView ? 'Войти' : 'Создать профиль'}
                    </button>
                    
                    <button 
                        onClick={() => setIsLoginView(!isLoginView)}
                        className="w-full py-3.5 rounded-xl border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        {isLoginView ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProfile = () => {
        if (!currentUser) return null;
        return (
            <div className="p-6 md:p-8 h-full flex flex-col md:flex-row gap-8 animate-in fade-in zoom-in-95 duration-300">
                {/* Left side: Profile Info */}
                <div className="w-full md:w-1/3 flex flex-col items-center p-6 bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-sm rounded-3xl h-max">
                    <div className="relative mb-6">
                        <img 
                            src={currentUser.avatar} 
                            alt="Avatar" 
                            className="w-32 h-32 rounded-full shadow-lg border-4 border-white dark:border-[#121217]"
                        />
                        <div className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full shadow-lg border-2 border-white dark:border-[#121217]">
                            <User size={16} />
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white text-center tracking-tight">
                        {currentUser.firstName} {currentUser.lastName}
                    </h3>
                    
                    <div className="mt-2 px-4 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {currentUser.role}
                    </div>

                    <div className="w-full border-t border-black/10 dark:border-white/10 my-6"></div>

                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                        <LogOut size={16} /> Выйти
                    </button>
                </div>

                {/* Right side: Workspaces */}
                <div className="w-full md:w-2/3 flex flex-col space-y-6 flex-1 overflow-hidden">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Save size={20} className="text-blue-500" />
                        Сохраненные проекты
                    </h3>

                    {/* Quick Save Box */}
                    <div className="flex flex-col sm:flex-row gap-2 relative bg-white/60 dark:bg-white/5 p-2 rounded-2xl border border-black/5 dark:border-white/5">
                        <input 
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            placeholder="Название нового сохранения..."
                            className="flex-1 bg-transparent px-4 py-2 font-medium text-sm focus:outline-none dark:text-white"
                        />
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={saveWorkspace}
                                className="flex-1 sm:flex-none justify-center bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                                title="Сохранить текущие расчеты в профиль"
                            >
                                <Save size={16} /> <span className="hidden sm:inline">В профиль</span>
                            </button>
                            <label className="flex-1 sm:flex-none justify-center bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer">
                                <FileUp size={16} /> <span className="hidden sm:inline">Из файла</span>
                                <input type="file" accept=".json" className="hidden" onChange={importWorkspaceFile} />
                            </label>
                        </div>
                    </div>

                    {/* Saved List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        {currentUser.workspaces.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                                <FileUp size={48} strokeWidth={1} />
                                <p className="font-medium text-sm">У вас пока нет сохраненных расчетов</p>
                            </div>
                        ) : (
                            currentUser.workspaces.map(ws => (
                                <div key={ws.id} className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-4 bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl group hover:shadow-md transition-all gap-3">
                                    <div className="w-full xl:w-auto overflow-hidden">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm md:text-base truncate">{ws.name}</h4>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                            {ws.date} • {Object.keys(ws.data).length} параметров
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full xl:w-auto">
                                        <button 
                                            onClick={() => loadWorkspace(ws)}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl font-bold text-xs transition-all"
                                            title="Применить этот расчет в приложении"
                                        >
                                            <Upload size={14} /> <span className="xl:hidden 2xl:inline">Загрузить</span>
                                        </button>
                                        <button 
                                            onClick={() => exportWorkspaceFile(ws)}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl font-bold text-xs transition-all"
                                            title="Скачать файл JSON на компьютер"
                                        >
                                            <Download size={14} /> <span className="xl:hidden 2xl:inline">Скачать</span>
                                        </button>
                                        <button 
                                            onClick={() => deleteWorkspace(ws.id)}
                                            className="px-3 py-2 bg-black/5 dark:bg-white/5 text-slate-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex-shrink-0"
                                            title="Удалить"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-sm p-2 md:p-8">
            <div className="bg-[#F5F5F7] dark:bg-[#0f0f13] w-full max-w-5xl h-full md:h-auto md:max-h-[85vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden border border-black/10 dark:border-white/10 flex flex-col relative">
                <div className="absolute top-4 right-4 z-10">
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex flex-col items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-slate-400 transition-colors backdrop-blur-md bg-white/50 dark:bg-black/50"
                    >
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {!currentUser ? renderAuth() : renderProfile()}
                </div>
            </div>
        </div>
    );
};
