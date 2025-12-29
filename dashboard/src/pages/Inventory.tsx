import { ArrowRight, Briefcase, Check, Info, Landmark, Loader2, Package, Search, Shield, User, Wallet, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

interface InventoryItem {
    id: string;
    name: string;
    emoji: string;
    amount: number;
    description?: string;
    usable?: boolean;
    actions?: Record<string, any> | string[];
    requirements?: Record<string, any> | string[];
}

interface FormattedCriteria {
    text: string;
    type: 'add' | 'remove' | 'info';
    icon?: any;
}

const formatCriteria = (criteria: Record<string, any> | string[] | undefined, resolvedNames: Record<string, string> = {}): FormattedCriteria[] | null => {
    if (!criteria || (Array.isArray(criteria) && criteria.length === 0) || (!Array.isArray(criteria) && Object.keys(criteria).length === 0)) return null;

    const results: FormattedCriteria[] = [];

    // Helper to process raw string data
    const processString = (str: string): FormattedCriteria => {
        const parts = str.split(':');
        // pattern: type:val:action or type:action:val

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
            // Find part that is not 'item', 'add', 'remove'
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

            // Actions
            if (key === 'addMoney') results.push({ text: `+ $${val.toLocaleString()}`, type: 'add', icon: Wallet });
            else if (key === 'removeMoney') results.push({ text: `- $${val.toLocaleString()}`, type: 'remove', icon: Wallet });
            else if (key === 'addRole') results.push({ text: `+ ${resolvedNames[val] ? '@' + resolvedNames[val] : val}`, type: 'add', icon: Shield });
            else if (key === 'removeRole') results.push({ text: `- ${resolvedNames[val] ? '@' + resolvedNames[val] : val}`, type: 'remove', icon: Shield });
            else if (key === 'addItem') results.push({ text: `Añade Item: ${resolvedNames[val] || val}`, type: 'add', icon: Package });
            else if (key === 'removeItem') results.push({ text: `Elimina Item: ${resolvedNames[val] || val}`, type: 'remove', icon: Package });
            else if (key === 'reply') results.push({ text: `Respuesta: "${val.toString().substring(0, 20)}..."`, type: 'info', icon: Info });

            // Requirements
            else if (key === 'money') results.push({ text: `Requiere: $${val.toLocaleString()}`, type: 'info', icon: Wallet });
            else if (key === 'role') results.push({ text: `Requiere Rol: ${resolvedNames[val] ? '@' + resolvedNames[val] : val}`, type: 'info', icon: Shield });
            else if (key === 'item') results.push({ text: `Requiere Item: ${resolvedNames[val] || val}`, type: 'info', icon: Package });

            // Legacy/String keys
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

interface Backpack {
    id: string;
    name: string;
    capacity: number;
    items?: any[];
}

interface PersonalStats {
    money: number;
    bank: number;
    username?: string;
    avatar?: string;
}

export const Inventory = () => {
    const { id: guildId } = useParams();
    const { user: authUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [stats, setStats] = useState<PersonalStats>({ money: 0, bank: 0 });
    const [search, setSearch] = useState('');
    const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

    // Detail Modal State
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    // Transfer State
    const [transferringItem, setTransferringItem] = useState<InventoryItem | null>(null);
    const [backpacks, setBackpacks] = useState<Backpack[]>([]);
    const [selectedBackpack, setSelectedBackpack] = useState<string>('');
    const [transferAmount, setTransferAmount] = useState<number>(1);
    const [confirming, setConfirming] = useState(false);
    const [transferSuccess, setTransferSuccess] = useState(false);
    const [usingItem, setUsingItem] = useState(false);
    const [useSuccess, setUseSuccess] = useState(false);

    // Money Actions State
    const [moneyAction, setMoneyAction] = useState<{ type: 'deposit' | 'withdraw', open: boolean }>({ type: 'deposit', open: false });
    const [moneyAmount, setMoneyAmount] = useState<string>('');
    const [processingMoney, setProcessingMoney] = useState(false);
    const [moneySuccess, setMoneySuccess] = useState(false);

    useEffect(() => {
        if (guildId && authUser) {
            fetchData();
        }
    }, [guildId, authUser]);

    const fetchData = () => {
        setLoading(true);
        api.get(`/economy/user/${authUser!.id}/${guildId}`)
            .then(res => {
                setInventory(res.data.inventory || []);
                setStats({
                    money: res.data.money || 0,
                    bank: res.data.bank || 0,
                    username: res.data.username,
                    avatar: res.data.avatar
                });
                if (res.data.resolvedNames) {
                    setResolvedNames(res.data.resolvedNames);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const handleOpenTransfer = async (item: InventoryItem) => {
        setTransferringItem(item);
        setTransferAmount(1);
        setSelectedBackpack('');

        try {
            const res = await api.get(`/economy/backpacks/${authUser!.id}/${guildId}`);
            setBackpacks(res.data);
        } catch (err) {
            console.error("Error fetching backpacks", err);
        }
    };

    const handleConfirmTransfer = async () => {
        if (!transferringItem || !selectedBackpack) return;
        setConfirming(true);

        try {
            await api.post('/economy/backpack/transfer', {
                userId: authUser!.id,
                guildId,
                backpackId: selectedBackpack,
                itemId: transferringItem.id,
                amount: transferAmount,
                action: 'store' // Store in backpack
            });

            setTransferSuccess(true);
            setTimeout(() => {
                setTransferSuccess(false);
                setTransferringItem(null);
                fetchData();
            }, 2000);
        } catch (err: any) {
            console.error(err);
        } finally {
            setConfirming(false);
        }
    };



    const handleUseItem = async (item: InventoryItem) => {
        if (!item.usable || usingItem || useSuccess) return;

        setUsingItem(true);
        try {
            const res = await api.post('/economy/item/use', {
                userId: authUser!.id,
                guildId,
                itemId: item.id
            });

            if (res.data.success) {
                setUseSuccess(true);
                setTimeout(() => {
                    setUseSuccess(false);
                    fetchData();
                    setSelectedItem(null);
                }, 2000);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setUsingItem(false);
        }
    };

    const handleMoneyAction = async () => {
        if (!moneyAmount || isNaN(Number(moneyAmount)) || Number(moneyAmount) <= 0) return;

        setProcessingMoney(true);
        try {
            const amount = Number(moneyAmount);
            const endpoint = moneyAction.type === 'deposit' ? '/economy/deposit' : '/economy/withdraw';
            const res = await api.post(endpoint, {
                userId: authUser!.id,
                guildId,
                amount
            });

            if (res.data.success) {
                setMoneySuccess(true);
                setTimeout(() => {
                    setMoneySuccess(false);
                    setMoneyAction({ ...moneyAction, open: false });
                    setMoneyAmount('');
                    fetchData();
                }, 2000);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setProcessingMoney(false);
        }
    };

    const filteredItems = inventory.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-8 space-y-8 overflow-y-auto w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <header className="flex flex-col gap-8">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-primary to-purple-500 shadow-2xl">
                            <img src={stats.avatar || authUser?.avatar} className="w-full h-full rounded-full border-4 border-[#030712] object-cover" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#0c0e12] p-2 rounded-full border border-white/10">
                            <User className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em] mb-1 px-1">Control de Inventario</p>
                        <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase transition-all">Mi Perfil</h1>
                        <p className="text-foreground/40 font-medium italic">
                            Estadísticas y Pertenencias <span className="text-emerald-500 mx-2">•</span> Patrimonio: <span className="text-emerald-500 font-bold">${((stats.money || 0) + (stats.bank || 0)).toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                {/* ECONOMY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative overflow-hidden bg-[#0d0f12] border border-white/5 rounded-3xl p-6 group hover:border-emerald-500/20 transition-all duration-300">
                        <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                    <Wallet className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-foreground/30 tracking-[0.2em] mb-1">En Mano</p>
                                    <p className="text-3xl font-black text-white tracking-tight">${stats.money.toLocaleString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMoneyAction({ type: 'deposit', open: true })}
                                className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-colors"
                            >
                                Depositar
                            </button>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-[#0d0f12] border border-white/5 rounded-3xl p-6 group hover:border-blue-500/20 transition-all duration-300 flex items-center justify-between">
                        <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                <Landmark className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-foreground/30 tracking-[0.2em] mb-1">En Banco</p>
                                <p className="text-3xl font-black text-white tracking-tight">${stats.bank.toLocaleString()}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setMoneyAction({ type: 'withdraw', open: true })}
                            className="relative z-10 text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-lg uppercase tracking-wider hover:bg-blue-500 hover:text-white transition-colors"
                        >
                            Retirar
                        </button>
                    </div>
                </div>

                {/* SEARCH */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                        type="text"
                        placeholder="Buscar en tu inventario..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-[#070809] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white font-medium placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                    />
                </div>
            </header>

            {/* INVENTORY GRID */}
            <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" /> Inventario
                    </h2>
                    <span className="text-[10px] font-bold bg-white/5 px-3 py-1 rounded-full text-white/40">{inventory.length} Objetos</span>
                </div>

                {inventory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 py-20 bg-white/[0.02] rounded-3xl border-2 border-dashed border-white/5">
                        <Package className="w-16 h-16 opacity-50" />
                        <p className="font-bold text-lg">Tu inventario está vacío</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="group relative bg-[#0d0f12] border border-white/5 rounded-3xl p-6 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col items-center text-center gap-4 cursor-pointer"
                            >
                                <div className="absolute top-4 right-4 text-[10px] font-bold bg-white/5 px-2 py-1 rounded-full text-white/40 group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-colors">
                                    INFO
                                </div>
                                <div className="w-16 h-16 bg-[#15181e] rounded-2xl flex items-center justify-center text-3xl border border-white/5 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-2xl">
                                    {item.emoji || '📦'}
                                </div>

                                <div className="w-full">
                                    <h3 className="font-black text-white text-lg truncate mb-1 uppercase italic tracking-tighter">{item.name}</h3>
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-bold text-emerald-400">
                                        x{item.amount.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DETAIL MODAL */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0c0e12] border border-white/10 w-auto min-w-[32rem] max-w-[90vw] rounded-3xl p-8 relative shadow-2xl animate-in zoom-in-95 overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-20"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-[#15181e] rounded-3xl flex items-center justify-center text-5xl border border-white/5 shadow-2xl mb-6">
                                {selectedItem.emoji || '📦'}
                            </div>

                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">{selectedItem.name}</h2>
                            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm font-bold text-emerald-400 mb-6">
                                Tienes: {selectedItem.amount.toLocaleString()}
                            </div>

                            <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-8">
                                {selectedItem.description || "Sin descripción disponible."}
                            </p>

                            {/* INFO GRID */}
                            <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left h-full">
                                    <p className="text-[10px] font-bold uppercase text-white/30 tracking-widest mb-3">Efecto</p>
                                    <div className="space-y-2">
                                        {formatCriteria(selectedItem.actions, resolvedNames)?.map((c, i) => (
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
                                        {formatCriteria(selectedItem.requirements, resolvedNames)?.map((c, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-wider w-full h-auto min-h-[3rem]">
                                                {c.icon ? <c.icon className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />}
                                                <span className="flex-1 min-w-0 whitespace-nowrap leading-relaxed">{c.text}</span>
                                            </div>
                                        )) || <p className="text-sm font-medium text-white/20 italic">Sin requisitos</p>}
                                    </div>
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button
                                    onClick={() => handleUseItem(selectedItem)}
                                    disabled={!selectedItem.usable || usingItem || useSuccess}
                                    className={cn(
                                        "py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                                        selectedItem.usable
                                            ? (useSuccess ? "bg-emerald-600 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20")
                                            : "bg-white/5 text-white/20 cursor-not-allowed"
                                    )}
                                >
                                    {usingItem ? <Loader2 className="w-5 h-5 animate-spin" /> : (useSuccess ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5" />)}
                                    {useSuccess ? 'USADO' : 'Usar'}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedItem(null);
                                        handleOpenTransfer(selectedItem);
                                    }}
                                    className="py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                >
                                    <ArrowRight className="w-5 h-5" /> Mover
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* TRANSFER MODAL */}
            {transferringItem && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0c0e12] border border-white/10 w-full max-w-md rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95">
                        <button
                            onClick={() => setTransferringItem(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-[#15181e] rounded-2xl flex items-center justify-center text-4xl border border-white/5 shadow-inner mx-auto mb-4">
                                {transferringItem.emoji || '📦'}
                            </div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Mover Objeto</h2>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">{transferringItem.name}</p>
                        </div>

                        <div className="space-y-6">
                            {/* Quantity Input */}
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={transferringItem.amount}
                                    value={transferAmount}
                                    onChange={e => setTransferAmount(parseInt(e.target.value) || 1)}
                                    className="w-full bg-[#15181e] border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-center focus:outline-none focus:border-emerald-500/50 text-xl"
                                />
                            </div>

                            {/* Backpack Selection */}
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block">Seleccionar Mochila</label>
                                {backpacks.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {backpacks.map(bp => (
                                            <button
                                                key={bp.id}
                                                onClick={() => setSelectedBackpack(bp.id)}
                                                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${selectedBackpack === bp.id
                                                    ? 'bg-blue-500/20 border-blue-500 text-white'
                                                    : 'bg-[#15181e] border-white/5 text-white/50 hover:bg-white/5'
                                                    }`}
                                            >
                                                <Briefcase className="w-4 h-4" />
                                                <span className="flex-1 font-bold text-sm truncate">{bp.name}</span>
                                                <span className="text-xs opacity-50">{Object.keys(bp.items || {}).length}/{bp.capacity}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-yellow-500/80 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 text-center">
                                        No tienes mochilas disponibles.
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleConfirmTransfer}
                                disabled={!selectedBackpack || confirming || transferSuccess}
                                className={cn(
                                    "w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                                    transferSuccess ? "bg-emerald-600 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-black"
                                )}
                            >
                                {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : (transferSuccess ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />)}
                                {transferSuccess ? 'TRANSFERIDO' : 'Confirmar Transferencia'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MONEY ACTION MODAL */}
            {moneyAction.open && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0c0e12] border border-white/10 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95">
                        <button
                            onClick={() => {
                                setMoneyAction({ ...moneyAction, open: false });
                                setMoneyAmount('');
                            }}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>

                        <div className="text-center mb-8">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border border-white/5 shadow-inner mx-auto mb-4 ${moneyAction.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {moneyAction.type === 'deposit' ? <Wallet className="w-8 h-8" /> : <Landmark className="w-8 h-8" />}
                            </div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                {moneyAction.type === 'deposit' ? 'Depositar Dinero' : 'Retirar Dinero'}
                            </h2>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                                {moneyAction.type === 'deposit' ? 'Mueve fondos al banco' : 'Mueve fondos a tu mano'}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={moneyAmount}
                                    onChange={e => setMoneyAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-[#15181e] border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-center focus:outline-none focus:border-white/20 text-xl"
                                    autoFocus
                                />
                                <p className="text-center text-xs text-white/30 mt-2 font-medium">
                                    Disponible: ${moneyAction.type === 'deposit' ? stats.money.toLocaleString() : stats.bank.toLocaleString()}
                                </p>
                            </div>

                            <button
                                onClick={handleMoneyAction}
                                disabled={!moneyAmount || processingMoney || moneySuccess}
                                className={cn(
                                    "w-full py-4 text-black font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                                    moneySuccess
                                        ? "bg-emerald-500 text-white"
                                        : (moneyAction.type === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-blue-500 hover:bg-blue-400')
                                )}
                            >
                                {processingMoney ? <Loader2 className="w-5 h-5 animate-spin" /> : (moneySuccess ? <Check className="w-5 h-5" /> : (moneyAction.type === 'deposit' ? <ArrowRight className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rotate-180" />))}
                                {moneySuccess ? 'COMPLETADO' : (moneyAction.type === 'deposit' ? 'Confirmar Depósito' : 'Confirmar Retiro')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
