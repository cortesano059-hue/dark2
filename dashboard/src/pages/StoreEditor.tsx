import {
    Check,
    ChevronDown,
    Edit2,
    Eye,
    Landmark,
    Loader2,
    MessageSquare,
    Package,
    Plus,
    Search,
    Shield,
    ShoppingBag,
    Trash2,
    Type,
    Wallet,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

interface Action {
    type: 'role' | 'money' | 'bank' | 'item' | 'message';
    mode?: 'add' | 'remove';
    roleId?: string;
    amount?: number;
    itemName?: string;
    text?: string;
    raw?: string;
}

interface Requirement {
    type: 'role' | 'money' | 'item';
    roleId?: string;
    value?: number;
    item?: string;
    amount?: number;
    raw?: string;
}

interface ShopItem {
    _id: string;
    itemName: string;
    description: string;
    emoji: string;
    price: number;
    usable: boolean;
    inventory: boolean;
    sellable: boolean;
    type: 'normal' | 'container';
    actions: string[];
    requirements: string[];
}

export const StoreEditor = () => {
    const { id: guildId } = useParams<{ id: string }>();
    const [items, setItems] = useState<ShopItem[]>([]);
    const [roles, setRoles] = useState<{ id: string, name: string, color: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<ShopItem> | null>(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Actions/Reqs local state for the form
    const [formActions, setFormActions] = useState<string[]>([]);
    const [formReqs, setFormReqs] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, [guildId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [shopRes, rolesRes] = await Promise.all([
                api.get(`/economy/shop/${guildId}?mode=admin`),
                api.get(`/guilds/${guildId}/roles`)
            ]);
            setItems(shopRes.data.items || []);
            setRoles(rolesRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item?: ShopItem) => {
        if (item) {
            setEditingItem(item);
            setFormActions(item.actions || []);
            setFormReqs(item.requirements || []);
        } else {
            setEditingItem({
                itemName: '',
                description: '',
                emoji: '📦',
                price: 0,
                usable: true,
                inventory: true,
                sellable: false,
                type: 'normal',
                actions: [],
                requirements: []
            });
            setFormActions([]);
            setFormReqs([]);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        setSaving(true);

        const payload = {
            ...editingItem,
            actions: formActions,
            requirements: formReqs
        };

        try {
            if (editingItem._id) {
                await api.patch(`/economy/shop/${guildId}/items/${editingItem._id}`, payload);
            } else {
                await api.post(`/economy/shop/${guildId}/items`, payload);
            }
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setIsModalOpen(false);
                fetchData();
            }, 1000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm('¿Estás seguro de eliminar este artículo?')) return;
        try {
            await api.delete(`/economy/shop/${guildId}/items/${itemId}`);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const addAction = (raw: string) => setFormActions([...formActions, raw]);
    const removeAction = (index: number) => setFormActions(formActions.filter((_, i) => i !== index));

    const addReq = (raw: string) => setFormReqs([...formReqs, raw]);
    const removeReq = (index: number) => setFormReqs(formReqs.filter((_, i) => i !== index));

    const filteredItems = items.filter(item =>
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

    return (
        <div className="p-5 lg:p-8 space-y-10 animate-in fade-in duration-700">
            {/* HEADER */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
                        <ShoppingBag className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Gestión de Catálogo</h1>
                        <p className="text-white/40 font-medium italic">Control total sobre artículos, precios y logística comercial</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar en el catálogo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold italic focus:outline-none focus:border-emerald-500/30 transition-all w-64 shadow-inner"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Artículo
                    </button>
                </div>
            </header>

            {/* ITEMS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                {filteredItems.map((item, i) => (
                    <div key={item._id} className="elite-card h-full p-6 rounded-[2rem] flex flex-col justify-between hover:border-emerald-500/30 relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-500 bg-[#0d0f12] border-white/10 shadow-2xl transition-all" style={{ animationDelay: `${i * 30}ms` }}>

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 bg-[#0a0c0e] rounded-xl flex items-center justify-center text-3xl border border-white/10 shadow-inner transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 mb-5">
                                {item.emoji || '📦'}
                            </div>
                            <div className="w-full">
                                <h3 className="font-black text-white text-lg truncate mb-2 uppercase italic tracking-tighter">{item.itemName}</h3>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-4 relative z-10 w-full">
                            <span className="text-2xl font-black text-emerald-500 tabular-nums italic tracking-tighter text-center">${item.price.toLocaleString()}</span>

                            <div className="flex gap-3 w-full justify-center">
                                <button
                                    onClick={() => handleOpenModal(item)}
                                    className="flex-1 p-3 bg-white/5 hover:bg-white hover:text-black rounded-xl transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-2 group/btn"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Editar</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(item._id)}
                                    className="p-3 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-500 shadow-lg hover:scale-105"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* DECOR */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-all duration-1000" />
                    </div>
                ))}

                {filteredItems.length === 0 && (
                    <div className="col-span-full py-24 text-center elite-card rounded-[2.5rem] border-dashed space-y-6 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center opacity-10 rotate-12 border border-white/10 animate-pulse">
                            <ShoppingBag className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-foreground/20 font-black uppercase tracking-[0.4em] text-sm italic">Sin Resultados</p>
                            <p className="text-[9px] font-black text-foreground/10 uppercase tracking-[0.5em] mt-2">No hay existencias configuradas</p>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EDITOR */}
            {isModalOpen && editingItem && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

                    <div className="relative bg-[#0c0e12] border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 no-scrollbar my-10">
                        <form onSubmit={handleSave} className="p-10 lg:p-16 space-y-12">

                            <div className="flex items-center justify-between border-b border-white/10 pb-10">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-white/5 rounded-[1.5rem] border border-white/10 backdrop-blur-xl flex items-center justify-center text-emerald-500 shadow-xl">
                                        <Package className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                            {editingItem._id ? 'Editar Artículo' : 'Nuevo Artículo'}
                                        </h2>
                                        <p className="text-xs font-black text-white/20 uppercase tracking-[0.3em] italic">Configuración Técnica de Activos</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-white/5 rounded-2xl text-white/20 hover:text-white transition-all border border-transparent hover:border-white/10">
                                    <X className="w-7 h-7" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-6">
                                {/* BASIC INFO */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                                            <Type className="w-3 h-3" /> Nombre Identificador
                                        </label>
                                        <input
                                            type="text"
                                            value={editingItem.itemName}
                                            onChange={(e) => setEditingItem({ ...editingItem, itemName: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm font-black italic focus:outline-none focus:border-emerald-500/20 transition-all text-white"
                                            placeholder="Ej: Kit de Reparación"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                                                <Wallet className="w-3 h-3" /> Precio Venta
                                            </label>
                                            <input
                                                type="number"
                                                value={editingItem.price}
                                                onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm font-black italic focus:outline-none focus:border-emerald-500/20 transition-all text-emerald-500"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                                                <Eye className="w-3 h-3" /> Emoji/Icono
                                            </label>
                                            <input
                                                type="text"
                                                value={editingItem.emoji}
                                                onChange={(e) => setEditingItem({ ...editingItem, emoji: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm font-black italic text-center focus:outline-none focus:border-emerald-500/20 transition-all"
                                                placeholder="📦"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, usable: !editingItem.usable })}
                                            className={cn(
                                                "p-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all italic",
                                                editingItem.usable ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-white/5 border-white/10 text-foreground/20"
                                            )}
                                        >
                                            {editingItem.usable ? 'Usable ACTIVADO' : 'Usable DESACTIVADO'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, inventory: !editingItem.inventory })}
                                            className={cn(
                                                "p-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all italic",
                                                editingItem.inventory ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : "bg-white/5 border-white/10 text-foreground/20"
                                            )}
                                        >
                                            {editingItem.inventory ? 'Inventariable' : 'No Inventariable'}
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: DESCRIPTION (LARGE) */}
                                <div className="space-y-3 h-full">
                                    <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] px-1 italic flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3" /> Descripción Comercial
                                    </label>
                                    <textarea
                                        value={editingItem.description}
                                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] py-6 px-8 text-sm font-bold italic focus:outline-none focus:border-emerald-500/20 transition-all text-foreground/60 min-h-[220px] h-[calc(100%-2.5rem)] resize-none"
                                        placeholder="Describe la utilidad del objeto..."
                                    />
                                </div>
                            </div>

                            {/* ADVANCED SECTION: ACTIONS & REQS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* ACTIONS */}
                                <div className="space-y-6 bg-[#0c0e12] border border-white/10 p-8 rounded-[2.5rem]">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic flex items-center gap-2">
                                            <Plus className="w-3 h-3" /> Efectos al Usar
                                        </label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => addAction('money:add:1000')} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><Wallet className="w-3 h-3" /></button>
                                            <button type="button" onClick={() => addAction('role:add:ID')} className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Shield className="w-3 h-3" /></button>
                                            <button type="button" onClick={() => addAction('item:add:Objeto:1')} className="p-1.5 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500 hover:text-white transition-all"><Package className="w-3 h-3" /></button>
                                            <button type="button" onClick={() => addAction('message:Has usado el objeto!')} className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500 hover:text-white transition-all"><MessageSquare className="w-3 h-3" /></button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                                        {formActions.map((act, idx) => {
                                            const parts = act.split(':');
                                            const type = parts[0];

                                            return (
                                                <div key={idx} className="flex flex-col gap-4 bg-[#0a0c0e] border border-white/10 p-5 rounded-2xl group transition-all hover:border-emerald-500/20 shadow-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">{type}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeAction(idx)} className="text-red-500/30 hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        {/* MODE SELECTOR (for non-message) */}
                                                        {type !== 'message' && (
                                                            <div className="relative w-full">
                                                                <select
                                                                    value={parts[1]}
                                                                    onChange={(e) => {
                                                                        const newActs = [...formActions];
                                                                        const p = [...parts];
                                                                        p[1] = e.target.value;
                                                                        newActs[idx] = p.join(':');
                                                                        setFormActions(newActs);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-xs font-black italic text-emerald-500 focus:outline-none focus:border-emerald-500/30 transition-all appearance-none pr-10 [&>option]:bg-[#0d0f12] [&>option]:text-white"
                                                                >
                                                                    <option value="add">DAR (+)</option>
                                                                    <option value="remove">QUITAR (-)</option>
                                                                    {type === 'role' && <option value="toggle">ALTERNAR (±)</option>}
                                                                </select>
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><ChevronDown className="w-4 h-4 text-emerald-500" /></div>
                                                            </div>
                                                        )}

                                                        {/* TARGET SELECTORS */}
                                                        {type === 'role' && (
                                                            <div className="relative w-full">
                                                                <select
                                                                    value={parts[2]}
                                                                    onChange={(e) => {
                                                                        const newActs = [...formActions];
                                                                        const p = [...parts];
                                                                        p[2] = e.target.value;
                                                                        newActs[idx] = p.join(':');
                                                                        setFormActions(newActs);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-xs font-black italic text-white focus:outline-none focus:border-emerald-500/30 transition-all appearance-none pr-10 [&>option]:bg-[#0d0f12] [&>option]:text-white"
                                                                >
                                                                    <option value="ID">Seleccionar Rol...</option>
                                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                                </select>
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><ChevronDown className="w-4 h-4" /></div>
                                                            </div>
                                                        )}

                                                        {type === 'money' && (
                                                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 group-focus-within:border-emerald-500/30 transition-all">
                                                                <Landmark className="w-4 h-4 text-emerald-500" />
                                                                <input
                                                                    type="number"
                                                                    value={parts[2]}
                                                                    onChange={(e) => {
                                                                        const newActs = [...formActions];
                                                                        const p = [...parts];
                                                                        p[2] = e.target.value;
                                                                        newActs[idx] = p.join(':');
                                                                        setFormActions(newActs);
                                                                    }}
                                                                    className="w-full bg-transparent text-xs font-black italic text-white focus:outline-none"
                                                                    placeholder="Cantidad..."
                                                                />
                                                            </div>
                                                        )}

                                                        {type === 'item' && (
                                                            <div className="flex flex-col gap-3">
                                                                <div className="relative w-full">
                                                                    <select
                                                                        value={parts[2]}
                                                                        onChange={(e) => {
                                                                            const newActs = [...formActions];
                                                                            const p = [...parts];
                                                                            p[2] = e.target.value;
                                                                            newActs[idx] = p.join(':');
                                                                            setFormActions(newActs);
                                                                        }}
                                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-xs font-black italic text-white focus:outline-none focus:border-emerald-500/30 transition-all appearance-none pr-10 [&>option]:bg-[#0d0f12] [&>option]:text-white"
                                                                    >
                                                                        <option value="ID">Seleccionar Objeto...</option>
                                                                        {items.map(i => <option key={i._id} value={i.itemName}>{i.itemName}</option>)}
                                                                    </select>
                                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><ChevronDown className="w-4 h-4" /></div>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={parts[3]}
                                                                    onChange={(e) => {
                                                                        const newActs = [...formActions];
                                                                        const p = [...parts];
                                                                        p[3] = e.target.value;
                                                                        newActs[idx] = p.join(':');
                                                                        setFormActions(newActs);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-xs font-black italic text-white focus:outline-none focus:border-emerald-500/30 transition-all text-center"
                                                                    placeholder="Cantidad a otorgar"
                                                                />
                                                            </div>
                                                        )}

                                                        {type === 'message' && (
                                                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 group-focus-within:border-emerald-500/30 transition-all">
                                                                <MessageSquare className="w-4 h-4 text-emerald-500" />
                                                                <input
                                                                    type="text"
                                                                    value={parts.slice(1).join(':')}
                                                                    onChange={(e) => {
                                                                        const newActs = [...formActions];
                                                                        newActs[idx] = `message:${e.target.value}`;
                                                                        setFormActions(newActs);
                                                                    }}
                                                                    className="w-full bg-transparent text-xs font-black italic text-white focus:outline-none"
                                                                    placeholder="Escribe el mensaje de confirmación..."
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {formActions.length === 0 && <p className="text-center py-10 text-[9px] font-black uppercase text-foreground/10 tracking-widest italic border-2 border-dashed border-white/10 rounded-3xl">Pulsa los iconos superiores para añadir efectos</p>}
                                    </div>
                                </div>

                                {/* REQUIREMENTS */}
                                <div className="space-y-6 bg-[#0c0e12] border border-white/10 p-8 rounded-[2.5rem]">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] italic flex items-center gap-2">
                                            <Shield className="w-3 h-3" /> Requisitos de Uso
                                        </label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => addReq('role:ID')} className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Shield className="w-3 h-3" /></button>
                                            <button type="button" onClick={() => addReq('money:1000')} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><Landmark className="w-3 h-3" /></button>
                                            <button type="button" onClick={() => addReq('item:Objeto:1')} className="p-1.5 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500 hover:text-white transition-all"><Package className="w-3 h-3" /></button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                                        {formReqs.map((req, idx) => {
                                            const parts = req.split(':');
                                            const type = parts[0];

                                            return (
                                                <div key={idx} className="flex flex-col gap-4 bg-[#0a0c0e] border border-white/10 p-5 rounded-2xl group transition-all hover:border-blue-500/20 shadow-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">{type}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeReq(idx)} className="text-red-500/30 hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        {type === 'role' && (
                                                            <div className="relative w-full">
                                                                <select
                                                                    value={parts[1]}
                                                                    onChange={(e) => {
                                                                        const newReqs = [...formReqs];
                                                                        const p = [...parts];
                                                                        p[1] = e.target.value;
                                                                        newReqs[idx] = p.join(':');
                                                                        setFormReqs(newReqs);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-xs font-black italic text-white focus:outline-none focus:border-blue-500/30 transition-all appearance-none pr-10 [&>option]:bg-[#0d0f12] [&>option]:text-white"
                                                                >
                                                                    <option value="ID">Seleccionar Rol...</option>
                                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                                </select>
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><ChevronDown className="w-4 h-4 text-blue-500" /></div>
                                                            </div>
                                                        )}

                                                        {type === 'money' && (
                                                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 group-focus-within:border-blue-500/30 transition-all">
                                                                <Landmark className="w-4 h-4 text-blue-500" />
                                                                <input
                                                                    type="number"
                                                                    value={parts[1]}
                                                                    onChange={(e) => {
                                                                        const newReqs = [...formReqs];
                                                                        const p = [...parts];
                                                                        p[1] = e.target.value;
                                                                        newReqs[idx] = p.join(':');
                                                                        setFormReqs(newReqs);
                                                                    }}
                                                                    className="w-full bg-transparent text-xs font-black italic text-white focus:outline-none"
                                                                    placeholder="Cantidad..."
                                                                />
                                                            </div>
                                                        )}

                                                        {type === 'item' && (
                                                            <div className="flex flex-col gap-3">
                                                                <div className="relative w-full">
                                                                    <select
                                                                        value={parts[1]}
                                                                        onChange={(e) => {
                                                                            const newReqs = [...formReqs];
                                                                            const p = [...parts];
                                                                            p[1] = e.target.value;
                                                                            newReqs[idx] = p.join(':');
                                                                            setFormReqs(newReqs);
                                                                        }}
                                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-xs font-black italic text-white focus:outline-none focus:border-blue-500/30 transition-all appearance-none pr-10 [&>option]:bg-[#0d0f12] [&>option]:text-white"
                                                                    >
                                                                        <option value="ID">Seleccionar Objeto...</option>
                                                                        {items.map(i => <option key={i._id} value={i.itemName}>{i.itemName}</option>)}
                                                                    </select>
                                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><ChevronDown className="w-4 h-4 text-blue-500" /></div>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={parts[2]}
                                                                    onChange={(e) => {
                                                                        const newReqs = [...formReqs];
                                                                        const p = [...parts];
                                                                        p[2] = e.target.value;
                                                                        newReqs[idx] = p.join(':');
                                                                        setFormReqs(newReqs);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-xs font-black italic text-white focus:outline-none focus:border-blue-500/30 transition-all text-center"
                                                                    placeholder="Cantidad requerida"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {formReqs.length === 0 && <p className="text-center py-10 text-[9px] font-black uppercase text-foreground/10 tracking-widest italic border-2 border-dashed border-white/10 rounded-3xl">Sin requisitos de uso</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10 flex gap-4 sticky bottom-0 z-50 bg-[#0c0e12]/80 backdrop-blur-xl pb-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={cn(
                                        "flex-1 py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20",
                                        success ? "bg-emerald-500 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white",
                                        saving && "opacity-50 grayscale"
                                    )}
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (success ? <Check className="w-5 h-5" /> : <Shield className="w-5 h-5" />)}
                                    {success ? 'SINCRONIZADO CON ÉXITO' : (editingItem._id ? 'GUARDAR CAMBIOS' : 'ESTABLECER NUEVO ACTIVO')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-10 py-5 bg-white/5 hover:bg-white/10 rounded-3xl text-sm font-black uppercase tracking-[0.2em] transition-all italic text-foreground/40"
                                >
                                    DESCARTAR
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
