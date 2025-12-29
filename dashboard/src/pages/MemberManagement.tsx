import {
    Check,
    Coins,
    CreditCard,
    Edit2,
    Hash,
    Landmark,
    Loader2,
    Package,
    Save,
    Search,
    Settings,
    Trash2,
    Users,
    Wallet,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

interface Member {
    userId: string;
    username: string;
    avatar: string;
    money: number;
    bank: number;
}

export const MemberManagement = () => {
    const { id: guildId } = useParams<{ id: string }>();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ money: 0, bank: 0 });
    const [config, setConfig] = useState({
        currencySymbol: '$',
        initialMoney: 0,
        initialBank: 5000,
        economyLogsChannel: ''
    });
    const [channels, setChannels] = useState<{ id: string, name: string }[]>([]);
    const [savingConfig, setSavingConfig] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        setMembers([]);
        setLoading(true);
        api.get(`/guilds/${guildId}/members`)
            .then(res => setMembers(res.data))
            .catch(err => console.error(err));

        // Reset config defaults
        setConfig({
            currencySymbol: '$',
            initialMoney: 0,
            initialBank: 5000,
            economyLogsChannel: ''
        });

        api.get(`/guilds/${guildId}`)
            .then(res => {
                if (res.data.config) {
                    setConfig({
                        currencySymbol: res.data.config.currencySymbol || '$',
                        initialMoney: res.data.config.initialMoney || 0,
                        initialBank: res.data.config.initialBank || 5000,
                        economyLogsChannel: res.data.config.economyLogsChannel || ''
                    });
                }
            })
            .catch(err => console.error(err));

        api.get(`/guilds/${guildId}/channels`)
            .then(res => setChannels(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [guildId]);

    const filteredMembers = members.filter(m => m.username.toLowerCase().includes(search.toLowerCase()) || m.userId.includes(search));

    const startEdit = (m: Member) => {
        setEditing(m.userId);
        setEditForm({ money: m.money, bank: m.bank });
    };

    const handleSave = async (userId: string) => {
        try {
            await api.patch(`/guilds/${guildId}/members/${userId}`, editForm);
            setMembers(members.map(m => m.userId === userId ? { ...m, ...editForm } : m));
            setEditing(null);
        } catch (err) {
            console.error('Error al sincronizar datos del ciudadano:', err);
        }
    };

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            await api.patch(`/guilds/${guildId}/settings`, config);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error al guardar la configuración:', err);
        } finally {
            setSavingConfig(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

    return (
        <div className="p-6 lg:p-10 space-y-10 animate-in fade-in duration-700">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="flex items-center gap-6">


                    <div className="p-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl flex items-center justify-center">
                        <Landmark className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em] mb-1 px-1">Control Económico</p>
                        <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase transition-all">Banco Central</h1>
                        <p className="text-foreground/40 font-medium italic">Sintonización de activos bancarios y carteras en tiempo real.</p>
                    </div>
                </div>

                <div className="relative group min-w-[340px]">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-all duration-300" />
                    <input
                        type="text"
                        placeholder="Identificar por nombre o ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#111316] border border-white/5 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:border-primary/50 transition-all text-sm font-bold placeholder:text-foreground/10 placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
                    />
                </div>
            </div>

            {/* ECONOMY CONFIGURATION PANEL */}
            <div className="elite-card p-8 rounded-[2.5rem] bg-[#0c0e12] border-white/5 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Configuración del Sistema</h3>
                            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Ajustes globales de la moneda y registros</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveConfig}
                        disabled={savingConfig}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg",
                            success
                                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                : "bg-primary hover:bg-primary/80 text-white shadow-primary/20",
                            savingConfig && "opacity-50"
                        )}
                    >
                        {savingConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : (success ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />)}
                        {success ? 'Guardado Exitosamente' : 'Guardar Cambios'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                            <Coins className="w-3 h-3" /> Símbolo Moneda
                        </p>
                        <input
                            type="text"
                            value={config.currencySymbol}
                            onChange={(e) => setConfig({ ...config, currencySymbol: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-5 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/20 transition-all text-white italic"
                            placeholder="Ej: $, €, RP..."
                        />
                    </div>
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                            <Wallet className="w-3 h-3" /> Cartera Inicial
                        </p>
                        <input
                            type="number"
                            value={config.initialMoney}
                            onChange={(e) => setConfig({ ...config, initialMoney: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-5 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/20 transition-all text-white italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                            <CreditCard className="w-3 h-3" /> Banco Inicial
                        </p>
                        <input
                            type="number"
                            value={config.initialBank}
                            onChange={(e) => setConfig({ ...config, initialBank: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-5 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/20 transition-all text-white italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                            <Hash className="w-3 h-3" /> Canal de Logs
                        </p>
                        <select
                            value={config.economyLogsChannel}
                            onChange={(e) => setConfig({ ...config, economyLogsChannel: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-5 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/20 transition-all text-white italic appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-[#0c0e12] text-foreground/40">Desactivado / Ninguno</option>
                            {channels.map(channel => (
                                <option key={channel.id} value={channel.id} className="bg-[#0c0e12] text-white">
                                    # {channel.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* MEMBER TABLE */}
            <div className="elite-card rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.01] border-b border-white/5">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20 italic">Ciudadano</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 italic">Cartera Activa</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 italic">Balance Banco</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredMembers.map((member) => (
                                <tr key={member.userId} className="hover:bg-white/[0.01] transition-all group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                                <img src={member.avatar} className="w-12 h-12 rounded-2xl border border-white/10 grayscale group-hover:grayscale-0 transition-all duration-700 shadow-xl" alt="avatar" />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-lg border-2 border-[#1a1d21] shadow-2xl" />
                                            </div>
                                            <div>
                                                <p className="font-black text-white italic group-hover:text-primary transition-colors">{member.username}</p>
                                                <p className="text-[9px] text-foreground/10 font-black tracking-widest uppercase mt-0.5">ID: {member.userId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        {editing === member.userId ? (
                                            <input
                                                type="number"
                                                value={editForm.money}
                                                onChange={(e) => setEditForm({ ...editForm, money: parseInt(e.target.value) })}
                                                className="bg-[#0a0c0e] border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500/50 text-emerald-500 font-black text-lg w-40 italic tabular-nums"
                                            />
                                        ) : (
                                            <span className="text-xl font-black text-emerald-500 tabular-nums italic tracking-tighter">{config.currencySymbol}{member.money.toLocaleString()}</span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6">
                                        {editing === member.userId ? (
                                            <input
                                                type="number"
                                                value={editForm.bank}
                                                onChange={(e) => setEditForm({ ...editForm, bank: parseInt(e.target.value) })}
                                                className="bg-[#0a0c0e] border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500/50 text-blue-500 font-black text-lg w-40 italic tabular-nums"
                                            />
                                        ) : (
                                            <span className="text-xl font-black text-blue-500 tabular-nums italic tracking-tighter">{config.currencySymbol}{member.bank.toLocaleString()}</span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        {!editing || editing !== member.userId ? (
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                                                <button
                                                    onClick={() => startEdit(member)}
                                                    className="p-3 bg-white/5 hover:bg-primary hover:text-white rounded-xl transition-all shadow-xl hover:-rotate-12"
                                                    title="Editar Activos"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-3 bg-white/5 hover:bg-white hover:text-black rounded-xl transition-all shadow-xl" title="Inspeccionar Mochila">
                                                    <Package className="w-4 h-4" />
                                                </button>
                                                <button className="p-3 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-500 shadow-xl">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-3">
                                                <button onClick={() => handleSave(member.userId)} className="p-3 bg-emerald-500 text-white rounded-xl shadow-2xl hover:bg-emerald-600 transition-all hover:scale-110">
                                                    <Check className="w-4 h-4 text-black" />
                                                </button>
                                                <button onClick={() => setEditing(null)} className="p-3 bg-red-500 text-white rounded-xl shadow-2xl hover:bg-red-600 transition-all hover:scale-110">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredMembers.length === 0 && (
                        <div className="py-32 text-center space-y-6">
                            <Users className="w-16 h-16 mx-auto opacity-5" />
                            <p className="text-foreground/20 font-black uppercase tracking-[0.3em] text-sm italic">Ciudadano no detectado en el censo</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
