import { BackpackModel, Inventory, Item, User } from "#database";
import { StatusCodes } from "http-status-codes";
import * as eco from "../../economy/index.js";
import { checkRequirements } from "../../items/checkRequirements.js";
import { consumeRequirements } from "../../items/consumeRequirements.js";
import { runItem } from "../../items/engine.js";
function economyRoutes(app, client) {
  app.get("/economy/leaderboard", async (_req, res) => {
    const topUsers = await User.aggregate([
      {
        $group: {
          _id: "$userId",
          money: { $sum: "$money" },
          bank: { $sum: "$bank" },
          total: { $sum: { $add: ["$money", "$bank"] } }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    const leaderboard = await Promise.all(topUsers.map(async (u, index) => {
      const discordUser = await client.users.fetch(u._id).catch(() => null);
      return {
        rank: index + 1,
        userId: u._id,
        username: discordUser?.username || "Unknown",
        avatar: discordUser?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
        money: u.money,
        bank: u.bank,
        total: u.total
      };
    }));
    return res.send(leaderboard);
  });
  app.get("/economy/stats/:guildId", async (req, res) => {
    const { guildId } = req.params;
    const users = await User.find({ guildId }).lean();
    const totalMoney = users.reduce((sum, u) => sum + (u.money || 0) + (u.bank || 0), 0);
    const totalItems = await Item.countDocuments({
      $or: [{ guildId }, { guildId: { $exists: false } }]
    });
    return res.send({
      totalLevels: 0,
      totalMoney,
      totalItems
    });
  });
  app.post("/economy/deposit", async (req, res) => {
    const { userId, guildId, amount } = req.body;
    if (!userId || !guildId || amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "Invalid data" });
    }
    const result = await eco.deposit(userId, guildId, amount);
    if (result.success) {
      return res.send({ success: true, message: `Has depositado $${amount}.` });
    } else {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: result.message || "Error al depositar." });
    }
  });
  app.post("/economy/withdraw", async (req, res) => {
    const { userId, guildId, amount } = req.body;
    if (!userId || !guildId || amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "Invalid data" });
    }
    const result = await eco.withdraw(userId, guildId, amount);
    if (result.success) {
      return res.send({ success: true, message: `Has retirado $${amount}.` });
    } else {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: result.message || "Error al retirar." });
    }
  });
  app.get("/economy/user/:userId/:guildId", async (req, res) => {
    const { userId, guildId } = req.params;
    const userDoc = await eco.getUser(userId, guildId);
    if (!userDoc) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Failed to load/create user" });
    const u = userDoc.toObject();
    const inventory = await Inventory.find({ userId, guildId }).populate("itemId").lean();
    const discordUser = await client.users.fetch(userId).catch(() => null);
    const resolvedNames = {};
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      const snowflakeRegex = /\d{17,20}/g;
      const itemIds = /* @__PURE__ */ new Set();
      inventory.forEach((i) => {
        const scanForIds = (obj) => {
          if (!obj) return;
          const values = Array.isArray(obj) ? obj : Object.values(obj);
          values.forEach((val) => {
            if (typeof val === "string") {
              const matches = val.match(snowflakeRegex);
              if (matches) {
                matches.forEach((id) => {
                  const role = guild.roles.cache.get(id);
                  if (role) resolvedNames[id] = role.name;
                });
              }
              if (val.includes("item:")) {
                const parts = val.split(":");
                const id = parts.find((p) => p.length > 5 && p !== "item" && p !== "add" && p !== "remove");
                if (id) itemIds.add(id);
              }
            }
          });
        };
        const scanObjects = (obj) => {
          if (!obj || Array.isArray(obj)) return;
          ["addItem", "removeItem", "item"].forEach((key) => {
            if (obj[key]) itemIds.add(obj[key]);
          });
        };
        scanForIds(i.itemId.actions);
        scanForIds(i.itemId.requirements);
        scanObjects(i.itemId.actions);
        scanObjects(i.itemId.requirements);
      });
      if (itemIds.size > 0) {
        const foundItems = await Item.find({ _id: { $in: Array.from(itemIds) } }).select("itemName").lean();
        foundItems.forEach((item) => {
          resolvedNames[item._id.toString()] = item.itemName;
        });
      }
    }
    const mappedInventory = [];
    const migrationPromises = [];
    for (const i of inventory) {
      if (i.itemId) {
        mappedInventory.push({
          id: i.itemId._id,
          name: i.itemId.itemName,
          emoji: i.itemId.emoji || "\u{1F4E6}",
          amount: i.amount,
          description: i.itemId.description,
          usable: i.itemId.usable,
          actions: i.itemId.actions,
          requirements: i.itemId.requirements
        });
      } else {
        const orphanId = i.itemId ? null : i._id_raw || i.itemId;
        const cached = u.inventory_cache?.find((c) => String(c.id) === String(i.itemId));
        if (cached) {
          const matchedItem = await Item.findOne({
            guildId,
            itemName: { $regex: `^${cached.name}$`, $options: "i" }
          });
          if (matchedItem) {
            migrationPromises.push(Inventory.updateOne({ _id: i._id }, { itemId: matchedItem._id }));
            mappedInventory.push({
              id: matchedItem._id,
              name: matchedItem.itemName,
              emoji: matchedItem.emoji || "\u{1F4E6}",
              amount: i.amount,
              description: matchedItem.description,
              usable: matchedItem.usable,
              actions: matchedItem.actions,
              requirements: matchedItem.requirements
            });
            continue;
          }
        }
        mappedInventory.push({
          id: i.itemId,
          name: cached?.name || "Objeto Desconocido",
          emoji: "\u2753",
          amount: i.amount,
          description: "Este objeto no existe en la base de datos actual. (Roto)",
          usable: false,
          isOrphan: true
        });
      }
    }
    if (migrationPromises.length > 0) await Promise.all(migrationPromises);
    return res.send({
      ...u,
      username: discordUser?.username,
      avatar: discordUser?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
      resolvedNames,
      inventory: mappedInventory
    });
  });
  app.get("/economy/backpacks/:userId/:guildId", async (req, res) => {
    const { userId, guildId } = req.params;
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    let roleIds = [];
    try {
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) roleIds = member.roles.cache.map((r) => r.id);
      }
    } catch (e) {
      console.error(`[API] Error fetching member ${userId} for backpack access:`, e);
    }
    const query = {
      $and: [
        {
          $or: [
            { guildId },
            { guildId: { $exists: false } }
          ]
        },
        {
          $or: [
            { ownerId: userId },
            { allowedUsers: userId },
            { allowedRoles: { $in: roleIds } }
          ]
        }
      ]
    };
    const backpacks = await BackpackModel.find(query).lean();
    if (backpacks.length === 0) return res.send([]);
    try {
      const validIds = /* @__PURE__ */ new Set();
      const validNames = /* @__PURE__ */ new Set();
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      backpacks.forEach((bp) => {
        if (bp.items) {
          const itemsObj = bp.items instanceof Map ? Object.fromEntries(bp.items) : bp.items;
          Object.values(itemsObj).forEach((i) => {
            if (i && i.itemId) {
              if (objectIdRegex.test(i.itemId)) {
                validIds.add(i.itemId);
              } else {
                validNames.add(i.itemId);
              }
            }
          });
        }
      });
      const [itemsById, itemsByName] = await Promise.all([
        Item.find({ _id: { $in: Array.from(validIds) } }).lean(),
        Item.find({ itemName: { $in: Array.from(validNames) } }).lean()
      ]);
      const itemMap = /* @__PURE__ */ new Map();
      itemsById.forEach((i) => itemMap.set(i._id.toString(), i));
      itemsByName.forEach((i) => itemMap.set(i.itemName, i));
      const migrationPromises = [];
      const populatedBackpacks = backpacks.map((bp) => {
        const populatedItems = [];
        let wasModified = false;
        const itemsObj = bp.items instanceof Map ? Object.fromEntries(bp.items) : bp.items || {};
        const newItemsMap = {};
        Object.entries(itemsObj).forEach(([key, val]) => {
          if (!val || !val.itemId) return;
          let finalItemId = val.itemId;
          let resolvedItem = itemMap.get(val.itemId);
          if (!objectIdRegex.test(val.itemId) && resolvedItem && resolvedItem._id) {
            finalItemId = resolvedItem._id.toString();
            wasModified = true;
            newItemsMap[finalItemId] = {
              itemId: finalItemId,
              amount: val.amount
            };
          } else {
            newItemsMap[key] = val;
          }
          if (resolvedItem) {
            populatedItems.push({
              itemId: resolvedItem._id,
              name: resolvedItem.itemName,
              description: resolvedItem.description,
              emoji: resolvedItem.emoji || "\u{1F4E6}",
              amount: val.amount,
              type: resolvedItem.type,
              rarity: resolvedItem.rarity || "comun",
              usable: resolvedItem.usable,
              actions: resolvedItem.actions,
              requirements: resolvedItem.requirements
            });
          } else {
            populatedItems.push({
              itemId: val.itemId,
              id: val.itemId,
              name: val.itemName || (objectIdRegex.test(val.itemId) ? `ID: ${val.itemId.slice(-6)}...` : val.itemId),
              description: "Item no encontrado en base de datos. Se recomienda sacarlo.",
              emoji: "\u2753",
              amount: val.amount,
              isOrphan: true
            });
          }
        });
        if (wasModified) {
          migrationPromises.push(
            BackpackModel.updateOne({ _id: bp._id }, { $set: { items: newItemsMap } }).catch((e) => console.error(`[Backpacks] Migration failed for ${bp._id}`, e))
          );
        }
        return { ...bp, items: populatedItems };
      });
      if (migrationPromises.length > 0) {
        await Promise.all(migrationPromises);
      }
      return res.send(populatedBackpacks);
    } catch (error) {
      console.error("[Backpacks] Error populating items:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Failed to load backpacks" });
    }
  });
  app.get("/economy/shop/:guildId", async (req, res) => {
    const { guildId } = req.params;
    const { mode } = req.query;
    let userId;
    let isAdmin = false;
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = app.jwt.verify(token);
        userId = decoded.id;
      } catch (e) {
      }
    }
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    let member = null;
    if (guild && userId) {
      member = await guild.members.fetch({ user: userId, force: true }).catch(() => null);
      if (member) {
        if (member.permissions.has("ManageGuild") || guild.ownerId === userId) {
          isAdmin = true;
        }
      } else if (guild.ownerId === userId) {
        isAdmin = true;
      }
    }
    const isCatalogMode = mode === "admin" && isAdmin;
    console.log(`[Shop] Request for ${guildId} | User: ${userId} | Admin: ${isAdmin} | Mode: ${mode} | Catalog: ${isCatalogMode}`);
    const query = {};
    if (isCatalogMode) {
      console.log(`[Shop] Admin Mode: Fetching ALL items`);
    } else {
      query.$or = [{ guildId }, { guildId: { $exists: false } }];
      query.price = { $gte: 0 };
    }
    let items = await Item.find(query).lean();
    console.log(`[Shop] Found ${items.length} items before filter`);
    if (!isCatalogMode && member) {
      items = items.filter((item) => {
        const reqs = item.requirements || [];
        for (const r of reqs) {
          const parts = String(r).replace(/"/g, "").split(":").map((s) => s.trim());
          if (parts[0] === "role" && parts[1]) {
            const requiredRoleId = parts[1];
            if (!member.roles.cache.has(requiredRoleId)) {
              return false;
            }
          }
        }
        return true;
      });
      console.log(`[Shop] ${items.length} items after role filter`);
    }
    const idsToResolve = /* @__PURE__ */ new Map();
    const snowflakeRegex = /\d{17,20}/;
    items.forEach((item) => {
      [...item.actions || [], ...item.requirements || []].forEach((act) => {
        const str = String(act).replace(/"/g, "");
        const parts = str.split(":").map((s) => s.trim());
        const idPart = parts.find((p) => snowflakeRegex.test(p));
        if (idPart) {
          if (str.includes("role")) idsToResolve.set(idPart, "role");
          else if (str.includes("channel")) idsToResolve.set(idPart, "channel");
        }
      });
    });
    const resolvedNames = {};
    if (idsToResolve.size > 0 && guild) {
      try {
        await guild.roles.fetch();
        try {
          await guild.channels.fetch();
        } catch (e) {
        }
        for (const [id, type] of idsToResolve.entries()) {
          if (type === "role") {
            const role = guild.roles.cache.get(id);
            if (role) resolvedNames[id] = role.name;
          } else if (type === "channel") {
            const channel = guild.channels.cache.get(id);
            if (channel) resolvedNames[id] = channel.name;
          }
        }
      } catch (err) {
        console.error("Error fetching dependencies for shop:", err);
      }
    }
    return res.send({ items, resolvedNames });
  });
  app.post("/economy/buy", async (req, res) => {
    const { itemId, guildId } = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });
    const decoded = app.jwt.verify(token);
    const userId = decoded.id;
    const item = await Item.findById(itemId);
    if (!item || item.price === void 0 || item.price < 0) return res.status(StatusCodes.NOT_FOUND).send({ error: "Item not found or has invalid price" });
    const user = await eco.getUser(userId, guildId);
    if (!user || user.money < item.price) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "No tienes suficiente dinero" });
    }
    user.money -= item.price;
    await user.save();
    const { logger } = await import("../../utils/logger.js");
    await logger.logTransaction({
      userId,
      guildId,
      type: "compra",
      amount: -item.price,
      extra: { itemId: item._id, itemName: item.itemName }
    });
    let inv = await Inventory.findOne({ userId, guildId, itemId: item._id });
    if (inv) {
      inv.amount += 1;
      await inv.save();
    } else {
      await Inventory.create({ userId, guildId, itemId: item._id, amount: 1 });
    }
    return res.send({ success: true, newBalance: user.money });
  });
  app.post("/economy/shop/:guildId/items", async (req, res) => {
    const { guildId } = req.params;
    const body = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "No autorizado" });
    try {
      const decoded = app.jwt.verify(token);
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Servidor no encontrado" });
      const member = await guild.members.fetch(decoded.id).catch(() => null);
      if (!member || !member.permissions.has("ManageGuild")) {
        return res.status(StatusCodes.FORBIDDEN).send({ error: "Permisos insuficientes" });
      }
      const newItem = await Item.create({
        ...body,
        guildId
      });
      return res.send(newItem);
    } catch (err) {
      console.error(err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: err.message });
    }
  });
  app.patch("/economy/shop/:guildId/items/:itemId", async (req, res) => {
    const { guildId, itemId } = req.params;
    const body = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "No autorizado" });
    try {
      const decoded = app.jwt.verify(token);
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Servidor no encontrado" });
      const member = await guild.members.fetch(decoded.id).catch(() => null);
      if (!member || !member.permissions.has("ManageGuild")) {
        return res.status(StatusCodes.FORBIDDEN).send({ error: "Permisos insuficientes" });
      }
      const updated = await Item.findOneAndUpdate(
        { _id: itemId, guildId },
        { $set: body },
        { new: true }
      );
      if (!updated) return res.status(StatusCodes.NOT_FOUND).send({ error: "Item no encontrado" });
      return res.send(updated);
    } catch (err) {
      console.error(err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: err.message });
    }
  });
  app.delete("/economy/shop/:guildId/items/:itemId", async (req, res) => {
    const { guildId, itemId } = req.params;
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "No autorizado" });
    try {
      const decoded = app.jwt.verify(token);
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Servidor no encontrado" });
      const member = await guild.members.fetch(decoded.id).catch(() => null);
      if (!member || !member.permissions.has("ManageGuild")) {
        return res.status(StatusCodes.FORBIDDEN).send({ error: "Permisos insuficientes" });
      }
      await Item.deleteOne({ _id: itemId, guildId });
      return res.send({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: err.message });
    }
  });
  app.post("/economy/backpacks/deposit", async (req, res) => {
    const { itemId, guildId, backpackId, amount } = req.body;
    if (!amount || amount <= 0) return res.status(StatusCodes.BAD_REQUEST).send({ error: "Cantidad inv\xE1lida" });
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });
    const decoded = app.jwt.verify(token);
    const userId = decoded.id;
    const invItem = await Inventory.findOne({ userId, guildId, itemId });
    const inventoryEntry = await Inventory.findOne({ userId, guildId, itemId });
    if (!inventoryEntry || inventoryEntry.amount < amount) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "No tienes suficiente cantidad de este objeto." });
    }
    const bp = await BackpackModel.findById(backpackId);
    if (!bp) return res.status(StatusCodes.NOT_FOUND).send({ error: "Mochila no encontrada" });
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    let roleIds = [];
    try {
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) roleIds = member.roles.cache.map((r) => r.id);
      }
    } catch {
    }
    const hasAccess = bp.ownerId === userId || bp.allowedUsers.includes(userId) || bp.allowedRoles.some((r) => roleIds.includes(r));
    if (!hasAccess) return res.status(StatusCodes.FORBIDDEN).send({ error: "No tienes permiso para acceder a esta mochila." });
    const currentSize = Object.keys(bp.items || {}).length;
    const items = bp.items instanceof Map ? Object.fromEntries(bp.items) : bp.items || {};
    if (!items[itemId] && currentSize >= bp.capacity) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "La mochila est\xE1 llena." });
    }
    inventoryEntry.amount -= amount;
    if (inventoryEntry.amount <= 0) {
      await inventoryEntry.deleteOne();
    } else {
      await inventoryEntry.save();
    }
    if (items[itemId]) {
      items[itemId].amount += amount;
    } else {
      items[itemId] = {
        itemId,
        amount
      };
    }
    await BackpackModel.updateOne({ _id: backpackId }, { $set: { items } });
    return res.send({ success: true });
  });
  app.post("/economy/backpacks/withdraw", async (req, res) => {
    const { itemId, guildId, backpackId, amount } = req.body;
    if (!amount || amount <= 0) return res.status(StatusCodes.BAD_REQUEST).send({ error: "Cantidad inv\xE1lida" });
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });
    const decoded = app.jwt.verify(token);
    const userId = decoded.id;
    const bp = await BackpackModel.findById(backpackId);
    if (!bp) return res.status(StatusCodes.NOT_FOUND).send({ error: "Mochila no encontrada" });
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    let roleIds = [];
    try {
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) roleIds = member.roles.cache.map((r) => r.id);
      }
    } catch {
    }
    const hasAccess = bp.ownerId === userId || bp.allowedUsers.includes(userId) || bp.allowedRoles.some((r) => roleIds.includes(r));
    if (!hasAccess) return res.status(StatusCodes.FORBIDDEN).send({ error: "No tienes permiso para acceder a esta mochila." });
    const items = bp.items instanceof Map ? Object.fromEntries(bp.items) : bp.items || {};
    if (!items[itemId] || items[itemId].amount < amount) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "No hay suficiente cantidad de este objeto en la mochila." });
    }
    items[itemId].amount -= amount;
    if (items[itemId].amount <= 0) {
      delete items[itemId];
    }
    let invEntry = await Inventory.findOne({ userId, guildId, itemId });
    if (invEntry) {
      invEntry.amount += amount;
      await invEntry.save();
    } else {
      await Inventory.create({
        userId,
        guildId,
        itemId,
        amount
      });
    }
    await BackpackModel.updateOne({ _id: backpackId }, { $set: { items } });
    return res.send({ success: true });
  });
  app.post("/economy/use", async (req, res) => {
    const { itemId, guildId } = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });
    const decoded = app.jwt.verify(token);
    const userId = decoded.id;
    const userDoc = await User.findOne({ userId, guildId });
    if (!userDoc) return res.status(StatusCodes.NOT_FOUND).send({ error: "Usuario no encontrado" });
    let item = await Item.findById(itemId);
    if (!item) {
      const cached = userDoc.inventory_cache?.find((c) => String(c.id) === String(itemId));
      if (cached) {
        item = await Item.findOne({
          guildId,
          itemName: { $regex: `^${cached.name}$`, $options: "i" }
        });
      }
    }
    if (!item) return res.status(StatusCodes.NOT_FOUND).send({ error: "El objeto no existe en la base de datos actual." });
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Servidor no encontrado" });
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return res.status(StatusCodes.NOT_FOUND).send({ error: "Miembro no encontrado en el servidor" });
    const user = member.user;
    let invEntry = await Inventory.findOne({ userId, guildId, itemId: item._id });
    if (!invEntry && String(item._id) !== String(itemId)) {
      invEntry = await Inventory.findOne({ userId, guildId, itemId });
      if (invEntry) {
        invEntry.itemId = item._id;
        await invEntry.save();
      }
    }
    if (!invEntry || invEntry.amount < 1) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "No tienes este objeto." });
    }
    if (!item.usable) {
      return res.status(StatusCodes.BAD_REQUEST).send({ error: "Este objeto no se puede usar." });
    }
    const mockMessages = [];
    const mockInteraction = {
      guildId,
      user,
      member,
      guild,
      deferred: false,
      replied: false,
      reply: async (msg) => {
        const content = typeof msg === "string" ? msg : msg.content || (msg.embeds ? "Embed sent" : "");
        if (msg.embeds && msg.embeds.length > 0) {
          msg.embeds.forEach((e) => {
            if (e.data && e.data.description) mockMessages.push(e.data.description);
            if (e.data.fields) {
              e.data.fields.forEach((f) => mockMessages.push(`${f.name}: ${f.value}`));
            }
          });
        } else {
          mockMessages.push(content);
        }
      },
      editReply: async (msg) => {
        const content = typeof msg === "string" ? msg : msg.content || (msg.embeds ? "Embed sent" : "");
        if (msg.embeds && msg.embeds.length > 0) {
          msg.embeds.forEach((e) => {
            if (e.data && e.data.description) mockMessages.push(e.data.description);
            if (e.data.fields) {
              e.data.fields.forEach((f) => mockMessages.push(`${f.name}: ${f.value}`));
            }
          });
        } else {
          mockMessages.push(content);
        }
      },
      followUp: async (msg) => {
        const content = typeof msg === "string" ? msg : msg.content || (msg.embeds ? "Embed sent" : "");
        mockMessages.push(content);
      }
    };
    const ctx = {
      guildId,
      userId,
      user,
      member,
      guild,
      interaction: mockInteraction,
      rolesGiven: [],
      rolesRemoved: [],
      itemsGiven: [],
      money: 0,
      moneyChanges: { add: 0, remove: 0 },
      bank: { add: 0, remove: 0 },
      customMessage: null,
      item
    };
    try {
      await checkRequirements(item, ctx);
    } catch (err) {
      let msg = "Requisitos no cumplidos.";
      if (err.message === "REQUIRE_MONEY") msg = "No tienes suficiente dinero.";
      if (err.message === "REQUIRE_ITEM") msg = "No tienes los items requeridos.";
      if (err.message === "REQUIRE_ROLE") msg = "No cumples los requisitos de rol.";
      return res.status(StatusCodes.BAD_REQUEST).send({ error: msg });
    }
    await consumeRequirements(item, ctx);
    const rem = await eco.removeItem(userId, guildId, item.itemName, 1);
    if (!rem.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Error al consumir el item." });
    }
    await runItem(item, ctx);
    return res.send({
      success: true,
      message: ctx.customMessage || mockMessages.join("\n") || "Objeto usado correctamente.",
      effects: {
        money: ctx.moneyChanges,
        itemsGiven: ctx.itemsGiven,
        rolesGiven: ctx.rolesGiven
      }
    });
  });
}
export {
  economyRoutes
};
