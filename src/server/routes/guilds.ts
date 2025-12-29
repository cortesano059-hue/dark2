import { GuildConfig, Transaction, User } from "#database";
import axios from "axios";
import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

export function guildRoutes(app: FastifyInstance, client: Client<true>) {

    // Simple in-memory cache for user guilds: UserId -> { data: any, timestamp: number }
    const guildsCache = new Map<string, { data: { active: any[], inviteable: any[] }, timestamp: number }>();
    const CACHE_TTL = 60 * 1000; // 60 seconds

    // List user's mutual guilds + inviteable guilds
    app.get("/guilds", async (req, res) => {
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Unauthorized" });

        try {
            const decoded = app.jwt.verify(token) as any;
            const accessToken = decoded.accessToken;
            const userId = decoded.id;

            if (!accessToken) {
                // Fallback to mutual guilds if no token (shouldn't happen with new login)
                const mutualGuilds = client.guilds.cache.filter(g => g.members.cache.has(userId));
                return res.send({
                    active: mutualGuilds.map(g => ({
                        id: g.id,
                        name: g.name,
                        icon: g.icon,
                    })),
                    inviteable: []
                });
            }

            // Check Cache
            const cached = guildsCache.get(userId);
            if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
                return res.send(cached.data);
            }

            // Fetch ALL user guilds from Discord API
            const response = await axios.get("https://discord.com/api/users/@me/guilds", {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const userGuilds = response.data as any[];
            const active: any[] = [];
            const inviteable: any[] = [];

            for (const g of userGuilds) {
                const isAdmin = (BigInt(g.permissions) & BigInt(0x8)) === BigInt(0x8) || g.owner;
                // if (!isAdmin) continue; // REMOVED: We want all mutual guilds

                const botInGuild = client.guilds.cache.get(g.id);
                const guildData = {
                    id: g.id,
                    name: g.name,
                    icon: g.icon,
                    isAdmin: isAdmin // ADDED: Permission flag
                };

                if (botInGuild) {
                    active.push(guildData);
                } else if (isAdmin) {
                    // Only show inviteable if user is actually admin
                    inviteable.push(guildData);
                }
            }

            const result = { active, inviteable };

            // Set Cache
            console.log(`[Guilds] Fetched for ${userId}: ${active.length} active, ${inviteable.length} inviteable`);
            // active.forEach(g => console.log(` - Active: ${g.name} (Admin: ${g.isAdmin})`));

            guildsCache.set(userId, { data: result, timestamp: Date.now() });

            return res.send(result);
        } catch (error: any) {
            console.error("Guilds Fetch Error:", error.response?.data || error.message);
            // If Rate Limited/Error, try to return stale cache if available
            if (token) {
                try {
                    const decoded = app.jwt.verify(token) as any;
                    const cached = guildsCache.get(decoded.id);
                    if (cached) return res.send(cached.data);
                } catch { }
            }
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Failed to fetch guilds" });
        }
    });

    // Get specific guild config + dashboard data
    app.get("/guilds/:id", async (req, res) => {
        const { id } = req.params as { id: string };
        const guild = client.guilds.cache.get(id);
        if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Guild not found" });

        const config = await GuildConfig.findOne({ guildId: id }) || {
            prefix: ".",
            modsRole: null,
            currencySymbol: "$",
            initialMoney: 0,
            initialBank: 5000
        };

        return res.send({
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                roleCount: guild.roles.cache.size,
                channelCount: guild.channels.cache.size,
            },
            config
        });
    });

    // Get Real Activity (Transactions)
    app.get("/guilds/:id/activity", async (req, res) => {
        const { id } = req.params as { id: string };
        const actions = await Transaction.find({ guildId: id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const activity = actions.map(a => {
            const user = client.users.cache.get(a.userId);
            return {
                id: a._id,
                user: user?.username || "Usuario Desconocido",
                avatar: user?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
                type: a.type,
                amount: a.amount,
                timestamp: a.createdAt
            };
        });

        return res.send(activity);
    });

    // List Channels for selection
    app.get("/guilds/:id/channels", async (req, res) => {
        const { id } = req.params as { id: string };
        const guild = client.guilds.cache.get(id);
        if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Guild not found" });

        const channels = guild.channels.cache
            .filter(c => c.isTextBased())
            .map(c => ({
                id: c.id,
                name: c.name
            }));

        return res.send(channels);
    });

    // List Roles for selection
    app.get("/guilds/:id/roles", async (req, res) => {
        const { id } = req.params as { id: string };
        const guild = client.guilds.cache.get(id);
        if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Guild not found" });

        const roles = guild.roles.cache
            .filter(r => r.name !== "@everyone")
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.hexColor
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return res.send(roles);
    });

    // List Members for Management
    app.get("/guilds/:id/members", async (req, res) => {
        const { id: _id } = req.params as { id: string };

        // In a real database, we would match Guild Users. 
        // Here we'll get users that have entry in this guild's economy or inventory
        const membersData = await User.find().lean();

        const members = await Promise.all(membersData.map(async (m) => {
            const discordUser = await client.users.fetch(m.userId).catch(() => null);
            return {
                userId: m.userId,
                username: discordUser?.username || "Unknown",
                avatar: discordUser?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
                money: m.money,
                bank: m.bank
            };
        }));

        return res.send(members);
    });

    // Update User Economy (Admin)
    app.patch("/guilds/:id/members/:userId", async (req, res) => {
        const { userId } = req.params as { userId: string };
        const { money, bank } = req.body as { money?: number, bank?: number };

        const user = await User.findOne({ userId, guildId: req.params.id });
        if (!user) return res.status(StatusCodes.NOT_FOUND).send({ error: "User not found" });

        if (money !== undefined) user.money = money;
        if (bank !== undefined) user.bank = bank;

        await user.save();
        return res.send({ success: true });
    });

    app.patch("/guilds/:id/settings", async (req, res) => {
        const { id } = req.params as { id: string };
        const body = req.body as any;

        await GuildConfig.findOneAndUpdate(
            { guildId: id },
            { $set: body },
            { upsert: true }
        );

        return res.send({ success: true });
    });
}
