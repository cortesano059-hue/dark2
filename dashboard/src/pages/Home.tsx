import { Activity, Hash, Loader2, Package, RefreshCw, Search, Shield, Users, Wallet, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';
import { socket } from '../utils/socket';

// ... (interfaces remain the same or can be ignored if they don't conflict, strict mode might complain but standard JS/TS mixed often works if types match enough. Ideally we rely on AuthContext types)

export const Home = () => {
    const { id: guildId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { botInfo, guilds, refreshGuilds, guildsError } = useAuth();

    // Local filtering state
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Dashboard Data State (Local)
    const [stats, setStats] = useState<Stats | null>(null);
    const [netStats, setNetStats] = useState<NetworkStats | null>(null);
    const [guildInfo, setGuildInfo] = useState<any>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [notFound, setNotFound] = useState(false);

    // Redirect Non-Admins to Shop
    useEffect(() => {
        if (guildId && guilds.active.length > 0) {
            const currentGuild = guilds.active.find(g => g.id === guildId);
            // If guild exists in our list (we have access) but we are NOT admin
            if (currentGuild && currentGuild.isAdmin === false) {
                navigate(`/profile/${guildId}`, { replace: true });
            }
        }
    }, [guildId, guilds.active, navigate]);

    const filteredActive = useMemo(() =>
        guilds.active.filter(g =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.id.toLowerCase().includes(search.toLowerCase())
        )
        , [guilds.active, search]);

    const filteredInviteable = useMemo(() =>
        guilds.inviteable.filter(g =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.id.toLowerCase().includes(search.toLowerCase())
        )
        , [guilds.inviteable, search]);

    const fetchDashboardData = async () => {
        if (!guildId) return;

        // Skip fetching stats if we are redirecting (optional optimization, but good practice)
        // actually we can't easily peek inside the effect, so we rely on the effect to bail us out.
        // But we should probably check here too to avoid 403s if backend enforces it.

        setLoading(true);
        setFetchError(false);
        setNotFound(false);
        try {
            const [statsRes, infoRes, activityRes] = await Promise.all([
                api.get(`/economy/stats/${guildId}`),
                api.get(`/guilds/${guildId}`),
                api.get(`/guilds/${guildId}/activity`)
            ]);
            setStats(statsRes.data);
            setGuildInfo(infoRes.data);
            setActivities(activityRes.data);

            // Fetch metrics separately to avoid blocking main content, add cache buster
            api.get(`/stats?_=${Date.now()}`).then(res => setNetStats(res.data)).catch(err => console.error("Stats API Error", err));
        } catch (err: any) {
            console.error("Dashboard Fetch Error:", err);
            if (err.response && err.response.status === 404) {
                setNotFound(true);
            } else {
                setFetchError(true);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (guildId) {
            fetchDashboardData();

            // Real-time Updates
            socket.connect();

            const handleActivityUpdate = (data: ActivityUpdatePayload) => {
                if (data.guildId === guildId) {
                    setActivities(prev => [data.activity, ...prev]);
                }
            };

            socket.on('activity_update', handleActivityUpdate);

            return () => {
                socket.off('activity_update', handleActivityUpdate);
                // Don't disconnect here if global socket is needed elsewhere, 
                // but usually fine to disconnect if scoped to this page
            };
        }
    }, [guildId]);

    // Safety Timeout: If loading takes too long (e.g. backend hang), force error state
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (loading && guildId) {
            timeout = setTimeout(() => {
                setFetchError(true);
                setLoading(false); // Stop the spinner
            }, 5000); // 5 seconds max wait
        }
        return () => clearTimeout(timeout);
    }, [loading, guildId]);

    const handleRefresh = async () => {
        setRefreshing(true);
        if (guildId) {
            await fetchDashboardData();
        } else {
            await refreshGuilds();
        }
        setTimeout(() => setRefreshing(false), 500);
    };

    if (notFound && guildId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in">
                <div className="bg-amber-500/10 p-4 rounded-full">
                    <Shield className="w-10 h-10 text-amber-500" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">Servidor No Encontrado</h3>
                    <p className="text-xs text-foreground/40 mt-1">El Bot no está en este servidor o no tienes acceso.</p>
                </div>
                <Link
                    to="/servers"
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
                >
                    &lsaquo; Volver a la Lista
                </Link>
            </div>
        );
    }

    if (fetchError && guildId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in">
                <div className="bg-rose-500/10 p-4 rounded-full">
                    <Shield className="w-10 h-10 text-rose-500" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">Error de Conexión</h3>
                    <p className="text-xs text-foreground/40 mt-1">No se pudo establecer enlace con el servidor.</p>
                </div>
                <button
                    onClick={() => handleRefresh()}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
                >
                    <RefreshCw className="w-3 h-3" />
                    Reintentar
                </button>
            </div>
        );
    }

    if (loading && guildId) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

    if (!guildId) {
        if (guildsError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in">
                    <div className="bg-rose-500/10 p-4 rounded-full">
                        <Shield className="w-10 h-10 text-rose-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-black text-white uppercase tracking-widest">Error de Red Global</h3>
                        <p className="text-xs text-foreground/40 mt-1">No se pudo obtener la lista de servidores.</p>
                    </div>
                    <button
                        onClick={() => handleRefresh()}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
                    >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        Reintentar
                    </button>
                </div>
            );
        }

        return (
            <div className="p-5 lg:p-8 space-y-12 animate-in fade-in duration-700">
                {/* HEADER ROW */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#00aaff] tracking-[0.4em] mb-1 px-1 flex items-center gap-2">
                            <span className="text-lg leading-none">&rsaquo;</span>
                            Interconexión Central
                        </p>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase transition-all leading-none">
                            Selección de Servidor
                        </h1>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2 pl-1">
                            <Zap className="w-2.5 h-2.5 fill-current text-[#00aaff]" />
                            Servidores Activos
                        </p>
                    </div>

                    {/* SEARCH */}
                    <div className="w-full md:w-96 relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Filtrar servidor..."
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-14 pr-6 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/20 focus:bg-white/[0.05] transition-all italic text-white placeholder:text-foreground/10 shadow-2xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* CONTENT */}
                <div className="space-y-6">

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                        {filteredActive.map((guild) => (
                            <Link
                                key={guild.id}
                                to={`/stats/${guild.id}`}
                                className="group relative aspect-[16/10] bg-[#0c0e12] rounded-3xl border border-white/5 overflow-hidden transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-1"
                            >
                                {/* Background Image Blur */}
                                {guild.icon && (
                                    <div className="absolute inset-0 z-0">
                                        <img
                                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                                            className="w-full h-full object-cover blur-[3px] opacity-40 scale-110 transition-all duration-700"
                                            alt=""
                                        />
                                        <div className="absolute inset-0 bg-black/20" />
                                    </div>
                                )}

                                {/* Ambient Background Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 z-0" />

                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-6">
                                    <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-white shadow-2xl group-hover:scale-110 transition-transform duration-500 relative">
                                        {guild.icon ? (
                                            <img
                                                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                                                className="w-full h-full object-cover"
                                                alt={guild.name}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-accent flex items-center justify-center font-black text-2xl text-foreground/20 uppercase">
                                                {guild.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors text-center w-full truncate px-4">
                                        {guild.name}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* INVITEABLE SERVERS */}
                {filteredInviteable.length > 0 && (
                    <div className="mt-32 space-y-12">
                        <div className="text-center space-y-3">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic mb-1">
                                Invitar {botInfo?.username || 'Dark Bot'} a tu servidor
                            </p>
                            <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {filteredInviteable.map((guild) => (
                                <a
                                    key={guild.id}
                                    href={`https://discord.com/api/oauth2/authorize?client_id=${botInfo?.id}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}&disable_guild_select=true`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative aspect-[16/10] bg-[#0c0e12]/50 rounded-3xl border border-white/5 overflow-hidden transition-all duration-500 hover:border-emerald-500/50 hover:shadow-[0_0_50px_rgba(16,185,129,0.15)] hover:-translate-y-1 grayscale hover:grayscale-0"
                                >
                                    {/* Background Image Blur */}
                                    {guild.icon && (
                                        <div className="absolute inset-0 z-0">
                                            <img
                                                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                                                className="w-full h-full object-cover blur-[3px] opacity-25 scale-110 transition-all duration-700"
                                                alt=""
                                            />
                                            <div className="absolute inset-0 bg-black/20" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-6">
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-white/20 group-hover:border-white shadow-2xl group-hover:scale-110 transition-all duration-500 relative">
                                            {guild.icon ? (
                                                <img
                                                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                                                    className="w-full h-full object-cover"
                                                    alt={guild.name}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-accent flex items-center justify-center font-black text-xl text-foreground/20">
                                                    {guild.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest group-hover:text-white transition-colors text-center w-full truncate px-4">
                                            {guild.name}
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-5 lg:p-8 space-y-10 animate-in fade-in duration-700">
            {/* GUILD DASHBOARD HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative z-10 skew-x-[-2deg] bg-[#0c0e12]">
                        {guildInfo?.guild?.icon ? (
                            <img src={`https://cdn.discordapp.com/icons/${guildInfo.guild.id}/${guildInfo.guild.icon}.png?size=128`} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full bg-accent flex items-center justify-center font-black text-xl">{guildInfo?.guild?.name?.charAt(0)}</div>
                        )}
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-20" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 text-[#00aaff] mb-1">
                            <Shield className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] italic">Sector Operativo</span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase italic">
                            {guildInfo?.guild?.name || 'Cargando Estación...'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/[0.02] border border-white/5 px-5 py-3 rounded-2xl flex items-center gap-5 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
                            <span className="text-[9px] font-black text-white tracking-[0.2em] uppercase">Estación Activa</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <span className="text-[10px] font-mono text-[#00aaff] font-bold tracking-tight">{guildInfo?.config?.prefix || '!'} PREFIJO GLOBAL</span>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="p-3 rounded-2xl bg-white/5 hover:bg-primary/20 text-white/30 hover:text-primary transition-all group border border-white/5 hover:border-primary/30"
                        title="Recargar Datos"
                        disabled={refreshing}
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-primary' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>
            </div>

            {/* TOP METRICS ROW (4 CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="elite-card p-6 rounded-[2.5rem] bg-[#0c0e12] border-white/5 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">+4.2%</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-1">Economía Total</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter uppercase">
                                {stats ? (
                                    stats.totalMoney >= 1000000
                                        ? `$${(stats.totalMoney / 1000000).toFixed(1)}M`
                                        : `$${stats.totalMoney.toLocaleString()}`
                                ) : '$0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="elite-card p-6 rounded-[2.5rem] bg-[#0c0e12] border-white/5 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner">
                                <Users className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20">ACTIVOS</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-1">Ciudadanos</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter uppercase">{guildInfo?.guild?.memberCount.toLocaleString() || '0'}</p>
                        </div>
                    </div>
                </div>

                <div className="elite-card p-6 rounded-[2.5rem] bg-[#0c0e12] border-white/5 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                                <Package className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 uppercase">Catálogo</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-1">Items Únicos</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter uppercase">
                                {stats ? stats.totalItems.toLocaleString() : '0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="elite-card p-6 rounded-[2.5rem] bg-[#0c0e12] border-white/5 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20 shadow-inner">
                                <Hash className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 uppercase">Online</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-1">Canales</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter uppercase">{guildInfo?.guild?.channelCount || '0'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="elite-card p-8 rounded-[2.5rem] bg-[#0c0e12] border-white/5 h-[450px] flex flex-col overflow-hidden">
                        <div className="mb-6 flex-shrink-0">
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-1">Registro de Operaciones</h2>
                            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em]">Transacciones filtradas en tiempo real</p>
                        </div>

                        <div className="space-y-6 overflow-y-auto flex-1 pr-2 no-scrollbar">
                            {activities.length > 0 ? (
                                activities.map((action) => (
                                    <div key={action.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/5 group-hover:border-primary/40 transition-all filter grayscale group-hover:grayscale-0">
                                                <img src={action.avatar} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black text-white uppercase tracking-tighter">{action.user}</p>
                                                <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.1em] mt-0.5">{action.type} • {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "text-lg font-black italic tracking-tighter",
                                                action.amount > 0 ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {action.amount > 0 ? '+' : ''}${action.amount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center space-y-3 opacity-10">
                                    <Activity className="w-12 h-12 mx-auto" />
                                    <p className="text-xs font-black uppercase tracking-[0.4em]">Sin telemetría de activos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="elite-card p-10 rounded-[2.5rem] bg-[#0c0e12] border-white/5 flex flex-col items-center text-center h-[450px]">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-8 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <Activity className="w-8 h-8 animate-pulse" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-4">Estado de Red</h2>


                        <div className="w-full space-y-8">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                                    <span className="text-foreground/20">API Latencia</span>
                                    <span className={cn(
                                        (netStats?.ping || 0) < 100 ? "text-emerald-500" : "text-amber-500"
                                    )}>{Math.round(netStats?.ping || 0)}ms</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000"
                                        style={{ width: `${Math.min(((netStats?.ping || 0) / 300) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                                    <span className="text-foreground/20">Uso RAM</span>
                                    <span className="text-blue-500">{((netStats?.ram || 0) / 1024 / 1024).toFixed(0)} MB</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000"
                                        style={{ width: `${Math.min(((netStats?.ram || 0) / 1024 / 1024 / 512) * 100, 100)}%` }} // Assumes 512MB roughly as visual max
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                                    <span className="text-foreground/20">Base de Datos</span>
                                    <span className="text-purple-500">{(netStats?.dbPing !== undefined && netStats?.dbPing !== -1) ? `${netStats?.dbPing}ms` : 'N/A'}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-1000"
                                        style={{ width: `${Math.min(((netStats?.dbPing || 0) / 100) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
