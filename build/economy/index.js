import {
  GuildConfig,
  Inventory,
  Item,
  User
} from "#database";
import { logger } from "../utils/logger.js";
async function getMiningConfig(guildId) {
  const config = await GuildConfig.findOne({ guildId }).lean();
  return config?.mining || null;
}
async function setMiningConfig(guildId, data) {
  const config = await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { mining: data } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return config.mining;
}
async function getMariConfig(guildId) {
  const config = await GuildConfig.findOne({ guildId }).lean();
  return config?.mari || null;
}
async function setMariConfig(guildId, data) {
  const updates = {};
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
async function sellMari(userId, guildId) {
  const config = await getMariConfig(guildId);
  if (!config || !config.itemName) {
    return { success: false, message: "Venta no configurada." };
  }
  const { itemName, minPrice, maxPrice } = config;
  const sellPrice = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;
  const inv = await getUserInventory(userId, guildId);
  const itemData = inv.find((i) => i.itemName.toLowerCase() === itemName.toLowerCase());
  if (!itemData || itemData.amount < 1) {
    return { success: false, message: `No tienes **${itemName}** para vender.` };
  }
  const toSell = Math.min(itemData.amount, Math.floor(Math.random() * 10) + 1);
  const earn = toSell * sellPrice;
  await removeItem(userId, guildId, itemName, toSell);
  await addMoney(userId, guildId, earn, "illegal_sale");
  return {
    success: true,
    consume: toSell,
    priceUnit: sellPrice,
    earn,
    itemName
  };
}
async function getPoliceConfig(guildId) {
  const config = await GuildConfig.findOne({ guildId }).lean();
  return config?.police || null;
}
async function getPoliceRole(guildId) {
  const config = await getPoliceConfig(guildId);
  return config?.roleId || null;
}
async function setPoliceRole(guildId, roleId) {
  const config = await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { "police.roleId": roleId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return config.police;
}
const DAILY_COOLDOWN = 864e5;
async function getUser(userId, guildId) {
  if (!userId || !guildId) return null;
  let user = await User.findOne({ userId, guildId });
  if (!user) {
    const config = await GuildConfig.findOne({ guildId });
    const initialMoney = config?.initialMoney ?? 0;
    const initialBank = config?.initialBank ?? 5e3;
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
async function getBalance(userId, guildId) {
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
async function addMoney(userId, guildId, amount, type = "system") {
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
    to: "money"
  });
  return true;
}
async function addBank(userId, guildId, amount, type = "system") {
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
    to: "bank"
  });
  return true;
}
async function removeMoney(userId, guildId, amount, type = "system") {
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
    from: "money"
  });
  return { success: true };
}
async function deposit(userId, guildId, amount) {
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
async function withdraw(userId, guildId, amount) {
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
async function getItemByName(guildId, name) {
  if (!guildId || !name) return null;
  return Item.findOne({
    guildId,
    itemName: { $regex: `^${name}$`, $options: "i" }
  });
}
async function getAllItems(guildId) {
  if (!guildId) return [];
  return Item.find({ guildId }).sort({ itemName: 1 });
}
async function createItem(guildId, data = {}) {
  if (!guildId || !data?.itemName) {
    throw new Error("INVALID_ITEM_DATA");
  }
  const exists = await Item.findOne({
    guildId,
    itemName: { $regex: `^${data.itemName}$`, $options: "i" }
  });
  if (exists) {
    throw new Error("ITEM_ALREADY_EXISTS");
  }
  const item = await Item.create({
    guildId,
    itemName: data.itemName,
    description: data.description || "",
    emoji: data.emoji || "\u{1F4E6}",
    price: Number(data.price || 0),
    type: data.type || "normal",
    usable: Boolean(data.usable),
    sellable: Boolean(data.sellable),
    inventory: data.inventory !== false,
    stock: data.stock ?? -1,
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    actions: Array.isArray(data.actions) ? data.actions : []
  });
  return item;
}
async function getUserInventory(userId, guildId) {
  const data = await Inventory.find({ userId, guildId }).populate("itemId");
  const inventory = data.map((entry) => {
    const item = entry.itemId;
    return {
      itemId: item?._id,
      itemName: item?.itemName || "Objeto Desconocido",
      description: item?.description || "",
      emoji: item?.emoji || "\u{1F4E6}",
      amount: entry.amount || 0,
      price: item?.price || 0,
      type: item?.type || "normal",
      usable: item?.usable || false,
      sellable: item?.sellable || false,
      inventory: item?.inventory ?? true
    };
  });
  await User.updateOne(
    { userId, guildId },
    {
      $set: {
        inventory_cache: inventory.map((i) => ({
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
async function addToInventory(userId, guildId, itemName, amount = 1) {
  const item = await getItemByName(guildId, itemName);
  if (!item) return false;
  let slot = await Inventory.findOne({ userId, guildId, itemId: item._id });
  if (!slot) {
    await Inventory.create({ userId, guildId, itemId: item._id, amount });
  } else {
    slot.amount += amount;
    await slot.save();
  }
  await getUserInventory(userId, guildId);
  return true;
}
async function removeItem(userId, guildId, itemName, amount = 1) {
  const item = await getItemByName(guildId, itemName);
  if (!item) return { success: false, reason: "ITEM_NOT_FOUND" };
  const slot = await Inventory.findOne({ userId, guildId, itemId: item._id });
  if (!slot || slot.amount < amount)
    return { success: false, reason: "NOT_ENOUGH_ITEMS" };
  slot.amount -= amount;
  if (slot.amount <= 0) await slot.deleteOne();
  else await slot.save();
  await getUserInventory(userId, guildId);
  return { success: true };
}
async function getMiningCooldown(userId, guildId) {
  const u = await getUser(userId, guildId);
  return u ? Number(u.mining_cooldown || 0) : 0;
}
async function getLeaderboard(guildId, mode) {
  if (mode === "total") {
    return await User.aggregate([
      { $match: { guildId } },
      { $addFields: { total: { $add: ["$money", "$bank"] } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
  }
  const sortField = mode === "money" ? { money: -1 } : { bank: -1 };
  return await User.find({ guildId }).sort(sortField).limit(10);
}
async function getShop(guildId) {
  return await Item.find({ guildId, price: { $gt: 0 } }).lean();
}
async function buyItem(userId, guildId, itemName, amount = 1) {
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
async function getItemById(itemId) {
  return await Item.findById(itemId);
}
async function setTrashCooldown(userId, guildId, ts) {
  const u = await getUser(userId, guildId);
  if (!u) return 0;
  u.trash_cooldown = Number(ts);
  await u.save();
  return u.trash_cooldown;
}
async function setWorkCooldown(userId, guildId, ts) {
  const u = await getUser(userId, guildId);
  if (!u) return 0;
  u.work_cooldown = Number(ts);
  await u.save();
  return u.work_cooldown;
}
async function claimDaily(userId, guildId) {
  const u = await getUser(userId, guildId);
  if (!u) return 0;
  u.daily_claim_at = Date.now();
  await u.save();
  return u.daily_claim_at;
}
async function setMiningCooldown(userId, guildId, ts) {
  const u = await getUser(userId, guildId);
  if (!u) return 0;
  u.mining_cooldown = Number(ts);
  await u.save();
  return u.mining_cooldown;
}
async function setIncomeRole(guildId, roleId, income) {
  const res = await GuildConfig.updateOne(
    { guildId, "incomeRoles.roleId": roleId },
    { $set: { "incomeRoles.$.incomePerHour": income } }
  );
  if (res.modifiedCount === 0) {
    await GuildConfig.updateOne(
      { guildId },
      { $push: { incomeRoles: { roleId, incomePerHour: income } } },
      { upsert: true }
    );
  }
  return { roleId, incomePerHour: income };
}
async function getBadulaque(guildId, key) {
  const config = await GuildConfig.findOne(
    { guildId, "badulaques.key": key },
    { "badulaques.$": 1 }
  ).lean();
  return config?.badulaques?.[0] || null;
}
async function setBadulaque(guildId, key, data) {
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
async function hasItem(userId, guildId, itemName, amount = 1) {
  const item = await getItemByName(guildId, itemName);
  if (!item) return false;
  const slot = await Inventory.findOne({ userId, guildId, itemId: item._id });
  if (!slot) return false;
  return slot.amount >= amount;
}
var economy_default = {
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
export {
  DAILY_COOLDOWN,
  addBank,
  addMoney,
  addToInventory,
  buyItem,
  claimDaily,
  createItem,
  economy_default as default,
  deposit,
  getAllItems,
  getBadulaque,
  getBalance,
  getItemById,
  getItemByName,
  getLeaderboard,
  getMariConfig,
  getMiningConfig,
  getMiningCooldown,
  getPoliceConfig,
  getPoliceRole,
  getShop,
  getUser,
  getUserInventory,
  hasItem,
  removeItem,
  removeMoney,
  sellMari,
  setBadulaque,
  setIncomeRole,
  setMariConfig,
  setMiningConfig,
  setMiningCooldown,
  setPoliceRole,
  setTrashCooldown,
  setWorkCooldown,
  withdraw
};
