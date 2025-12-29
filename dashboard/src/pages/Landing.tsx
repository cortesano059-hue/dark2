import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Users, Globe, ArrowRight, MessageSquare, Shield, Loader2, Trophy, Activity, Terminal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const Landing = () => {
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState({ servers: 0, users: 0, commands: 0 });
    const [botInfo, setBotInfo] = useState({ username: 'Dark Bot', avatar: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resStats, resBot] = await Promise.all([
                    api.get('/stats'),
                    api.get('/bot/info').catch(() => ({ data: { username: 'Dark Bot', avatar: '/bot-icon.png' } }))
                ]);

                setStats(resStats.data);
                setBotInfo(resBot.data);
            } catch (err) {
                console.error('Failed to fetch landing data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (authLoading || loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

    return (
        <>

            <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
                {/* HERO SECTION */}
                <div className="text-center space-y-10 mb-24 relative">
                    {/* BOT ICON */}
                    <div className="relative inline-block animate-in fade-in zoom-in duration-1000">
                        <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full" />
                        <img
                            src={botInfo.avatar || "/bot-icon.png"}
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full relative z-10 border-4 border-white/10 shadow-2xl transition-transform duration-500 hover:scale-105 cursor-pointer object-cover"
                            alt="Bot Avatar"
                            onError={(e) => (e.currentTarget.src = "/bot-icon.png")}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-widest">
                            <Zap className="w-3.5 h-3.5 fill-current" /> Estación Central v2.5
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic">
                            Bienvenido a <span className="premium-gradient-text">{botInfo.username.toUpperCase()}</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-foreground/40 font-medium max-w-2xl mx-auto leading-relaxed">
                            Gestiona tu economía y servidor fácilmente.<br />
                            Roles, dinero y mucho más desde un solo lugar.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in slide-in-from-bottom-16 duration-700 delay-200">
                        <Link to="/commands" className="px-12 py-5 bg-white/[0.05] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-white/[0.1] border border-white/5 active:scale-95 flex items-center gap-3">
                            <Terminal className="w-5 h-5" /> Lista de Comandos
                        </Link>
                        {!user ? (
                            <>
                                <a href="/api/auth/login" className="px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10 flex items-center gap-3">
                                    <Zap className="w-5 h-5 fill-current" /> Iniciar Sesión con Discord
                                </a>
                            </>
                        ) : (
                            <>
                                <Link to="/dashboard" className="px-12 py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20 flex items-center gap-3">
                                    Entrar al Dashboard <ArrowRight className="w-5 h-5" />
                                </Link>
                            </>
                        )}
                        <a href="https://discord.gg/dark" target="_blank" className="px-12 py-5 bg-secondary text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-muted border border-white/5">
                            Servidor Soporte
                        </a>
                    </div>
                </div>


                {/* GLOBAL STATS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { label: 'Servidores Globales', value: stats.servers, icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/5' },
                        { label: 'Ciudadanos Totales', value: stats.users, icon: Users, color: 'text-primary', bg: 'bg-primary/5' },
                        { label: 'Comandos Activos', value: stats.commands, icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                        { label: 'Protocolo de Seguridad', value: 'v2.5', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/5' }
                    ].map((stat, i) => (
                        <div key={i} className="landing-glass p-8 rounded-[2rem] group hover:-translate-y-2 transition-all duration-500 cursor-default">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:rotate-12", stat.bg, stat.color)}>
                                <stat.icon className="w-7 h-7" />
                            </div>
                            <h4 className="text-4xl font-black text-white tracking-tighter mb-1">{stat.value.toLocaleString()}</h4>
                            <p className="text-[10px] font-black uppercase text-foreground/40 tracking-[0.2em]">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* FOOTER PREVIEW */}
                <div className="mt-32 pt-16 border-t border-white/5 text-center space-y-6">
                    <p className="text-foreground/20 font-black uppercase tracking-[0.4em] text-xs">Desarrollado con pasión para Dark RP Network</p>
                    <div className="flex justify-center gap-10 opacity-20">
                        <Activity className="w-5 h-5" />
                        <Trophy className="w-5 h-5" />
                        <Shield className="w-5 h-5" />
                    </div>
                </div>
            </div>
        </>
    );
};
