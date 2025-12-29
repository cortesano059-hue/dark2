import {
    Check,
    Info,
    Loader2,
    Save, Shield,
    Terminal
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

export const Config = () => {
    const { id: guildId } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [roles, setRoles] = useState<{ id: string, name: string, color: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get(`/guilds/${guildId}`),
            api.get(`/guilds/${guildId}/roles`)
        ])
            .then(([resGuild, resRoles]) => {
                setData(resGuild.data);
                setRoles(resRoles.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [guildId]);

    const handleSaveSettings = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/guilds/${guildId}/settings`, data.config);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (key: string, value: string) => {
        setData({
            ...data,
            config: { ...data.config, [key]: value }
        });
    };

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
    if (!data) return <div className="flex items-center justify-center min-h-[50vh] text-foreground/20 italic">No se pudo cargar la configuración del sistema.</div>;

    return (
        <div className="p-5 lg:p-8 space-y-10 animate-in fade-in duration-700">

            {/* HEADER */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                        <Terminal className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Panel Administrativo</h1>
                        <p className="text-white/40 font-medium italic">Gestión centralizada de infraestructura y servicios del bot</p>
                    </div>
                </div>
            </header>

            <div className="space-y-12">

                {/* GLOBAL STRUCTURE SECTION */}
                <div className="elite-card p-10 rounded-[2.5rem] relative overflow-hidden group transition-all hover:border-primary/20 bg-[#0d0f12] border-white/5 shadow-2xl">
                    <div className="flex items-center gap-5 relative z-10 mb-12">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner group-hover:scale-110 transition-transform"><Terminal className="w-7 h-7" /></div>
                        <div>
                            <h3 className="font-black text-2xl text-white italic tracking-tighter uppercase">Estructura del Sistema</h3>
                            <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.3em] mt-1 italic">Parámetros de red y jerarquía</p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveSettings} className="space-y-10 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* PREFIX */}
                            <div className="space-y-4 group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/20 ml-4 group-focus-within:text-primary transition-colors">Prefijo Global de Comando</label>
                                <input
                                    type="text"
                                    value={data.config.prefix}
                                    onChange={(e) => updateConfig('prefix', e.target.value)}
                                    className="w-full bg-[#0d0f12] border border-white/5 rounded-2xl px-8 py-5 focus:outline-none focus:border-primary/50 transition-all font-mono text-xl text-primary font-black italic shadow-inner"
                                />
                            </div>

                            {/* STAFF ROLE */}
                            <div className="space-y-4 group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/20 ml-4 group-focus-within:text-primary transition-colors">Rol de Staff Autorizado</label>
                                <div className="relative">
                                    <select
                                        value={data.config.modsRole || ''}
                                        onChange={(e) => updateConfig('modsRole', e.target.value)}
                                        className="w-full bg-[#0d0f12] border border-white/5 rounded-2xl px-8 py-5 focus:outline-none focus:border-primary/50 transition-all text-xl text-white font-black italic appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-[#0c0e12] text-foreground/40 italic">Ningún Rol Seleccionado</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id} className="bg-[#0c0e12] text-white">
                                                @ {role.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6">
                            <div className="flex items-center gap-3 text-foreground/30 italic max-w-md">
                                <Info className="w-4 h-4 flex-shrink-0" />
                                <p className="text-[10px] leading-relaxed">Los cambios se aplican instantáneamente en Discord tras confirmar.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={saving || success}
                                className={cn(
                                    "px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                                    success ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                                )}
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (success ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
                                {saving ? 'Sincronizando...' : (success ? 'SINCRONIZADO' : 'Confirmar Cambios')}
                            </button>
                        </div>
                    </form>
                    {/* DECOR */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                </div>
            </div>
        </div>
    );
};
