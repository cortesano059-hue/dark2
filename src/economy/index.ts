// Replace imports (removed individual configs)
import {
    GuildConfig,
    Inventory,
    Item,
    User
} from "#database";
import { logger } from "../utils/logger.js";

// ... [Keep everything else until getMiningConfig]

// MINING CONFIG
export async function getMiningConfig(guildId: string) {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.mining || null;
}

export async function setMiningConfig(guildId: string, data: any) {
    const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { mining: data } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return config.mining;
}

// MARI CONFIG
export async function getMariConfig(guildId: string) {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.mari || null; // Returns defaults if defined in schema
}

export async function setMariConfig(guildId: string, data: any) {
    const updates: any = {};
    for (const key in data) {
        updates[`mari.${key}`] = data[key];
    }

    const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: updates },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return config.mari;
}

export async function sellMari(userId: string, guildId: string) {
    const config = await getMariConfig(guildId);
    // Config might be null if not set yet, or defaults might apply
    if (!config || !config.itemName) {
        return { success: false, message: "Venta no configurada." };
    }

    const { itemName, minPrice, maxPrice } = config;
    const sellPrice = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;
    const inv = await getUserInventory(userId, guildId);
    const itemData = inv.find(i => i.itemName.toLowerCase() === itemName.toLowerCase());

    if (!itemData || itemData.amount < 1) {
        return { success: false, message: `No tienes **${itemName}** para vender.` };
    }

    // Sell random 1-10 or up to amount
    const toSell = Math.min(itemData.amount, Math.floor(Math.random() * 10) + 1);
    const earn = toSell * sellPrice;

    await removeItem(userId, guildId, itemName, toSell);
    // Add to cash (money)
    await addMoney(userId, guildId, earn, "illegal_sale");

    return {
        success: true,
        consume: toSell,
        priceUnit: sellPrice,
        earn,
        itemName
    };
}

// POLICE CONFIG
export async function getPoliceConfig(guildId: string) {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.police || null;
}

export async function getPoliceRole(guildId: string) {
    const config = await getPoliceConfig(guildId);
    return config?.roleId || null;
}

