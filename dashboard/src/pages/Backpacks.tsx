import { Backpack as BackpackIcon, Check, Loader2, Lock, Package, Users, Users as UsersIcon, X } from "lucide-react";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';

interface BackpackItem {
    id: string;
    itemId?: string;
    amount: number;
    name: string;
    emoji: string;
    description?: string;
}

interface Backpack {
    _id: string;
    name: string;
    capacity: number;
    ownerId: string;
    emoji?: string;
    accessType: 'owner_only' | 'custom';
    allowedUsers?: string[];
    allowedRoles?: string[];
    items: BackpackItem[];
}

export const Backpacks = () => {
    const { id: guildId } = useParams<{ id: string }>();
    const { user: authUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [backpacks, setBackpacks] = useState<Backpack[]>([]);
    const [selectedBackpack, setSelectedBackpack] = useState<Backpack | null>(null);
    const [withdrawingItem, setWithdrawingItem] = useState<{ id: string, name: string, amount: number } | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState(1);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);

    useEffect(() => {
        if (!guildId || !authUser) return;
        fetchBackpacks();
    }, [guildId, authUser]);

    const fetchBackpacks = () => {
        setLoading(true);
        api.get(`/economy/backpacks/${authUser!.id}/${guildId}`)
            .then(res => {
                setBackpacks(res.data || []);
                // Update selected backpack if open
                if (selectedBackpack) {
                    const updated = res.data.find((b: any) => b._id === selectedBackpack._id);
                    if (updated) setSelectedBackpack(updated);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const handleWithdraw = async () => {
        if (!selectedBackpack || !withdrawingItem) return;

        setIsWithdrawing(true);
        try {
            await api.post('/economy/backpacks/withdraw', {
                itemId: withdrawingItem.id, // Backpack Item ID (linked to Item)
                guildId,
                backpackId: selectedBackpack._id,
                amount: withdrawAmount
            });

            setWithdrawSuccess(true);
            setTimeout(() => {
                setWithdrawSuccess(false);
                setWithdrawingItem(null);
                fetchBackpacks();
            }, 2000);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-8 space-y-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
            <header className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                        <BackpackIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Mochilas</h1>
                        <p className="text-white/40 font-medium">Gestiona tus mochilas y almacenamiento adicional</p>
                    </div>
                </div>
            </header>

            {/* TABS */}
            <div className="flex bg-[#0d0f12] p-1.5 rounded-2xl border border-white/5 w-full max-w-md mb-8 self-center sm:self-start">
                <button
                    onClick={() => setActiveTab('my')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all duration-300",
                        activeTab === 'my' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                >
                    <BackpackIcon className="w-4 h-4" />
                    Mis Mochilas
                </button>
                <button
                    onClick={() => setActiveTab('shared')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all duration-300",
                        activeTab === 'shared' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                >
                    <UsersIcon className="w-4 h-4" />
                    Compartidas
                </button>
            </div>

            {/* BACKPACK LIST */}
            {(() => {
                const myBackpacks = backpacks.filter(bp => bp.ownerId === authUser?.id);
                const sharedBackpacks = backpacks.filter(bp => bp.ownerId !== authUser?.id);
                const displayList = activeTab === 'my' ? myBackpacks : sharedBackpacks;

                if (displayList.length === 0) {
                    return (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 py-20 bg-[#0d0f12]/50 rounded-[40px] border border-white/5 border-dashed">
                            <BackpackIcon className="w-16 h-16 opacity-30" />
                            <div className="text-center">
                                <p className="font-bold text-lg text-white/40 uppercase tracking-tighter italic">No hay mochilas aquí</p>
                                <p className="text-sm max-w-xs mx-auto mt-2">
                                    {activeTab === 'my'
                                        ? "No has creado ninguna mochila personal todavía."
                                        : "Nadie ha compartido una mochila contigo en este servidor."}
                                </p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {displayList.map(backpack => {
                            const itemCount = (backpack.items || []).length;
                            const isOwner = backpack.ownerId === authUser?.id;

                            return (
                                <div
                                    key={backpack._id}
                                    onClick={() => setSelectedBackpack(backpack)}
                                    className="group relative bg-[#070809] rounded-[32px] p-7 border border-transparent hover:border-blue-500/50 transition-all duration-500 hover:bg-[#0a0c10] hover:-translate-y-1 cursor-pointer overflow-hidden shadow-xl"
                                >
                                    {/* GLOW EFFECT */}
                                    <div className={cn(
                                        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity duration-700",
                                        isOwner ? "bg-blue-600" : "bg-emerald-600"
                                    )} />

                                    <div className="flex items-start justify-between relative z-10">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                            isOwner ? "bg-blue-500/10 border-blue-500/20" : "bg-emerald-500/10 border-emerald-500/20"
                                        )}>
                                            {backpack.emoji || '🎒'}
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                                                {backpack.accessType === 'owner_only' && <Lock className="w-3 h-3 text-white/40" />}
                                                {backpack.accessType === 'custom' && <Users className="w-3 h-3 text-blue-500" />}
                                                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest leading-none">
                                                    {(() => {
                                                        // Custom logic
                                                        const roles = backpack.allowedRoles?.length || 0;
                                                        const users = backpack.allowedUsers?.length || 0;

                                                        if (roles > 0 && users > 0) return 'PERSONALIZADA';
                                                        if (roles > 0) return 'ROL';
                                                        return 'PERSONAL';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 relative z-10">
                                        <h3 className="font-black text-white text-2xl truncate mb-1 uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">
                                            {backpack.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full animate-pulse",
                                                isOwner ? "bg-blue-500" : "bg-emerald-500"
                                            )} />
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{isOwner ? 'Mochila Personal' : 'Mochila Compartida'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-white/[0.03] relative z-10">
                                        <div className="flex justify-between items-end mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Carga</span>
                                                <span className={cn(
                                                    "text-lg font-black italic tracking-tighter leading-none",
                                                    itemCount >= backpack.capacity ? "text-red-500" : "text-white"
                                                )}>
                                                    {itemCount}<span className="text-white/20 text-sm not-italic ml-1">/ {backpack.capacity}</span>
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-bold text-white/40 px-3 py-1 bg-white/[0.03] rounded-full">
                                                {Math.round((itemCount / backpack.capacity) * 100)}%
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/[0.03] rounded-full overflow-hidden p-[2px] border border-white/[0.05]">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]",
                                                    isOwner ? "bg-gradient-to-r from-blue-600 to-blue-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                                                )}
                                                style={{ width: `${Math.min((itemCount / backpack.capacity) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* HOVER OVERLAY BUTTON */}
                                    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-gradient-to-t from-blue-600/20 to-transparent p-4 flex justify-center backdrop-blur-[2px]">
                                        <div className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-blue-600/20">
                                            Abrir Mochila
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {/* BACKPACK MODAL */}
            {selectedBackpack && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-y-auto w-full h-full backdrop-blur-md bg-black/60 animate-fade-in text-left">
                    {/* BACKDROP CLICK TO CLOSE */}
                    <div className="absolute inset-0" onClick={() => setSelectedBackpack(null)} />

                    <div className="relative w-full max-w-2xl bg-[#0a0c10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
                        {/* HEADER */}
                        <div className="flex items-center justify-between p-8 border-b border-white/5 bg-[#0d0f12]">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-[#15181e] rounded-2xl flex items-center justify-center text-4xl border border-white/5 shadow-inner">
                                    🎒
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{selectedBackpack.name}</h2>
                                    <div className="flex items-center gap-3 text-sm mt-1">
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg font-bold uppercase tracking-wider text-xs border border-blue-500/20">
                                            {selectedBackpack.ownerId === authUser?.id ? 'Tu Propiedad' : 'Compartida'}
                                        </span>
                                        <span className="text-white/40 font-medium">
                                            {selectedBackpack.items.length} / {selectedBackpack.capacity} Items
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedBackpack(null)}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {selectedBackpack.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-white/20 gap-4">
                                    <Package className="w-12 h-12" />
                                    <p className="font-bold">Esta mochila está vacía</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {selectedBackpack.items.map((item, idx) => (
                                        <div key={idx} className="bg-[#15181e] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center gap-3 hover:border-white/10 transition-colors group">
                                            <div className="w-12 h-12 bg-[#0a0c10] rounded-xl flex items-center justify-center text-2xl border border-white/5 shadow-inner">
                                                {item.emoji}
                                            </div>
                                            <div className="w-full">
                                                <h4 className="font-bold text-white text-sm truncate uppercase tracking-tight">{item.name}</h4>
                                                <p className="text-xs text-white/40 mt-1 line-clamp-1">{item.description || 'Sin descripción'}</p>
                                                <div className="mt-3 inline-block px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-emerald-400 border border-white/5">
                                                    x{item.amount}
                                                </div>
                                            </div>

                                            {/* WITHDRAW BUTTON */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setWithdrawingItem({ id: item.itemId || item.id, name: item.name, amount: item.amount });
                                                    setWithdrawAmount(1);
                                                }}
                                                className="w-full mt-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold uppercase text-[10px] tracking-widest rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                Sacar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* WITHDRAW MODAL */}
            {withdrawingItem && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0c0e12] border border-white/10 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95 text-center">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">Retirar Objeto</h3>
                        <p className="text-white/50 text-sm mb-6">¿Cuántos <span className="text-white font-bold">{withdrawingItem.name}</span> quieres sacar?</p>

                        <div className="flex items-center gap-4 justify-center mb-6">
                            <button
                                onClick={() => setWithdrawAmount(Math.max(1, withdrawAmount - 1))}
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                            >
                                -
                            </button>
                            <span className="text-2xl font-black text-white tabular-nums w-12">{withdrawAmount}</span>
                            <button
                                onClick={() => setWithdrawAmount(Math.min(withdrawingItem.amount, withdrawAmount + 1))}
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                            >
                                +
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setWithdrawingItem(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white font-bold uppercase tracking-wider text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={isWithdrawing || withdrawSuccess}
                                className={cn(
                                    "flex-1 py-3 font-black uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center gap-2",
                                    withdrawSuccess ? "bg-emerald-500 text-white" : "bg-red-500 hover:bg-red-400 text-black"
                                )}
                            >
                                {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : (withdrawSuccess ? <Check className="w-4 h-4" /> : null)}
                                {withdrawSuccess ? 'RETIRADO' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
