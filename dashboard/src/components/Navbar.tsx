import { Activity, ChevronRight, LayoutDashboard, LogIn, LogOut, Terminal, Trophy } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

export const Navbar = () => {
    const { user, botInfo } = useAuth();
    const location = useLocation();

    const navLinks = [
        { name: 'Servidores', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Comandos', path: '/commands', icon: Terminal },
        { name: 'Rankings', path: '/leaderboard', icon: Trophy },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-[#070809]/80 backdrop-blur-xl z-[100] px-8 flex items-center justify-between">
            <div className="flex items-center gap-12">
                {/* LOGO */}
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
                        {botInfo.avatar ? (
                            <img src={botInfo.avatar} className="w-full h-full object-cover" alt="Bot Avatar" />
                        ) : (
                            <Activity className="w-6 h-6 text-primary" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black italic tracking-tighter leading-none uppercase">
                            <span className="text-white">{(botInfo.username || 'DARK BOT').split(' ')[0]}</span>
                            <span className="text-primary ml-1">{(botInfo.username || 'DARK BOT').split(' ').slice(1).join(' ')}</span>
                        </span>
                    </div>
                </Link>

                {/* LINKS */}
                <div className="hidden lg:flex items-center gap-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={cn(
                                "px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-3",
                                location.pathname === link.path
                                    ? "bg-white/[0.08] text-white shadow-lg border border-white/10"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5 hover:translate-y-[-1px]"
                            )}
                        >
                            <link.icon className={cn("w-4 h-4", location.pathname === link.path ? "text-primary" : "text-muted-foreground")} />
                            {link.name}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-6 pr-6 border-r border-white/5">
                    <a href="https://discord.gg/dark" target="_blank" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
                        Soporte
                    </a>
                    <a href="#" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
                        Premium
                    </a>
                </div>

                {user ? (
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="flex items-center gap-4 group bg-white/5 p-1.5 pr-5 rounded-2xl border border-white/10 hover:border-primary/30 transition-all">
                            <img
                                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                                className="w-10 h-10 rounded-xl border border-white/10 group-hover:scale-105 transition-transform"
                                alt=""
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white">{user.username}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-primary font-black uppercase tracking-wider">Dashboard</span>
                                    <ChevronRight className="w-3 h-3 text-primary" />
                                </div>
                            </div>
                        </Link>
                        <button
                            onClick={() => api.get('/auth/logout').then(() => window.location.href = '/')}
                            className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95 group"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                ) : (
                    <a href="/api/auth/login" className="px-8 py-3 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <LogIn className="w-4 h-4" /> Iniciar Sesión
                    </a>
                )}
            </div>
        </nav>
    );
};
