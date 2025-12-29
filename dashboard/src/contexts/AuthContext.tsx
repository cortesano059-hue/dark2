import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import { api } from '../utils/api';

interface User {
    id: string;
    username: string;
    avatar: string;
}

interface BotInfo {
    id: string;
    username: string;
    avatar: string;
}

interface Guild {
    id: string;
    name: string;
    icon: string;
    isAdmin?: boolean;
}

interface GuildsResponse {
    active: Guild[];
    inviteable: Guild[];
}

interface AuthContextType {
    user: User | null;
    botInfo: BotInfo;
    guilds: GuildsResponse;
    loading: boolean;
    guildsError: boolean;
    logout: () => void;
    refreshGuilds: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [botInfo, setBotInfo] = useState<BotInfo>(() => {
        const saved = localStorage.getItem('botInfo');
        return saved ? JSON.parse(saved) : { id: '', username: '', avatar: '' };
    });
    const [guilds, setGuilds] = useState<GuildsResponse>({ active: [], inviteable: [] });
    const [loading, setLoading] = useState(true);
    const [guildsError, setGuildsError] = useState(false);

    const refreshGuilds = async () => {
        setGuildsError(false);
        try {
            const res = await api.get('/guilds');
            setGuilds(res.data);
            localStorage.setItem('guildCache', JSON.stringify(res.data));
        } catch (err) {
            console.error("Failed to fetch guilds:", err);
            setGuildsError(true);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Fetch User
                const userRes = await api.get('/auth/@me').catch(() => null);
                if (userRes) {
                    setUser(userRes.data);
                    // Always fetch fresh guilds to ensure permissions (isAdmin) and list are up-to-date
                    await refreshGuilds();
                }

                // Fetch Bot Info (Persists through session)
                const botRes = await api.get('/bot/info').catch(() => null);
                if (botRes) {
                    setBotInfo(botRes.data);
                    localStorage.setItem('botInfo', JSON.stringify(botRes.data));
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const logout = async () => {
        await api.get('/auth/logout');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, botInfo, guilds, loading, guildsError, logout, refreshGuilds }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
