import {
    Check,
    Eye,
    Info,
    Loader2,
    Package,
    Search,
    Shield,
    ShoppingBag,
    Wallet,
    X,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

interface Item {
    _id: string;
    itemName: string;
    description: string;
    emoji: string;
    price: number;
    inventory?: boolean;
    usable?: boolean;
    sellable?: boolean;
    stock?: number;
    timeLimit?: number;
    actions: any[];
    requirements: any[];
}

interface FormattedCriteria {
    text: string;
    type: 'add' | 'remove' | 'info';
    icon?: any;
}

const formatCriteria = (criteria: Record<string, any> | string[] | undefined, resolvedNames: Record<string, string> = {}): FormattedCriteria[] | null => {
    if (!criteria || (Array.isArray(criteria) && criteria.length === 0) || (!Array.isArray(criteria) && Object.keys(criteria).length === 0)) return null;

    const results: FormattedCriteria[] = [];

    const processString = (str: string): FormattedCriteria => {
        const parts = str.split(':');
        const isAdd = str.includes(':add');
        const isRemove = str.includes(':remove');
        const type = isAdd ? 'add' : (isRemove ? 'remove' : 'info');

        if (str.startsWith('role')) {
            const id = parts.find(p => p.length > 10 && !isNaN(Number(p)));
            const name = id ? (resolvedNames[id] ? `@${resolvedNames[id]}` : id) : 'Desconocido';
            return { text: `${isAdd ? '+' : (isRemove ? '-' : '')} ${name}`, type, icon: Shield };
        }
        if (str.startsWith('money')) {
            const amount = parts.find(p => !isNaN(Number(p)));
            return { text: `Dinero: $${amount}`, type, icon: Wallet };
        }
        if (str.startsWith('item')) {
            const id = parts.find(p => p !== 'item' && p !== 'add' && p !== 'remove');
            const name = id ? (resolvedNames[id] || id) : 'Desconocido';
            return { text: `Item ${isAdd ? 'Añadido' : (isRemove ? 'Eliminado' : '')}: ${name}`, type, icon: Package };
        }
        return { text: str, type: 'info', icon: Info };
    };

    if (Array.isArray(criteria)) {
        criteria.forEach(c => {
            if (typeof c === 'string') results.push(processString(c));
        });
    } else {
        Object.entries(criteria).forEach(([key, val]) => {
            if (val === undefined || val === null) return;

            if (key === 'addMoney') results.push({ text: `+ $${val.toLocaleString()}`, type: 'add', icon: Wallet });
            else if (key === 'removeMoney') results.push({ text: `- $${val.toLocaleString()}`, type: 'remove', icon: Wallet });
            else if (key === 'addRole') results.push({ text: `+ ${resolvedNames[val] ? '@' + resolvedNames[val] : val}`, type: 'add', icon: Shield });
            else if (key === 'removeRole') results.push({ text: `- ${resolvedNames[val] ? '@' + resolvedNames[val] : val}`, type: 'remove', icon: Shield });
            else if (key === 'addItem') results.push({ text: `Añade Item: ${resolvedNames[val] || val}`, type: 'add', icon: Package });
            else if (key === 'removeItem') results.push({ text: `Elimina Item: ${resolvedNames[val] || val}`, type: 'remove', icon: Package });
            else if (key === 'reply') results.push({ text: `Respuesta: "${val.toString().substring(0, 20)}..."`, type: 'info', icon: Info });

            else if (key === 'money') results.push({ text: `Requiere: $${val.toLocaleString()}`, type: 'info', icon: Wallet });
            else if (key === 'role') results.push({ text: `Requiere Rol: ${resolvedNames[val] ? '@' + resolvedNames[val] : val}`, type: 'info', icon: Shield });
            else if (key === 'item') results.push({ text: `Requiere Item: ${resolvedNames[val] || val}`, type: 'info', icon: Package });

            else if (!isNaN(Number(key)) && typeof val === 'string') {
                results.push(processString(val));
            }
            else {
                results.push({ text: `${key}: ${val}`, type: 'info', icon: Info });
            }
        });
    }

    return results.length > 0 ? results : null;
};

export const Shop = () => {
    const { id: guildId } = useParams<{ id: string }>();
    const { user: authUser } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
    const [stats, setStats] = useState<{ money: number, bank: number }>({ money: 0, bank: 0 });
    const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [viewingItem, setViewingItem] = useState<Item | null>(null);

    useEffect(() => {
        if (!guildId) return;
        setLoading(true);

        const fetchData = async () => {
            try {
                // 1. Fetch Shop Items (Critical)
                const shopRes = await api.get(`/economy/shop/${guildId}`);
                if (shopRes.data?.items) {
                    setItems(shopRes.data.items);
                    setResolvedNames(shopRes.data.resolvedNames || {});
                } else if (Array.isArray(shopRes.data)) {
                    setItems(shopRes.data);
                } else {
                    setItems([]);
                }
            } catch (err) {
                console.error("Failed to load shop:", err);
            }

            // 2. Fetch User Stats (Non-Critical)
            if (authUser) {
                try {
                    const userRes = await api.get(`/economy/user/${authUser.id}/${guildId}`);
                    if (userRes.data) {
                        setStats({
                            money: userRes.data.money || 0,
                            bank: userRes.data.bank || 0
                        });
                    }
                } catch (err) {
                    console.error("Failed to load user stats for shop:", err);
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [guildId, authUser]);

    const filteredItems = items
        .filter(i => i.itemName.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.price - b.price);

    const handleBuy = async (itemId: string) => {
        setPurchasing(itemId);
        try {
            await api.post('/economy/buy', { itemId, guildId });
            setPurchaseSuccess(itemId);
            setTimeout(() => {
                setPurchaseSuccess(null);
                setViewingItem(null);
            }, 2000);

            // Refresh balance
            const userRes = await api.get(`/economy/user/${authUser?.id}/${guildId}`);
            if (userRes.data) {
                setStats({
                    money: userRes.data.money || 0,
                    bank: userRes.data.bank || 0
                });
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setPurchasing(null);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

    return (
        <div className="p-5 lg:p-8 space-y-10 animate-in fade-in duration-700">

            {/* HEADER */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                        <ShoppingBag className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Tienda del Servidor</h1>
                        <p className="text-white/40 font-medium">Hay {items.length} productos en esta tienda</p>
                    </div>
                </div>

                {/* USER BALANCE */}
                <div className="flex items-center gap-4 bg-[#0d0f12] p-2 pr-6 rounded-full border border-white/5 shadow-2xl">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-foreground/30 tracking-[0.2em]">Tu Balance</p>
                        <p className="text-xl font-black text-white tracking-tight">${stats.money.toLocaleString()}</p>
                    </div>
                </div>
            </header>

            {/* SEARCH */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                    type="text"
                    placeholder="Buscar en la tienda..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white font-medium placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                />
            </div>

            {/* ITEMS CATALOG */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                {filteredItems.length > 0 ? filteredItems.map((item, i) => (
                    <div key={item._id} className="elite-card h-full p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-500" style={{ animationDelay: `${i * 30}ms` }}>

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 bg-[#0d0f12] rounded-xl flex items-center justify-center text-3xl border border-white/5 shadow-inner transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 mb-4">
                                {item.emoji || '📦'}
                            </div>
                            <div className="w-full">
                                <h3 className="font-black text-white text-lg truncate mb-2 uppercase italic tracking-tighter">{item.itemName}</h3>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-3 relative z-10 w-full">
                            <span className="text-2xl font-black text-emerald-500 tabular-nums italic tracking-tighter text-center">${item.price.toLocaleString()}</span>

                            <div className="grid grid-cols-4 gap-2 w-full">
                                <button
                                    onClick={() => setViewingItem(item)}
                                    className="col-span-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl flex items-center justify-center transition-all border border-white/5"
                                    title="Ver Detalles"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleBuy(item._id)}
                                    disabled={!!purchasing || !!purchaseSuccess}
                                    className={cn(
                                        "col-span-3 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                                        purchaseSuccess === item._id ? "bg-emerald-500 text-white" : "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    )}
                                >
                                    {purchasing === item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : (purchaseSuccess === item._id ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-black" />)}
                                    {purchaseSuccess === item._id ? 'COMPRADO' : 'COMPRAR'}
                                </button>
                            </div>
                        </div>

                        {/* DECOR */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-all duration-1000" />
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center elite-card rounded-[2rem] border-dashed space-y-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto opacity-10 rotate-12 border border-white/10 animate-pulse">
                            <ShoppingBag className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-foreground/20 font-black uppercase tracking-[0.4em] text-sm italic">Sin Resultados</p>
                            <p className="text-[9px] font-black text-foreground/10 uppercase tracking-[0.5em] mt-2">No se encontraron suministros</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ITEM DETAILS MODAL (Updated to match Inventory) */}
            {viewingItem && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0c0e12] border border-white/10 w-auto min-w-[32rem] max-w-[90vw] rounded-3xl p-8 relative shadow-2xl animate-in zoom-in-95 overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

                        <button
                            onClick={() => setViewingItem(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-20"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-[#15181e] rounded-3xl flex items-center justify-center text-5xl border border-white/5 shadow-2xl mb-6">
                                {viewingItem.emoji || '📦'}
                            </div>

                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">{viewingItem.itemName}</h2>
                            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm font-bold text-emerald-400 mb-6">
                                Precio: ${viewingItem.price.toLocaleString()}
                            </div>

                            <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-8">
                                {viewingItem.description || "Sin descripción disponible."}
                            </p>

                            {/* INFO GRID */}
                            <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left h-full">
                                    <p className="text-[10px] font-bold uppercase text-white/30 tracking-widest mb-3">Efecto</p>
                                    <div className="space-y-2">
                                        {formatCriteria(viewingItem.actions, resolvedNames)?.map((c, i) => (
                                            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-xs font-bold uppercase tracking-wider w-full h-auto min-h-[3rem] ${c.type === 'add'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                : c.type === 'remove'
                                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                                    : 'bg-white/5 border-white/10 text-white/60'
                                                }`}>
                                                {c.icon ? <c.icon className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />}
                                                <span className="flex-1 min-w-0 whitespace-nowrap leading-relaxed">{c.text}</span>
                                            </div>
                                        )) || <p className="text-sm font-medium text-white/20 italic">Sin efectos</p>}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left h-full">
                                    <p className="text-[10px] font-bold uppercase text-white/30 tracking-widest mb-3">Requisito</p>
                                    <div className="space-y-2">
                                        {formatCriteria(viewingItem.requirements, resolvedNames)?.map((c, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-wider w-full h-auto min-h-[3rem]">
                                                {c.icon ? <c.icon className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />}
                                                <span className="flex-1 min-w-0 whitespace-nowrap leading-relaxed">{c.text}</span>
                                            </div>
                                        )) || <p className="text-sm font-medium text-white/20 italic">Sin requisitos</p>}
                                    </div>
                                </div>
                            </div>

                            {/* ACTIONS (Updated to Buy) */}
                            <div className="w-full">
                                <button
                                    onClick={() => handleBuy(viewingItem._id)}
                                    disabled={!!purchasing || purchaseSuccess === viewingItem._id}
                                    className={cn(
                                        "w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]",
                                        purchaseSuccess === viewingItem._id ? "bg-emerald-600 text-white" : "bg-emerald-500 text-black hover:bg-emerald-400"
                                    )}
                                >
                                    {purchasing === viewingItem._id ? <Loader2 className="w-5 h-5 animate-spin" /> : (purchaseSuccess === viewingItem._id ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5 fill-black" />)}
                                    {purchaseSuccess === viewingItem._id ? 'COMPRADO' : 'COMPRAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
