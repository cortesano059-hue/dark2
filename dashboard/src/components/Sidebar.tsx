import {
    Activity,
    Backpack,
    ChevronLeft,
    Landmark,
    LayoutDashboard,
    Settings,
    ShoppingBag,
    Star,
    Terminal,
    Trophy,
    User,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    isAdmin?: boolean;
}

export const Sidebar = () => {
    const { id: activeGuildId } = useParams<{ id: string }>();
    const { user: authUser, loading } = useAuth();
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const location = useLocation();

    useEffect(() => {
        if (!authUser) return;
        api.get('/guilds')
            .then(res => setGuilds(res.data.active || []))
            .catch(err => console.error(err));
    }, [authUser]);

    if (loading || !authUser) return null;

    const activeGuild = guilds.find(g => g.id === activeGuildId);

    return (
        <div className="flex fixed left-0 top-20 bottom-0 z-50 overflow-hidden">
            {/* SERVER RAIL (72px) */}
            <div className="w-[72px] h-full bg-[#070809]/40 backdrop-blur-2xl flex flex-col items-center pt-2 pb-4 gap-3 border-r border-white/5 overflow-y-auto no-scrollbar">
                {/* RETURN TO LANDING */}
                <Link to="/" className="server-rail-item text-white/40 hover:text-white transition-colors group relative">
                    <ChevronLeft className="w-5 h-5" />
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#000] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap shadow-2xl z-50">Inicio</div>
                </Link>

                <div className="w-8 h-[2px] bg-white/5 rounded-full" />

                <Link to="/dashboard" className={cn(
                    "server-rail-item bg-white/5 text-white/40 hover:bg-primary hover:text-white group relative",
                    !activeGuildId && location.pathname.includes('/dashboard') && "server-rail-active bg-primary text-white"
                )}>
                    <Zap className="w-5 h-5 fill-current" />
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#000] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap shadow-2xl z-50">Hub Central</div>
                </Link>

                <div className="w-8 h-[2px] bg-white/5 rounded-full" />

                {/* SERVERS LIST */}
                {guilds.map(guild => (
                    <Link
                        key={guild.id}
                        to={`/stats/${guild.id}`}
                        className={cn(
                            "server-rail-item group relative",
                            activeGuildId === guild.id && "server-rail-active"
                        )}
                    >
                        {guild.icon ? (
                            <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`} className="w-full h-full object-cover" alt={guild.name} />
                        ) : (
                            <div className="w-full h-full bg-background flex items-center justify-center font-bold text-xs">
                                {guild.name.charAt(0)}
                            </div>
                        )}

                        {/* TOOLTIP */}
                        <div className="absolute left-[80px] px-3 py-1.5 bg-[#000] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap shadow-2xl z-50">
                            {guild.name}
                        </div>
                    </Link>
                ))}

                {/* ADD BOT */}
                <a href="https://discord.com" target="_blank" className="server-rail-item bg-white/5 text-emerald-500 hover:bg-emerald-500 hover:text-white mt-auto group relative">
                    <Star className="w-5 h-5" />
                    <div className="absolute left-[80px] px-3 py-1.5 bg-[#000] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap shadow-2xl z-50">Añadir Bot</div>
                </a>
            </div>

            {/* MODULE SIDEBAR (240px) */}
            <aside className="w-[240px] h-full bg-[#070809]/60 backdrop-blur-xl flex flex-col border-r border-white/5">
                <div className="flex-1 overflow-y-auto pt-2 pb-8">
                    {!activeGuildId ? (
                        /* GLOBAL MODULES */
                        <div className="space-y-1 px-4">
                            <p className="px-3 text-[10px] font-black uppercase text-foreground/20 mb-4 tracking-[0.25em]">Global</p>
                            <NavLink to="/dashboard" end className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                <LayoutDashboard className="w-4 h-4" /> Servidores
                            </NavLink>
                            <NavLink to="/commands" className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                <Terminal className="w-4 h-4" /> Comandos
                            </NavLink>
                            <NavLink to="/leaderboard" className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                <Trophy className="w-4 h-4" /> Rankings
                            </NavLink>
                        </div>
                    ) : (
                        /* GUILD MODULES */
                        <div className="space-y-8 px-4">
                            <div className="space-y-1">
                                <p className="px-3 text-[10px] font-black uppercase text-foreground/20 mb-4 tracking-[0.25em]">Servidor</p>

                                <NavLink to={`/profile/${activeGuildId}`} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                    <User className="w-4 h-4" /> Perfil
                                </NavLink>
                                <NavLink to={`/backpacks/${activeGuildId}`} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                    <Backpack className="w-4 h-4" /> Mochilas
                                </NavLink>
                                <NavLink to={`/shop/${activeGuildId}`} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                    <ShoppingBag className="w-4 h-4" /> Tienda
                                </NavLink>
                            </div>

                            {activeGuild?.isAdmin && (
                                <div className="space-y-1">
                                    <p className="px-3 text-[10px] font-black uppercase text-foreground/20 mb-4 tracking-[0.25em]">Administración</p>
                                    <NavLink to={`/stats/${activeGuildId}`} end className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                        <Activity className="w-4 h-4" /> Estadísticas
                                    </NavLink>


                                    <NavLink to={`/economy/${activeGuildId}`} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                        <Landmark className="w-4 h-4" /> Economía
                                    </NavLink>
                                    <NavLink to={`/catalog/${activeGuildId}`} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                        <ShoppingBag className="w-4 h-4" /> Catálogo
                                    </NavLink>
                                    <NavLink to={`/settings/${activeGuildId}`} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all", isActive ? "nav-active" : "text-foreground/40 hover:text-white hover:bg-white/5")}>
                                        <Settings className="w-4 h-4" /> Configuración
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </aside>
        </div>
    );
};
