import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHaptic = () => {
    const trigger = useCallback((type: HapticType = 'medium') => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            switch (type) {
                case 'light':
                    navigator.vibrate(10);
                    break;
                case 'medium':
                    navigator.vibrate(20);
                    break;
                case 'heavy':
                    navigator.vibrate(40);
                    break;
                case 'success':
                    navigator.vibrate([10, 30, 10]);
                    break;
                case 'warning':
                    navigator.vibrate([30, 50, 10]);
                    break;
                case 'error':
                    navigator.vibrate([50, 50, 50]);
                    break;
            }
        }
    }, []);

    return { trigger };
};
