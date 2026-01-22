import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, Appointment, DailySchedule, PartnerSchedule, UserProfile, THEMES, Theme } from '../types';
import { loadUserData, saveUserData } from '../services/persistence';
import { ToastMessage, ToastType } from '../components/ui/Toast';

interface AppContextType {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    schedule: DailySchedule | null;
    setSchedule: React.Dispatch<React.SetStateAction<DailySchedule | null>>;
    partnerSchedule: PartnerSchedule;
    setPartnerSchedule: React.Dispatch<React.SetStateAction<PartnerSchedule>>;
    userProfile: UserProfile;
    setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
    theme: Theme;
    setThemeId: (id: string) => void;
    userId: string;
    isLoading: boolean;
    toasts: ToastMessage[];
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [schedule, setSchedule] = useState<DailySchedule | null>(null);
    const [partnerSchedule, setPartnerSchedule] = useState<PartnerSchedule>({ isWorking: false, startTime: '09:00', endTime: '17:00' });
    const [userProfile, setUserProfile] = useState<UserProfile>({ xp: 120, level: 1, streakDays: 3, name: 'Eric' });
    const [activeThemeId, setActiveThemeId] = useState<string>('default');
    const [userId, setUserId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const initApp = async () => {
            let storedId = localStorage.getItem('focus_forge_user_id');
            if (!storedId) {
                storedId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('focus_forge_user_id', storedId);
            }
            setUserId(storedId);
            const data = await loadUserData(storedId);
            if (data) {
                if (data.tasks) setTasks(data.tasks);
                if ((data as any).appointments) setAppointments((data as any).appointments);
                if (data.userProfile) setUserProfile(prev => ({ ...prev, ...data.userProfile }));
                if (data.schedule) setSchedule(data.schedule);
                if (data.partnerSchedule) setPartnerSchedule(data.partnerSchedule);
                if (data.savedThemeId) setActiveThemeId(data.savedThemeId);
            }
            setIsLoading(false);
        };
        initApp();
    }, []);

    useEffect(() => {
        if (!userId || isLoading) return;
        const saveData = async () => {
            await saveUserData(userId, {
                tasks,
                userProfile,
                schedule,
                partnerSchedule,
                savedThemeId: activeThemeId,
                appointments
            } as any);
        };
        const timeoutId = setTimeout(saveData, 2000);
        return () => clearTimeout(timeoutId);
    }, [tasks, userProfile, schedule, partnerSchedule, activeThemeId, userId, isLoading, appointments]);

    const addToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const theme = THEMES[activeThemeId] || THEMES.default;

    return (
        <AppContext.Provider value={{
            tasks, setTasks,
            appointments, setAppointments,
            schedule, setSchedule,
            partnerSchedule, setPartnerSchedule,
            userProfile, setUserProfile,
            theme, setThemeId: setActiveThemeId,
            userId,
            isLoading,
            toasts, addToast, removeToast
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
};
