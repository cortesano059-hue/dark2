import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
    hideSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, hideSidebar = false }) => {
    const { user } = useAuth();
    const showSidebar = user && !hideSidebar;

    return (
        <div className="h-screen bg-[#070809] text-foreground selection:bg-primary/30 relative flex flex-col overflow-hidden">
            <Navbar />

            <div className="flex flex-1 overflow-hidden">
                {showSidebar && <Sidebar />}

                <main className={cn(
                    "flex-1 relative z-10 overflow-y-auto no-scrollbar pt-16",
                    showSidebar ? "ml-[312px]" : "ml-0"
                )}>
                    {/* GLOBAL BACKGROUND GLOWS */}
                    <div className="fixed inset-0 pointer-events-none">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
                    </div>

                    <div className="relative z-20 min-h-full flex flex-col">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
