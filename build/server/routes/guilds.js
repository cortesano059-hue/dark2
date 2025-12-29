import { GuildConfig, Transaction, User } from "#database";
import axios from "axios";
import { StatusCodes } from "http-status-codes";
function guildRoutes(app, client) {
  const guildsCache = /* @__PURE__ */ new Map();
  const CACHE_TTL = 60 * 1e3;
  app.get("/guilds", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Unauthorized" });
    try {
      const decoded = app.jwt.verify(token);
      const accessToken = decoded.accessToken;
      const userId = decoded.id;
      if (!accessToken) {
        const mutualGuilds = client.guilds.cache.filter((g) => g.members.cache.has(userId));
        return res.send({
          active: mutualGuilds.map((g) => ({
            id: g.id,
            name: g.name,
            icon: g.icon
          })),
          inviteable: []
        });
      }
      const cached = guildsCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.send(cached.data);
      }
      const response = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const userGuilds = response.data;
      const active = [];
      const inviteable = [];
      for (const g of userGuilds) {
        const isAdmin = (BigInt(g.permissions) & BigInt(8)) === BigInt(8) || g.owner;
        const botInGuild = client.guilds.cache.get(g.id);
        const guildData = {
          id: g.id,
          name: g.name,
          icon: g.icon,
          isAdmin
          // ADDED: Permission flag
        };
        if (botInGuild) {
          active.push(guildData);
        } else if (isAdmin) {
          inviteable.push(guildData);
        }
      }
      const result = { active, inviteable };
      console.log(`[Guilds] Fetched for ${userId}: ${active.length} active, ${inviteable.length} inviteable`);
      guildsCache.set(userId, { data: result, timestamp: Date.now() });
      return res.send(result);
    } catch (error) {
      console.error("Guilds Fetch Error:", error.response?.data || error.message);
      if (token) {
        try {
          const decoded = app.jwt.verify(token);
          const cached = guildsCache.get(decoded.id);
          if (cached) return res.send(cached.data);
        } catch {
        }
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Failed to fetch guilds" });
    }
  });
  app.get("/guilds/:id", async (req, res) => {
    const { id } = req.params;
    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Guild not found" });
    const config = await GuildConfig.findOne({ guildId: id }) || {
      prefix: ".",
      modsRole: null,
      currencySymbol: "$",
      initialMoney: 0,
      initialBank: 5e3
    };
    return res.send({
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.memberCount,
        roleCount: guild.roles.cache.size,
        channelCount: guild.channels.cache.size
      },
      config
    });
  });
  app.get("/guilds/:id/activity", async (req, res) => {
    const { id } = req.params;
    const actions = await Transaction.find({ guildId: id }).sort({ createdAt: -1 }).limit(20).lean();
    const activity = actions.map((a) => {
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
  app.get("/guilds/:id/channels", async (req, res) => {
    const { id } = req.params;
    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Guild not found" });
    const channels = guild.channels.cache.filter((c) => c.isTextBased()).map((c) => ({
      id: c.id,
      name: c.name
    }));
    return res.send(channels);
  });
  app.get("/guilds/:id/roles", async (req, res) => {
    const { id } = req.params;
    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Guild not found" });
    const roles = guild.roles.cache.filter((r) => r.name !== "@everyone").map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor
    })).sort((a, b) => a.name.localeCompare(b.name));
    return res.send(roles);
  });
  app.get("/guilds/:id/members", async (req, res) => {
    const { id: _id } = req.params;
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
  app.patch("/guilds/:id/members/:userId", async (req, res) => {
    const { userId } = req.params;
    const { money, bank } = req.body;
    const user = await User.findOne({ userId, guildId: req.params.id });
    if (!user) return res.status(StatusCodes.NOT_FOUND).send({ error: "User not found" });
    if (money !== void 0) user.money = money;
    if (bank !== void 0) user.bank = bank;
    await user.save();
    return res.send({ success: true });
  });
  app.patch("/guilds/:id/settings", async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    await GuildConfig.findOneAndUpdate(
      { guildId: id },
      { $set: body },
      { upsert: true }
    );
    return res.send({ success: true });
  });
}
export {
  guildRoutes
};
