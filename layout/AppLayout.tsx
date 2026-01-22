import React from 'react';
import MobileNav from './MobileNav';
import DesktopSidebar from './DesktopSidebar';
import { AppView, UserProfile } from '../types';

interface AppLayoutProps {
    children: React.ReactNode;
    currentView: AppView;
    onViewChange: (view: AppView) => void;
    userProfile: UserProfile;
    onAddTask: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    currentView,
    onViewChange,
    userProfile,
    onAddTask
}) => {
    return (
        <div className="bg-brand-base h-screen w-screen flex overflow-hidden">
            {/* Sidebar for Desktop */}
            <DesktopSidebar
                currentView={currentView}
                onViewChange={onViewChange}
                userProfile={userProfile}
            />

            {/* Main Content */}
            <main className="flex-1 h-full overflow-y-auto relative z-10 pb-20 md:pb-0">
                <div className="p-4 md:p-12 max-w-7xl mx-auto h-full">
                    {children}
                </div>
            </main>

            {/* Mobile Nav */}
            <MobileNav
                currentView={currentView}
                onViewChange={onViewChange}
                onAddTask={onAddTask}
            />
        </div>
    );
};

export default AppLayout;
