import { Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

interface Guild {
    id: string;
    name: string;
    icon: string | null;
}

export const Servers = () => {
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/guilds')
            .then(res => setGuilds(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="p-5 lg:p-8 space-y-6">
            <div>
                <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">Tus Servidores</h1>
                <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] mt-1">Selecciona un nodo de mando para su gestión.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {guilds.map((guild) => (
                    <div key={guild.id} className="elite-card p-4 rounded-xl flex items-center gap-5 group">
                        <div className="w-16 h-16 rounded-xl bg-accent overflow-hidden shadow-lg border border-white/5">
                            {guild.icon ? (
                                <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt={guild.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-xl text-foreground/20">
                                    {guild.name.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black text-white uppercase italic truncate group-hover:text-primary transition-colors">{guild.name}</h3>
                            <p className="text-[9px] text-foreground/20 font-black uppercase tracking-widest mt-0.5">ID: {guild.id}</p>

                            <div className="mt-3 flex gap-2">
                                <Link to={`/stats/${guild.id}`} className="flex-1 bg-white/5 hover:bg-primary hover:text-white border border-white/5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                                    <Settings className="w-3 h-3" />
                                    Gestionar
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}

                <a href="https://discord.com" target="_blank" className="p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 flex flex-col items-center justify-center gap-3 transition-all group opacity-60 hover:opacity-100 min-h-[112px]">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                        <Plus className="w-4 h-4 text-foreground/40 group-hover:text-primary" />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest">Añadir Nodo</p>
                </a>
            </div>
        </div>
    );
};
