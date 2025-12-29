import { useEffect, useState } from 'react';
import {
    Terminal, Search, Zap,
    Loader2, ChevronDown,
    Layers
} from 'lucide-react';
import { api } from '../utils/api';

export const Commands = () => {
    const [search, setSearch] = useState('');
    const [commands, setCommands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('Todos');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        api.get('/bot/commands')
            .then(res => {
                const data = res.data;
                setCommands(data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const categoriesSet = new Set(commands.map(c => c.category || 'General'));
    const allCategories = ['Todos', ...Array.from(categoriesSet).sort()];

    const filtered = commands.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.description?.toLowerCase().includes(search.toLowerCase()) ||
            c.category?.toLowerCase().includes(search.toLowerCase());

        const matchesCategory = activeCategory === 'Todos' || (c.category || 'General') === activeCategory;

        return matchesSearch && matchesCategory;
    });

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
            </div>
            <p className="text-primary font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando Núcleo...</p>
        </div>
    );

    return (
        <div className="w-full min-h-full p-4 lg:p-8 pb-20 space-y-8">
            {/* TOP HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-white/5 pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[#00aaff] tracking-[0.4em] mb-1 px-1 flex items-center gap-2">
                        <span className="text-lg leading-none">&rsaquo;</span>
                        PROTOCOLO // {activeCategory}
                    </p>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase transition-all leading-none">
                        {activeCategory === 'Todos' ? 'Comandos' : activeCategory}
                    </h1>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2 pl-1">
                        <Zap className="w-2.5 h-2.5 fill-current text-[#00aaff]" />
                        {filtered.length} Protocolos detectados
                    </p>
                </div>

                <div className="w-full md:w-80 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-all duration-300 z-10" />
                    <input
                        type="text"
                        placeholder="Buscar operación..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-14 pr-7 focus:outline-none focus:border-primary/20 focus:bg-white/[0.05] transition-all text-xs font-black uppercase tracking-widest italic placeholder:text-foreground/10 relative z-10 shadow-xl"
                    />
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* LEFT SIDEBAR: CATEGORIES */}
                <aside className="lg:w-64 w-full lg:sticky lg:top-[40px] z-40 order-2 lg:order-1 shrink-0">
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-[10px] font-black uppercase text-[#00aaff] tracking-[0.4em] mb-6 px-2 flex items-center gap-3">
                            <Layers className="w-3.5 h-3.5 fill-current opacity-80" />
                            Categorías
                        </h3>

                        <nav className="flex flex-wrap lg:flex-col gap-2">
                            {allCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`
                                        w-full px-5 py-3 rounded-xl text-left transition-all duration-300 flex items-center justify-between group relative overflow-hidden
                                        ${activeCategory === cat
                                            ? 'bg-[#00aaff] text-white shadow-[0_4px_20px_rgba(0,170,255,0.4)] scale-[1.02]'
                                            : 'text-white/30 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    <span className={`text-xs font-black uppercase italic tracking-wider z-10 ${activeCategory === cat ? 'translate-x-1' : ''} transition-transform`}>
                                        {cat}
                                    </span>
                                    {activeCategory === cat && (
                                        <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* MAIN CONTENT: LIST */}
                <main className="flex-1 min-w-0 order-1 lg:order-2">

                    {/* ELITE COMPACT COMMAND LISTING - PREMIUM LIST LAYOUT */}
                    <div className="space-y-4 pb-20">
                        {filtered.map((cmd) => {
                            const isExpanded = expandedId === cmd.name;
                            return (
                                <div
                                    key={cmd.name}
                                    className={`
                                        group relative flex flex-col bg-[#0c0e12] rounded-[1.5rem] border border-white/5 overflow-hidden transition-all duration-300
                                        ${isExpanded ? 'ring-1 ring-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] bg-[#0f1115]' : 'hover:bg-[#0f1115] hover:border-white/10'}
                                    `}
                                >
                                    {/* MAIN ROW */}
                                    <div
                                        onClick={() => toggleExpand(cmd.name)}
                                        className="p-4 md:p-5 flex items-center gap-5 cursor-pointer select-none"
                                    >
                                        {/* ICON BOX */}
                                        <div className={`
                                            w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center transition-all duration-300
                                            ${isExpanded ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/20 group-hover:bg-white/10 group-hover:text-white'}
                                        `}>
                                            <Terminal className="w-6 h-6" />
                                        </div>

                                        {/* CONTENT */}
                                        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 overflow-hidden">
                                            <div className="flex items-center gap-4">
                                                <div className={`
                                                    px-4 py-1.5 rounded-lg font-black tracking-tight uppercase text-sm transition-colors
                                                    ${isExpanded ? 'bg-white text-[#0c0e12]' : 'bg-black/40 text-white group-hover:bg-white/10'}
                                                `}>
                                                    {cmd.name}
                                                </div>
                                                <span className="hidden md:inline text-white/10 text-xl font-thin">/</span>
                                            </div>

                                            <p className={`text-sm font-bold truncate transition-colors ${isExpanded ? 'text-white/90' : 'text-white/40 group-hover:text-white/60'}`}>
                                                {cmd.description || "Sin descripción operativa."}
                                            </p>
                                        </div>

                                        {/* ARROW */}
                                        <ChevronDown className={`w-5 h-5 shrink-0 transition-all duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-white/10 group-hover:text-white/30'}`} />
                                    </div>

                                    {/* EXPANDABLE DETAILS */}
                                    <div className={`
                                        grid transition-all duration-500 ease-in-out
                                        ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                                    `}>
                                        <div className="overflow-hidden">
                                            <div className="px-6 pb-6 pt-0 space-y-6">
                                                <div className="h-px w-full bg-white/5" />

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-[4.5rem]">
                                                    {/* USAGE */}
                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black uppercase text-primary/40 tracking-[0.3em] flex items-center gap-2">
                                                            <Zap className="w-3 h-3 fill-current" />
                                                            Sintaxis
                                                        </h5>
                                                        <code className="inline-block bg-[#050607] px-4 py-2 rounded-xl border border-white/5 font-mono text-xs text-primary/90 shadow-inner">
                                                            /{cmd.name} {cmd.options?.map((o: any) => o.required ? `<${o.name}>` : `[${o.name}]`).join(' ')}
                                                        </code>
                                                    </div>

                                                    {/* PERMISSIONS */}
                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em]">Permisos</h5>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${cmd.defaultMemberPermissions ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                                                                {cmd.defaultMemberPermissions ? 'Restringido' : 'Acceso Público'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filtered.length === 0 && (
                            <div className="col-span-full py-40 text-center elite-card border-dashed rounded-[3rem] bg-white/[0.01] border-white/5">
                                <div className="relative inline-block">
                                    <Search className="w-24 h-24 mx-auto mb-8 opacity-5" />
                                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                                </div>
                                <p className="text-foreground/20 font-black uppercase tracking-[0.5em] text-xl italic">Protocolo no detectado</p>
                                <button
                                    onClick={() => { setSearch(''); setActiveCategory('Todos'); }}
                                    className="mt-8 px-8 py-3 rounded-full bg-primary/10 text-primary text-xs font-black uppercase hover:bg-primary hover:text-white transition-all tracking-widest"
                                >
                                    Reiniciar Búsqueda
                                </button>
                            </div>
                        )}
                    </div>
                </main >
            </div >
        </div >
    );
};
