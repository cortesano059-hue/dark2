import { BackpackModel, Inventory, Item, User } from "#database";
import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import * as eco from "../../economy/index.js";
import { checkRequirements } from "../../items/checkRequirements.js";
import { consumeRequirements } from "../../items/consumeRequirements.js";
import { runItem } from "../../items/engine.js";
import { EngineContext } from "../../items/types.js";

export function economyRoutes(app: FastifyInstance, client: Client<true>) {

    // Global Leaderboard
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

    // Guild Economy Statistics
    app.get("/economy/stats/:guildId", async (req, res) => {
        const { guildId } = req.params as { guildId: string };

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

    // Deposit Money
    app.post("/economy/deposit", async (req, res) => {
        const { userId, guildId, amount } = req.body as { userId: string, guildId: string, amount: number };

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

    // Withdraw Money
    app.post("/economy/withdraw", async (req, res) => {
        const { userId, guildId, amount } = req.body as { userId: string, guildId: string, amount: number };

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

    // User Profile & Inventory for a specific guild
    app.get("/economy/user/:userId/:guildId", async (req, res) => {
        const { userId, guildId } = req.params as { userId: string, guildId: string };

        const userDoc = await eco.getUser(userId, guildId);
        if (!userDoc) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Failed to load/create user" });
        const u = userDoc.toObject();

        // Resolve item names in inventory
        const inventory = await Inventory.find({ userId, guildId })
            .populate("itemId")
            .lean();

        const discordUser = await client.users.fetch(userId).catch(() => null);

        // Resolve Role Names
        const resolvedNames: Record<string, string> = {};
        const guild = client.guilds.cache.get(guildId);

        if (guild) {
            const snowflakeRegex = /\d{17,20}/g;

            // Scan for IDs (Roles and Items)
            const itemIds = new Set<string>();

            inventory.forEach((i: any) => {
                const scanForIds = (obj: any) => {
                    if (!obj) return;
                    const values = Array.isArray(obj) ? obj : Object.values(obj);

                    values.forEach((val: any) => {
                        if (typeof val === 'string') {
                            // Role Snowflakes
                            const matches = val.match(snowflakeRegex);
                            if (matches) {
                                matches.forEach(id => {
                                    const role = guild.roles.cache.get(id);
                                    if (role) resolvedNames[id] = role.name;
                                });
                            }

                            // Item IDs (look for item:ID patterns or just IDs if in object)
                            // We'll optimistically grab things that look like mongo IDs or are explicitly prefixed
                            if (val.includes('item:')) {
                                const parts = val.split(':');
                                const id = parts.find(p => p.length > 5 && p !== 'item' && p !== 'add' && p !== 'remove');
                                if (id) itemIds.add(id);
                            }
                        }
                    });
                };

                // Also check object values strictly for 'addItem', 'removeItem', 'item'
                const scanObjects = (obj: any) => {
                    if (!obj || Array.isArray(obj)) return;
                    ['addItem', 'removeItem', 'item'].forEach(key => {
                        if (obj[key]) itemIds.add(obj[key]);
                    });
                };

                scanForIds(i.itemId.actions);
                scanForIds(i.itemId.requirements);
                scanObjects(i.itemId.actions);
                scanObjects(i.itemId.requirements);
            });

            if (itemIds.size > 0) {
                const foundItems = await Item.find({ _id: { $in: Array.from(itemIds) } }).select('itemName').lean();
                foundItems.forEach(item => {
                    resolvedNames[item._id.toString()] = item.itemName;
                });
            }
        }

        // Efficient Mapping with Recovery
        const mappedInventory = [];
        const migrationPromises = [];

        for (const i of inventory) {
            if (i.itemId) {
                // Happy path: item exists
                mappedInventory.push({
                    id: i.itemId._id,
                    name: i.itemId.itemName,
                    emoji: i.itemId.emoji || "📦",
                    amount: i.amount,
                    description: i.itemId.description,
                    usable: i.itemId.usable,
                    actions: i.itemId.actions,
                    requirements: i.itemId.requirements
                });
            } else {
                // Orphan path: try recovery
                const orphanId = i.itemId ? null : (i as any)._id_raw || (i as any).itemId; // Access raw ID if possible
                // Actually in lean() + populate, i.itemId will be NULL if missing, 
                // but Mongoose keeps the original ID in the document if we didn't use lean()? 
                // With lean(), we might lose it. Let's re-fetch the raw one if needed or use cache.

                // Find in cache
                const cached = u.inventory_cache?.find((c: any) => String(c.id) === String((i as any).itemId));
                if (cached) {
                    // Try to find by name in DB
                    const matchedItem = await Item.findOne({
                        guildId,
                        itemName: { $regex: `^${cached.name}$`, $options: "i" }
                    });

                    if (matchedItem) {
                        // Recovered! Update DB for next time
                        migrationPromises.push(Inventory.updateOne({ _id: i._id }, { itemId: matchedItem._id }));
                        mappedInventory.push({
                            id: matchedItem._id,
                            name: matchedItem.itemName,
                            emoji: matchedItem.emoji || "📦",
                            amount: i.amount,
                            description: matchedItem.description,
                            usable: matchedItem.usable,
                            actions: matchedItem.actions,
                            requirements: matchedItem.requirements
                        });
                        continue;
                    }
                }

                // Still orphan
                mappedInventory.push({
                    id: (i as any).itemId,
                    name: cached?.name || "Objeto Desconocido",
                    emoji: "❓",
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

    // User Backpacks
    app.get("/economy/backpacks/:userId/:guildId", async (req, res) => {
        const { userId, guildId } = req.params as { userId: string, guildId: string };

        // Fetch member to check roles
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        let roleIds: string[] = [];
        try {
            if (guild) {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) roleIds = member.roles.cache.map(r => r.id);
            }
        } catch (e) {
            console.error(`[API] Error fetching member ${userId} for backpack access:`, e);
        }

        const query = {
            $and: [
                {
                    $or: [
                        { guildId: guildId },
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
            // Populate items manually since it's a Map of strings
            const validIds = new Set<string>();
            const validNames = new Set<string>();
            const objectIdRegex = /^[0-9a-fA-F]{24}$/;

            backpacks.forEach(bp => {
                if (bp.items) {
                    const itemsObj = bp.items instanceof Map ? Object.fromEntries(bp.items) : bp.items;
                    Object.values(itemsObj).forEach((i: any) => {
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

            const itemMap = new Map<string, any>();
            itemsById.forEach(i => itemMap.set(i._id.toString(), i));
            itemsByName.forEach(i => itemMap.set(i.itemName, i));

            const migrationPromises: Promise<any>[] = [];

            const populatedBackpacks = backpacks.map(bp => {
                const populatedItems: any[] = [];
                let wasModified = false;

                // Prepare object for potential database update (migration)
                const itemsObj = bp.items instanceof Map ? Object.fromEntries(bp.items) : (bp.items || {});
                const newItemsMap: Record<string, any> = {};

                Object.entries(itemsObj).forEach(([key, val]: [string, any]) => {
                    if (!val || !val.itemId) return;

                    let finalItemId = val.itemId;
                    let resolvedItem = itemMap.get(val.itemId);

                    // Migration Logic: Check if it's a Legacy Name and needs update
                    if (!objectIdRegex.test(val.itemId) && resolvedItem && resolvedItem._id) {
                        // It's a Name that currently exists in DB -> MIGRATE TO ID
                        finalItemId = resolvedItem._id.toString();
                        wasModified = true;

                        // Store in new map with ID as key (converting format)
                        newItemsMap[finalItemId] = {
                            itemId: finalItemId,
                            amount: val.amount
                        };
                    } else {
                        // Already correct ID or Unresolved Name -> Keep as is
                        newItemsMap[key] = val; // Keep original structure
                    }

                    if (resolvedItem) {
                        populatedItems.push({
                            itemId: resolvedItem._id,
                            name: resolvedItem.itemName,
                            description: resolvedItem.description,
                            emoji: resolvedItem.emoji || "📦",
                            amount: val.amount,
                            type: resolvedItem.type,
                            rarity: resolvedItem.rarity || "comun",
                            usable: resolvedItem.usable,
                            actions: resolvedItem.actions,
                            requirements: resolvedItem.requirements
                        });
                    } else {
                        // FALLBACK: If item is missing but we have a key that looks like a name, or just show orphan
                        populatedItems.push({
                            itemId: val.itemId,
                            id: val.itemId,
                            name: val.itemName || (objectIdRegex.test(val.itemId) ? `ID: ${val.itemId.slice(-6)}...` : val.itemId),
                            description: "Item no encontrado en base de datos. Se recomienda sacarlo.",
                            emoji: "❓",
                            amount: val.amount,
                            isOrphan: true
                        });
                    }
                }); // This closes the forEach callback

                if (wasModified) {
                    migrationPromises.push(
                        BackpackModel.updateOne({ _id: bp._id }, { $set: { items: newItemsMap } })
                            .catch(e => console.error(`[Backpacks] Migration failed for ${bp._id}`, e))
                    );
                }

                return { ...bp, items: populatedItems };
            }); // This closes the backpacks.map callback

            if (migrationPromises.length > 0) {
                await Promise.all(migrationPromises);

            }

            return res.send(populatedBackpacks);
        } catch (error) {
            console.error("[Backpacks] Error populating items:", error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Failed to load backpacks" });
        }
    });

    // Get Shop Items for a guild
    app.get("/economy/shop/:guildId", async (req, res) => {
        const { guildId } = req.params as { guildId: string };
        const { mode } = req.query as { mode?: string };

        let userId: string | undefined;
        let isAdmin = false;

        // AUTH CHECK
        const token = req.cookies.token;
        if (token) {
            try {
                const decoded = app.jwt.verify(token) as any;
                userId = decoded.id;
            } catch (e) { /* Invalid token */ }
        }

        // Fetch Guild & Member
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        let member: any = null;

        if (guild && userId) {
            // Force fetch to ensure latest roles permissions
            member = await guild.members.fetch({ user: userId, force: true }).catch(() => null);

            if (member) {
                if (member.permissions.has("ManageGuild") || guild.ownerId === userId) {
                    isAdmin = true;
                }
            } else if (guild.ownerId === userId) {
                // Fail-safe: if member fetch fails but ID matches owner
                isAdmin = true;
            }
        }

        const isCatalogMode = mode === 'admin' && isAdmin;

        console.log(`[Shop] Request for ${guildId} | User: ${userId} | Admin: ${isAdmin} | Mode: ${mode} | Catalog: ${isCatalogMode}`);

        // QUERY BUILDER
        const query: any = {};

        if (isCatalogMode) {
            // Admin Mode: Fetch ALL items in database (ignore guildId and price)
            // This allows recovering items from other servers or backups
            console.log(`[Shop] Admin Mode: Fetching ALL items`);
        } else {
            // User Mode: Fetch only Guild + Global items
            query.$or = [{ guildId }, { guildId: { $exists: false } }];
            // And ensure valid price
            query.price = { $gte: 0 };
        }

        let items = await Item.find(query).lean();
        console.log(`[Shop] Found ${items.length} items before filter`);

        // FILTERING (User Mode Only)
        if (!isCatalogMode && member) {
            items = items.filter(item => {
                const reqs = item.requirements || [];
                // Check Role Requirements for VISIBILITY
                for (const r of reqs) {
                    const parts = String(r).replace(/"/g, '').split(':').map(s => s.trim());
                    // support strict "role:ID" or loose check
                    if (parts[0] === 'role' && parts[1]) {
                        const requiredRoleId = parts[1];
                        if (!member.roles.cache.has(requiredRoleId)) {
                            // User does NOT have the role -> Hide Item
                            return false;
                        }
                    }
                }
                return true;
            });
            console.log(`[Shop] ${items.length} items after role filter`);
        }

        // 1. Extract IDs to resolve (Roles and Channels)
        const idsToResolve = new Map<string, 'role' | 'channel'>();
        const snowflakeRegex = /\d{17,20}/;

        items.forEach(item => {
            [...(item.actions || []), ...(item.requirements || [])].forEach(act => {
                const str = String(act).replace(/"/g, '');
                const parts = str.split(':').map(s => s.trim());
                const idPart = parts.find(p => snowflakeRegex.test(p));

                if (idPart) {
                    if (str.includes('role')) idsToResolve.set(idPart, 'role');
                    else if (str.includes('channel')) idsToResolve.set(idPart, 'channel');
                }
            });
        });

        // 2. Fetch Names
        const resolvedNames: Record<string, string> = {};
        if (idsToResolve.size > 0 && guild) {
            try {
                // Fetch roles and channels to ensure cache is populated
                await guild.roles.fetch();
                try { await guild.channels.fetch(); } catch (e) { /* ignore */ }

                for (const [id, type] of idsToResolve.entries()) {
                    if (type === 'role') {
                        const role = guild.roles.cache.get(id);
                        if (role) resolvedNames[id] = role.name;
                    } else if (type === 'channel') {
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

    // Buy Item
    app.post("/economy/buy", async (req, res) => {
        const { itemId, guildId } = req.body as { itemId: string, guildId: string };

        // Auth check (simple for now using cookie token)
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });

        const decoded = app.jwt.verify(token) as any;
        const userId = decoded.id;

        const item = await Item.findById(itemId);
        if (!item || item.price === undefined || item.price < 0) return res.status(StatusCodes.NOT_FOUND).send({ error: "Item not found or has invalid price" });

        const user = await eco.getUser(userId, guildId);
        if (!user || user.money < item.price) {
            return res.status(StatusCodes.BAD_REQUEST).send({ error: "No tienes suficiente dinero" });
        }

        // Transaction
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

    // Create Shop Item (Admin)
    app.post("/economy/shop/:guildId/items", async (req, res) => {
        const { guildId } = req.params as { guildId: string };
        const body = req.body as any;

        // Auth check
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "No autorizado" });

        try {
            const decoded = app.jwt.verify(token) as any;
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
        } catch (err: any) {
            console.error(err);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: err.message });
        }
    });

    // Update Shop Item (Admin)
    app.patch("/economy/shop/:guildId/items/:itemId", async (req, res) => {
        const { guildId, itemId } = req.params as { guildId: string, itemId: string };
        const body = req.body as any;

        // Auth check
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "No autorizado" });

        try {
            const decoded = app.jwt.verify(token) as any;
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
        } catch (err: any) {
            console.error(err);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: err.message });
        }
    });

    // Delete Shop Item (Admin)
    app.delete("/economy/shop/:guildId/items/:itemId", async (req, res) => {
        const { guildId, itemId } = req.params as { guildId: string, itemId: string };

        // Auth check
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "No autorizado" });

        try {
            const decoded = app.jwt.verify(token) as any;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Servidor no encontrado" });

            const member = await guild.members.fetch(decoded.id).catch(() => null);
            if (!member || !member.permissions.has("ManageGuild")) {
                return res.status(StatusCodes.FORBIDDEN).send({ error: "Permisos insuficientes" });
            }

            await Item.deleteOne({ _id: itemId, guildId });
            return res.send({ success: true });
        } catch (err: any) {
            console.error(err);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: err.message });
        }
    });

    // Deposit Item into Backpack
    app.post("/economy/backpacks/deposit", async (req, res) => {
        const { itemId, guildId, backpackId, amount } = req.body as { itemId: string, guildId: string, backpackId: string, amount: number };

        if (!amount || amount <= 0) return res.status(StatusCodes.BAD_REQUEST).send({ error: "Cantidad inválida" });

        // Auth check
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });

        const decoded = app.jwt.verify(token) as any;
        const userId = decoded.id;

        // 1. Verify Inventory
        const invItem = await Inventory.findOne({ userId, guildId, itemId }); // itemId here is actually the ID in inventory which usually links to Item
        // Actually, the frontend often passes the Item ID. 
        // Let's assume itemId passed is the ITEM's _id.
        // Wait, Inventory schema: userId, guildId, itemId (ref Item), amount.

        // Let's check inventory by Item ID
        const inventoryEntry = await Inventory.findOne({ userId, guildId, itemId });

        if (!inventoryEntry || inventoryEntry.amount < amount) {
            return res.status(StatusCodes.BAD_REQUEST).send({ error: "No tienes suficiente cantidad de este objeto." });
        }

        // 2. Verify Backpack Access
        const bp = await BackpackModel.findById(backpackId);
        if (!bp) return res.status(StatusCodes.NOT_FOUND).send({ error: "Mochila no encontrada" });

        // Access Check (Owner or Allowed)
        // Fetch User Roles for Check
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        let roleIds: string[] = [];
        try {
            if (guild) {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) roleIds = member.roles.cache.map(r => r.id);
            }
        } catch { }

        const hasAccess =
            bp.ownerId === userId ||
            bp.allowedUsers.includes(userId) ||
            bp.allowedRoles.some(r => roleIds.includes(r));

        if (!hasAccess) return res.status(StatusCodes.FORBIDDEN).send({ error: "No tienes permiso para acceder a esta mochila." });

        // 3. Check Capacity
        const currentSize = Object.keys(bp.items || {}).length;
        // If item already in backpack, size doesn't increase.
        // items is a Map/Object: { [itemId]: { itemId, amount } }
        const items = bp.items instanceof Map ? Object.fromEntries(bp.items) : (bp.items || {});

        if (!items[itemId] && currentSize >= bp.capacity) {
            return res.status(StatusCodes.BAD_REQUEST).send({ error: "La mochila está llena." });
        }

        // 4. Transaction
        // Remove from Inventory
        inventoryEntry.amount -= amount;
        if (inventoryEntry.amount <= 0) {
            await inventoryEntry.deleteOne();
        } else {
            await inventoryEntry.save();
        }

        // Add to Backpack
        if (items[itemId]) {
            items[itemId].amount += amount;
        } else {
            items[itemId] = {
                itemId: itemId,
                amount: amount
            };
        }

        // Save Backpack (Using updateOne to force set the mixed type)
        await BackpackModel.updateOne({ _id: backpackId }, { $set: { items: items } });

        // Log? Maybe later.

        return res.send({ success: true });
    });

    // Withdraw Item from Backpack
    app.post("/economy/backpacks/withdraw", async (req, res) => {
        const { itemId, guildId, backpackId, amount } = req.body as { itemId: string, guildId: string, backpackId: string, amount: number };

        if (!amount || amount <= 0) return res.status(StatusCodes.BAD_REQUEST).send({ error: "Cantidad inválida" });

        // Auth check
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });

        const decoded = app.jwt.verify(token) as any;
        const userId = decoded.id;

        // 1. Verify Backpack Access
        const bp = await BackpackModel.findById(backpackId);
        if (!bp) return res.status(StatusCodes.NOT_FOUND).send({ error: "Mochila no encontrada" });

        // Access Check (Owner or Allowed)
        // Fetch User Roles for Check
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        let roleIds: string[] = [];
        try {
            if (guild) {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) roleIds = member.roles.cache.map(r => r.id);
            }
        } catch { }

        const hasAccess =
            bp.ownerId === userId ||
            bp.allowedUsers.includes(userId) ||
            bp.allowedRoles.some(r => roleIds.includes(r));

        if (!hasAccess) return res.status(StatusCodes.FORBIDDEN).send({ error: "No tienes permiso para acceder a esta mochila." });

        // 2. Check Item in Backpack
        // items is a Map/Object: { [itemId]: { itemId, amount } }
        const items = bp.items instanceof Map ? Object.fromEntries(bp.items) : (bp.items || {});

        if (!items[itemId] || items[itemId].amount < amount) {
            return res.status(StatusCodes.BAD_REQUEST).send({ error: "No hay suficiente cantidad de este objeto en la mochila." });
        }

        // 3. Transaction

        // Remove from Backpack
        items[itemId].amount -= amount;
        if (items[itemId].amount <= 0) {
            delete items[itemId];
        }

        // Add to Inventory
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

        // Save Backpack
        await BackpackModel.updateOne({ _id: backpackId }, { $set: { items: items } });

        return res.send({ success: true });
    });
    // Use Item
    app.post("/economy/use", async (req, res) => {
        const { itemId, guildId } = req.body as { itemId: string, guildId: string };

        // Auth check
        const token = req.cookies.token;
        if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });

        const decoded = app.jwt.verify(token) as any;
        const userId = decoded.id;

        // 1. Fetch User Data for Cache lookups if needed
        const userDoc = await User.findOne({ userId, guildId });
        if (!userDoc) return res.status(StatusCodes.NOT_FOUND).send({ error: "Usuario no encontrado" });

        // 2. Fetch Item (with Recovery)
        let item = await Item.findById(itemId);
        if (!item) {
            // Try recovery from cache
            const cached = userDoc.inventory_cache?.find((c: any) => String(c.id) === String(itemId));
            if (cached) {
                item = await Item.findOne({
                    guildId,
                    itemName: { $regex: `^${cached.name}$`, $options: "i" }
                });
            }
        }

        if (!item) return res.status(StatusCodes.NOT_FOUND).send({ error: "El objeto no existe en la base de datos actual." });

        // 3. Fetch Guild and Member (REAL Discord Data)
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return res.status(StatusCodes.NOT_FOUND).send({ error: "Servidor no encontrado" });

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(StatusCodes.NOT_FOUND).send({ error: "Miembro no encontrado en el servidor" });

        const user = member.user;

        // 4. User Ownership Check
        let invEntry = await Inventory.findOne({ userId, guildId, itemId: item._id });

        // If not found by NEW ID, check if user has the OLD ID (the one they passed)
        if (!invEntry && String(item._id) !== String(itemId)) {
            invEntry = await Inventory.findOne({ userId, guildId, itemId: itemId });
            if (invEntry) {
                // Migrate!
                invEntry.itemId = item._id as any;
                await invEntry.save();
            }
        }

        if (!invEntry || invEntry.amount < 1) {
            return res.status(StatusCodes.BAD_REQUEST).send({ error: "No tienes este objeto." });
        }

        // 5. Usable Check
        if (!item.usable) {
            return res.status(StatusCodes.BAD_REQUEST).send({ error: "Este objeto no se puede usar." });
        }

        // 5. Mock Interaction & Context
        const mockMessages: string[] = [];
        const mockInteraction = {
            guildId,
            user: user,
            member: member,
            guild: guild,
            deferred: false,
            replied: false,
            reply: async (msg: any) => {
                const content = typeof msg === 'string' ? msg : (msg.content || (msg.embeds ? "Embed sent" : ""));
                if (msg.embeds && msg.embeds.length > 0) {
                    // Capture embed descriptions if possible
                    msg.embeds.forEach((e: any) => {
                        if (e.data && e.data.description) mockMessages.push(e.data.description);
                        // Also capture fields
                        if (e.data.fields) {
                            e.data.fields.forEach((f: any) => mockMessages.push(`${f.name}: ${f.value}`));
                        }
                    });
                } else {
                    mockMessages.push(content);
                }
            },
            editReply: async (msg: any) => {
                const content = typeof msg === 'string' ? msg : (msg.content || (msg.embeds ? "Embed sent" : ""));
                if (msg.embeds && msg.embeds.length > 0) {
                    msg.embeds.forEach((e: any) => {
                        if (e.data && e.data.description) mockMessages.push(e.data.description);
                        if (e.data.fields) {
                            e.data.fields.forEach((f: any) => mockMessages.push(`${f.name}: ${f.value}`));
                        }
                    });
                } else {
                    mockMessages.push(content);
                }
            },
            followUp: async (msg: any) => {
                const content = typeof msg === 'string' ? msg : (msg.content || (msg.embeds ? "Embed sent" : ""));
                mockMessages.push(content);
            }
        };

        const ctx: EngineContext = {
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
            item: item
        };

        // 6. Execution Limit / Requirements
        try {
            await checkRequirements(item, ctx);
        } catch (err: any) {
            let msg = "Requisitos no cumplidos.";
            if (err.message === "REQUIRE_MONEY") msg = "No tienes suficiente dinero.";
            if (err.message === "REQUIRE_ITEM") msg = "No tienes los items requeridos.";
            if (err.message === "REQUIRE_ROLE") msg = "No cumples los requisitos de rol.";
            return res.status(StatusCodes.BAD_REQUEST).send({ error: msg });
        }

        // 7. Consume & Run
        await consumeRequirements(item, ctx);

        // Remove 1 of the item itself
        const rem = await eco.removeItem(userId, guildId, item.itemName, 1);
        if (!rem.success) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Error al consumir el item." });
        }

        // Execute Effects
        await runItem(item, ctx);

        // 8. Construct Response
        // We want to return specific effects to show a nice UI
        return res.send({
            success: true,
            message: ctx.customMessage || mockMessages.join('\n') || "Objeto usado correctamente.",
            effects: {
                money: ctx.moneyChanges,
                itemsGiven: ctx.itemsGiven,
                rolesGiven: ctx.rolesGiven
            }
        });
    });
}
