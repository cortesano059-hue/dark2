import { Landmark, Loader2, Package, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

interface Item {
    id: string;
    name: string;
    amount: number;
    emoji: string;
    description?: string;
}

interface UserData {
    userId: string;
    money: number;
    bank: number;
    username: string;
    avatar: string;
    inventory: Item[];
}

export const Profile = () => {
    const { user: authUser } = useAuth();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authUser) return;

        // Fetch global profile or default guild profile
        // Assuming 'none' or specific logic for global profile
        api.get(`/economy/user/${authUser.id}/none`)
            .then(res => setUser(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [authUser]);

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;
    if (!user) return <div className="text-center py-20">No se encontró el perfil.</div>;

    const total = user.money + user.bank;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent shadow-2xl">
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-primary to-purple-500 shadow-2xl relative group">
                    <img src={user.avatar} className="w-full h-full rounded-full border-4 border-[#030712] object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl -z-10 animate-pulse" />
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-4xl font-black mb-2 tracking-tight">{user.username}</h1>
                    <p className="text-foreground/40 font-mono tracking-[0.3em] text-xs uppercase">Miembro Verificado</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Total</p>
                        </div>
                        <p className="text-2xl font-black text-white">${total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Global</p>
                        </div>
                        <p className="text-2xl font-black text-white">#--</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass p-8 rounded-3xl border border-white/5 space-y-8">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-green-500" />
                            Economía
                        </h2>
                        <div className="space-y-6">
                            <div className="group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-foreground/40 text-xs font-bold uppercase">En Mano</span>
                                    <span className="text-green-500 font-bold">${user.money.toLocaleString()}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(user.money / total) * 100}%` }} />
                                </div>
                            </div>

                            <div className="group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-foreground/40 text-xs font-bold uppercase">En Banco</span>
                                    <span className="text-blue-500 font-bold">${user.bank.toLocaleString()}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(user.bank / total) * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                                <Landmark className="w-4 h-4" /> Ver Historial
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="glass p-8 rounded-3xl border border-white/5 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                Mochila / Inventario
                            </h2>
                            <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full uppercase">
                                {user.inventory.length} Objetos
                            </span>
                        </div>

                        {user.inventory.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {user.inventory.map((item) => (
                                    <div key={item.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col items-center text-center group hover:border-primary/50 transition-all hover:bg-white/10">
                                        <span className="text-4xl mb-3 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">
                                            {item.emoji}
                                        </span>
                                        <p className="text-xs font-bold truncate w-full mb-1">{item.name}</p>
                                        <span className="bg-primary/20 text-primary text-[10px] px-3 py-1 rounded-full font-black">
                                            x{item.amount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                    <Package className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="text-foreground/20 font-bold">Tu mochila está vacía por ahora.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
