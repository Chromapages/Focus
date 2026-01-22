import React from 'react';
import { cn } from '../../lib/utils'; // Assuming you have a utils file, or I'll implement cn inline if needed

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`}
            {...props}
        />
    );
};

export default Skeleton;
