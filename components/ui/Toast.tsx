import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const icons = {
        success: <CheckCircle size={20} className="text-emerald-500" />,
        error: <AlertCircle size={20} className="text-rose-500" />,
        info: <Info size={20} className="text-sky-500" />
    };

    const bgs = {
        success: 'bg-emerald-50 border-emerald-100',
        error: 'bg-rose-50 border-rose-100',
        info: 'bg-white border-slate-100'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            onDragEnd={(_, info) => {
                if (info.offset.x > 100) onDismiss(toast.id);
            }}
            className={`min-w-[320px] max-w-sm w-full p-4 rounded-2xl shadow-lg border flex items-center gap-3 touch-manipulation backdrop-blur-md ${bgs[toast.type]}`}
        >
            <div className="shrink-0">{icons[toast.type]}</div>
            <p className="flex-1 text-sm font-bold text-slate-700">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
            </button>
        </motion.div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => (
    <div className="fixed bottom-safe left-0 right-0 p-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <Toast toast={t} onDismiss={removeToast} />
                </div>
            ))}
        </AnimatePresence>
    </div>
);
