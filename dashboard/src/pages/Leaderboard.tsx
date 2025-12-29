import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Coins, Banknote } from 'lucide-react';

interface LeaderboardUser {
    rank: number;
    userId: string;
    username: string;
    avatar: string;
    money: number;
    bank: number;
    total: number;
}

export const Leaderboard = () => {
    const [data, setData] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/economy/leaderboard')
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="p-5 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em] mb-1 px-1">Clasificación Global</p>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase transition-all">Protocolos de Élite</h1>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mt-1 italic">Ranking de los nodos con mayor acumulación de activos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.slice(0, 3).map((user, i) => (
                    <div key={user.userId} className={`glass p-8 rounded-3xl border border-white/5 relative overflow-hidden group ${i === 0 ? 'border-yellow-500/30' : i === 1 ? 'border-slate-400/30' : 'border-amber-600/30'}`}>
                        <div className={`absolute top-0 right-0 p-4 font-black text-6xl opacity-10 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-600'}`}>
                            #{user.rank}
                        </div>

                        <div className="relative flex flex-col items-center text-center">
                            <div className={`w-24 h-24 rounded-full p-1 mb-4 ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-600 shadow-amber-600/20 shadow-lg'}`}>
                                <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full border-4 border-[#030712] object-cover" />
                            </div>
                            <h3 className="text-xl font-bold">{user.username}</h3>
                            <p className="text-primary font-black text-2xl mt-2">${user.total.toLocaleString()}</p>
                            <div className="mt-4 flex gap-4 text-xs font-medium text-foreground/40">
                                <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {user.money.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> {user.bank.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-8 py-4 text-sm font-bold uppercase tracking-wider text-foreground/40">Rango</th>
                            <th className="px-8 py-4 text-sm font-bold uppercase tracking-wider text-foreground/40">Usuario</th>
                            <th className="px-8 py-4 text-sm font-bold uppercase tracking-wider text-foreground/40 text-right">Efectivo</th>
                            <th className="px-8 py-4 text-sm font-bold uppercase tracking-wider text-foreground/40 text-right">Banco</th>
                            <th className="px-8 py-4 text-sm font-bold uppercase tracking-wider text-foreground/40 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.slice(3).map((user) => (
                            <tr key={user.userId} className="hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-4 font-bold text-foreground/40">#{user.rank}</td>
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-4">
                                        <img src={user.avatar} className="w-10 h-10 rounded-full" />
                                        <span className="font-bold group-hover:text-primary transition-colors">{user.username}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-4 text-right font-medium text-green-500/80">${user.money.toLocaleString()}</td>
                                <td className="px-8 py-4 text-right font-medium text-blue-500/80">${user.bank.toLocaleString()}</td>
                                <td className="px-8 py-4 text-right font-black text-primary">${user.total.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
