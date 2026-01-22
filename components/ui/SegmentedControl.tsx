import React from 'react';
import { motion } from 'framer-motion';

interface SegmentedControlProps<T extends string> {
    options: T[];
    value: T;
    onChange: (value: T) => void;
    labels?: Record<T, React.ReactNode>;
}

function SegmentedControl<T extends string>({ options, value, onChange, labels }: SegmentedControlProps<T>) {
    return (
        <div className="flex bg-slate-100/80 p-1 rounded-xl relative isolate">
            {/* Active Indicator */}
            <motion.div
                layoutId="activeSegment"
                className="absolute bg-white shadow-sm rounded-lg top-1 bottom-1 z-0 pointer-events-none"
                initial={false}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{
                    width: `calc(${100 / options.length}% - 8px)`,
                    left: `${(options.indexOf(value) / options.length) * 100}%`,
                    marginLeft: '4px'
                }}
            />

            {options.map((option) => (
                <button
                    key={option}
                    onClick={() => onChange(option)}
                    className={`flex-1 relative z-10 py-1.5 text-xs font-bold transition-colors ${value === option ? 'text-brand-text' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    {labels ? labels[option] : option}
                </button>
            ))}
        </div>
    );
}

export default SegmentedControl;