export async function setPoliceRole(guildId: string, roleId: string) {
    const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { "police.roleId": roleId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return config.police;
}

// ... rest of exports

export const DAILY_COOLDOWN = 86400000; // 24h

/* ===========================
    USUARIOS
=========================== */
export async function getUser(userId: string, guildId: string) {
    if (!userId || !guildId) return null;

    let user = await User.findOne({ userId, guildId });

    if (!user) {
        // Fetch config for initial balance
        const config = await GuildConfig.findOne({ guildId });
        const initialMoney = config?.initialMoney ?? 0;
        const initialBank = config?.initialBank ?? 5000;

        user = await User.create({
            userId,
            guildId,
            money: initialMoney,
            bank: initialBank,
            daily_claim_at: 0,
            work_cooldown: 0,
            trash_cooldown: 0,
            mining_cooldown: 0,
            inventory_cache: []
        });
    }

    return user;
}

export async function getBalance(userId: string, guildId: string) {
    const u = await getUser(userId, guildId);
    if (!u)
        return {
            money: 0,
            bank: 0,
            dailyClaim: 0,
            workCooldown: 0,
            trashCooldown: 0,
            inventory: []
        };

    return {
        money: Number(u.money || 0),
        bank: Number(u.bank || 0),
        dailyClaim: u.daily_claim_at || 0,
        workCooldown: u.work_cooldown || 0,
        trashCooldown: u.trash_cooldown || 0,
        inventory: u.inventory_cache || []
    };
}

/* ===========================
    DINERO
=========================== */
export async function addMoney(userId: string, guildId: string, amount: number, type = "system") {
    const u = await getUser(userId, guildId);
    const n = Number(amount);
    if (!u || n <= 0) return false;

    u.money = (u.money || 0) + n;
    await u.save();

    logger.logTransaction({
        userId,
        guildId,
        type,
        amount: n,
        to: "money",
    });

    return true;
}

export async function addBank(userId: string, guildId: string, amount: number, type = "system") {
    const u = await getUser(userId, guildId);
    const n = Number(amount);
    if (!u || n <= 0) return false;

    u.bank = (u.bank || 0) + n;
    await u.save();

    logger.logTransaction({
        userId,
        guildId,
        type,
        amount: n,
        to: "bank",
    });

    return true;
}

export async function removeMoney(userId: string, guildId: string, amount: number, type = "system") {
    const u = await getUser(userId, guildId);
    const n = Number(amount);
    if (!u)
        return { success: false, message: "Usuario no encontrado." };

    if ((u.money || 0) < n)
        return { success: false, message: "No tienes suficiente dinero." };

    u.money = (u.money || 0) - n;
    await u.save();

    logger.logTransaction({
        userId,
        guildId,
        type,
        amount: -n,
        from: "money",
    });

    return { success: true };
}

export async function deposit(userId: string, guildId: string, amount: number) {
    const u = await getUser(userId, guildId);
    const n = Number(amount);
    if (!u || n <= 0) return { success: false };

    if ((u.money || 0) < n)
        return { success: false, message: "No tienes suficiente dinero." };

    u.money -= n;
    u.bank = (u.bank || 0) + n;
    await u.save();

    return { success: true };
}

export async function withdraw(userId: string, guildId: string, amount: number) {
    const u = await getUser(userId, guildId);
    const n = Number(amount);
    if (!u || n <= 0) return { success: false };

    if ((u.bank || 0) < n)
        return { success: false, message: "No tienes suficiente banco." };

    u.bank -= n;
    u.money = (u.money || 0) + n;
    await u.save();

    return { success: true };
}

/* ===========================
    ITEMS
=========================== */

export async function getItemByName(guildId: string, name: string) {
    if (!guildId || !name) return null;
    return Item.findOne({
        guildId,
        itemName: { $regex: `^${name}$`, $options: "i" },
    });
}

export async function getAllItems(guildId: string) {
    if (!guildId) return [];
    return Item.find({ guildId }).sort({ itemName: 1 });
}

export async function createItem(guildId: string, data: any = {}) {
    if (!guildId || !data?.itemName) {
        throw new Error("INVALID_ITEM_DATA");
    }

    const exists = await Item.findOne({
        guildId,
        itemName: { $regex: `^${data.itemName}$`, $options: "i" },
    });

    if (exists) {
        throw new Error("ITEM_ALREADY_EXISTS");
    }

    const item = await Item.create({
        guildId,
        itemName: data.itemName,
        description: data.description || "",
        emoji: data.emoji || "📦",
        price: Number(data.price || 0),
        type: data.type || "normal",
        usable: Boolean(data.usable),
        sellable: Boolean(data.sellable),
        inventory: data.inventory !== false,
        stock: data.stock ?? -1,
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        actions: Array.isArray(data.actions) ? data.actions : [],
    });

    return item;
}

/* ===========================
    INVENTARIO
=========================== */

export async function getUserInventory(userId: string, guildId: string) {
    // Obtenemos los datos de la colección Inventory y poblamos el item
    const data = await Inventory.find({ userId, guildId }).populate("itemId");

    const inventory = data.map(entry => {
        const item = entry.itemId as any; // Cast needed as populate generic is tricky or need interface update
        return {
            itemId: item?._id,
            itemName: item?.itemName || "Objeto Desconocido",
            description: item?.description || "",
            emoji: item?.emoji || "📦",
            amount: entry.amount || 0,
            price: item?.price || 0,
            type: item?.type || "normal",
            usable: item?.usable || false,
            sellable: item?.sellable || false,
            inventory: item?.inventory ?? true,
        };
    });

    // Sincronizamos con la cache del usuario para el Dashboard
    await User.updateOne(
        { userId, guildId },
        {
            $set: {
                inventory_cache: inventory.map(i => ({
                    id: String(i.itemId),
                    name: i.itemName,
                    count: i.amount,
                    emoji: i.emoji
                }))
            }
        }
    );

    return inventory;
}

export async function addToInventory(userId: string, guildId: string, itemName: string, amount = 1) {
    const item = await getItemByName(guildId, itemName);
    if (!item) return false;

    let slot = await Inventory.findOne({ userId, guildId, itemId: item._id });

    if (!slot) {
        await Inventory.create({ userId, guildId, itemId: item._id, amount });
    } else {
        slot.amount += amount;
        await slot.save();
    }

    // Actualizamos la cache después de añadir
    await getUserInventory(userId, guildId);
    return true;
}

export async function removeItem(userId: string, guildId: string, itemName: string, amount = 1) {
    const item = await getItemByName(guildId, itemName);
    if (!item) return { success: false, reason: "ITEM_NOT_FOUND" };

    const slot = await Inventory.findOne({ userId, guildId, itemId: item._id });

    if (!slot || slot.amount < amount)
        return { success: false, reason: "NOT_ENOUGH_ITEMS" };

    slot.amount -= amount;
    if (slot.amount <= 0) await slot.deleteOne();
    else await slot.save();

    // Actualizamos la cache después de remover
    await getUserInventory(userId, guildId);
    return { success: true };
}

/* ===========================
    MINERÍA
=========================== */

export async function getMiningCooldown(userId: string, guildId: string) {
    const u = await getUser(userId, guildId);
    return u ? Number(u.mining_cooldown || 0) : 0;
}

export async function getLeaderboard(guildId: string, mode: "total" | "money" | "bank") {
    if (mode === "total") {
        return await User.aggregate([
            { $match: { guildId } },
            { $addFields: { total: { $add: ["$money", "$bank"] } } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);
    }

    const sortField = mode === "money" ? { money: -1 } : { bank: -1 };
    // @ts-ignore - Sort object is checked dynamically but TS might complain about specifics
    return await User.find({ guildId }).sort(sortField as any).limit(10);
}

export async function getShop(guildId: string) {
    return await Item.find({ guildId, price: { $gt: 0 } }).lean();
}

export async function buyItem(userId: string, guildId: string, itemName: string, amount = 1) {
    const item = await getItemByName(guildId, itemName);
    if (!item) return { success: false, reason: "ITEM_NOT_FOUND" };

    const price = item.price ?? 0;
    const stock = item.stock ?? -1;

    if (price <= 0) return { success: false, reason: "ITEM_NOT_FOR_SALE" };
    if (stock !== -1 && stock < amount) return { success: false, reason: "NOT_ENOUGH_STOCK" };

    const totalPrice = price * amount;
    const res = await removeMoney(userId, guildId, totalPrice, `buy_${itemName}`);
    if (!res.success) return { success: false, reason: "NOT_ENOUGH_MONEY", totalPrice };

    if (stock !== -1) {
        item.stock = stock - amount;
        await item.save();
    }

    await addToInventory(userId, guildId, itemName, amount);
    return { success: true, totalPrice };
}

export async function getItemById(itemId: string) {
    return await Item.findById(itemId);
}

export async function setTrashCooldown(userId: string, guildId: string, ts: number) {
    const u = await getUser(userId, guildId);
    if (!u) return 0;
    u.trash_cooldown = Number(ts);
    await u.save();
    return u.trash_cooldown;
}

export async function setWorkCooldown(userId: string, guildId: string, ts: number) {
    const u = await getUser(userId, guildId);
    if (!u) return 0;
    u.work_cooldown = Number(ts);
    await u.save();
    return u.work_cooldown;
}

export async function claimDaily(userId: string, guildId: string) {
    const u = await getUser(userId, guildId);
    if (!u) return 0;
    u.daily_claim_at = Date.now();
    await u.save();
    return u.daily_claim_at;
}

export async function setMiningCooldown(userId: string, guildId: string, ts: number) {
    const u = await getUser(userId, guildId);
    if (!u) return 0;
    u.mining_cooldown = Number(ts);
    await u.save();
    return u.mining_cooldown;
}



export async function setIncomeRole(guildId: string, roleId: string, income: number) {
    // Check if role exists in array, if so update, else push
    // We can use array filters in updateOne but simple logic is often safer with simple structural updates or just push/pull
    // But Mongoose allows position operator $:

    // First try update if exists
    const res = await GuildConfig.updateOne(
        { guildId, "incomeRoles.roleId": roleId },
        { $set: { "incomeRoles.$.incomePerHour": income } }
    );

    if (res.modifiedCount === 0) {
        // Not found, push new
        await GuildConfig.updateOne(
            { guildId },
            { $push: { incomeRoles: { roleId, incomePerHour: income } } },
            { upsert: true }
        );
    }

    return { roleId, incomePerHour: income };
}

export async function getBadulaque(guildId: string, key: string) {
    const config = await GuildConfig.findOne(
        { guildId, "badulaques.key": key },
        { "badulaques.$": 1 }
    ).lean();

    // config.badulaques matches the single element
    return config?.badulaques?.[0] || null;
}

export async function setBadulaque(guildId: string, key: string, data: any) {
    const updateData = {
        key,
        reward: data.reward,
        image: data.image
    };

    const res = await GuildConfig.updateOne(
        { guildId, "badulaques.key": key },
        { $set: { "badulaques.$": updateData } }
    );

    if (res.modifiedCount === 0) {
        await GuildConfig.updateOne(
            { guildId },
            { $push: { badulaques: updateData } },
            { upsert: true }
        );
    }

    return updateData;
}

// ... (previous code)

export async function hasItem(userId: string, guildId: string, itemName: string, amount = 1) {
    const item = await getItemByName(guildId, itemName);
    if (!item) return false;

    const slot = await Inventory.findOne({ userId, guildId, itemId: item._id });
    if (!slot) return false;
    return slot.amount >= amount;
}

export default {
    DAILY_COOLDOWN,
    getUser,
    getBalance,
    addMoney,
    addBank,
    removeMoney,
    deposit,
    withdraw,
    getItemByName,
    getAllItems,
    createItem,
    getUserInventory,
    addToInventory,
    removeItem,
    hasItem,
    getMiningCooldown,
    setMiningCooldown,
    getMiningConfig,
    setWorkCooldown,
    setTrashCooldown,
    claimDaily,
    getLeaderboard,
    getShop,
    getItemById,
    setMiningConfig,
    getMariConfig,
    setMariConfig,
    sellMari,
    getPoliceConfig,
    getPoliceRole,
    setPoliceRole,
    setIncomeRole,
    getBadulaque,
    setBadulaque
};
