import {
  User,
  Item,
  Inventory,
  DutyStatus,
  IncomeRole,
  Dni,
  PoliceConfig,
  MariConfig,
} from "./mongodb.js";
import logger from "@logger";

export default {
  DAILY_COOLDOWN: 86400000,

  async getUser(userId: string, guildId: string): Promise<any> {
    if (!userId || !guildId) return null;

    const user = await User.findOneAndUpdate(
      { userId, guildId },
      {
        $setOnInsert: {
          userId,
          guildId,
          money: 0,
          bank: 5000,
          daily_claim_at: 0,
          work_cooldown: 0,
          trash_cooldown: 0,
        },
      },
      { new: true, upsert: true }
    );

    return user;
  },

  async getBalance(userId: string, guildId: string): Promise<any> {
    const u = await this.getUser(userId, guildId);
    if (!u) return { money: 0, bank: 0, dailyClaim: 0, workCooldown: 0, trashCooldown: 0 };

    return {
      money: Number(u.money || 0),
      bank: Number(u.bank || 0),
      dailyClaim: u.daily_claim_at || 0,
      workCooldown: u.work_cooldown || 0,
      trashCooldown: u.trash_cooldown || 0,
    };
  },

  async addMoney(userId: string, guildId: string, amount: number, type: string = "system"): Promise<boolean> {
    const u = await this.getUser(userId, guildId);
    const n = Number(amount);
    if (!u || n <= 0) return false;

    u.money = (u.money || 0) + n;
    await u.save();

    logger.logTransaction?.({
      userId,
      guildId,
      type,
      amount: n,
      to: "money",
    });

    return true;
  },

  async removeMoney(userId: string, guildId: string, amount: number, type: string = "system"): Promise<any> {
    const u = await this.getUser(userId, guildId);
    const n = Number(amount);
    if (!u) return { success: false, message: "Usuario no encontrado." };

    if ((u.money || 0) < n) return { success: false, message: "No tienes suficiente dinero." };

    u.money = (u.money || 0) - n;
    await u.save();

    logger.logTransaction?.({
      userId,
      guildId,
      type,
      amount: -n,
      from: "money",
    });

    return { success: true };
  },

  async deposit(userId: string, guildId: string, amount: number): Promise<any> {
    const u = await this.getUser(userId, guildId);
    const n = Number(amount);
    if (!u || n <= 0) return { success: false };

    if ((u.money || 0) < n) return { success: false, message: "No tienes suficiente dinero." };

    u.money -= n;
    u.bank = (u.bank || 0) + n;
    await u.save();

    logger.logTransaction?.({
      userId,
      guildId,
      type: "deposit",
      amount: n,
      from: "money",
      to: "bank",
    });

    return { success: true };
  },

  async withdraw(userId: string, guildId: string, amount: number): Promise<any> {
    const u = await this.getUser(userId, guildId);
    const n = Number(amount);
    if (!u || n <= 0) return { success: false };

    if ((u.bank || 0) < n) return { success: false, message: "No tienes suficiente banco." };

    u.bank -= n;
    u.money = (u.money || 0) + n;
    await u.save();

    logger.logTransaction?.({
      userId,
      guildId,
      type: "withdraw",
      amount: n,
      from: "bank",
      to: "money",
    });

    return { success: true };
  },

  async setWorkCooldown(userId: string, guildId: string, ts: number): Promise<number> {
    const u = await this.getUser(userId, guildId);
    u.work_cooldown = Number(ts);
    await u.save();
    return u.work_cooldown;
  },

  async getWorkCooldown(userId: string, guildId: string): Promise<number> {
    const u = await this.getUser(userId, guildId);
    return u ? Number(u.work_cooldown || 0) : 0;
  },

  async setTrashCooldown(userId: string, guildId: string, ts: number): Promise<number> {
    const u = await this.getUser(userId, guildId);
    u.trash_cooldown = Number(ts);
    await u.save();
    return u.trash_cooldown;
  },

  async getTrashCooldown(userId: string, guildId: string): Promise<number> {
    const u = await this.getUser(userId, guildId);
    return u ? Number(u.trash_cooldown || 0) : 0;
  },

  async claimDaily(userId: string, guildId: string): Promise<number> {
    const u = await this.getUser(userId, guildId);
    u.daily_claim_at = Date.now();
    await u.save();
    return u.daily_claim_at;
  },

  async getItemByName(guildId: string, name: string): Promise<any> {
    if (!name) return null;
    return Item.findOne({ guildId, itemName: { $regex: `^${name}$`, $options: "i" } });
  },

  async createItem(guildId: string, name: string, price: number = 0, desc: string = "", emoji: string = "📦", extra: any = {}): Promise<any> {
    const exists = await this.getItemByName(guildId, name);
    if (exists) return null;

    const item = new Item({
      guildId,
      itemName: name,
      price: Number(price || 0),
      description: desc || "",
      emoji: emoji || "📦",
      ...extra,
    });

    await item.save();
    return item;
  },

  async deleteItem(guildId: string, name: string): Promise<boolean> {
    const item = await this.getItemByName(guildId, name);
    if (!item) return false;

    await Inventory.deleteMany({ itemId: item._id });
    await item.deleteOne();
    return true;
  },

  async getUserInventory(userId: string, guildId: string): Promise<any[]> {
    const data = await Inventory.find({ userId, guildId }).populate("itemId");
    return data.map((entry: any) => ({
      itemName: entry.itemId?.itemName || "???",
      description: entry.itemId?.description || "",
      emoji: entry.itemId?.emoji || "📦",
      amount: entry.amount || 0,
      price: entry.itemId?.price || 0,
      type: entry.itemId?.type || "misc",
      usable: entry.itemId?.usable || false,
      sellable: entry.itemId?.sellable || false,
      inventory: entry.itemId?.inventory || true,
    }));
  },

  async addToInventory(userId: string, guildId: string, itemName: string, amount: number = 1): Promise<boolean> {
    const item = await this.getItemByName(guildId, itemName);
    if (!item) return false;

    let slot = await Inventory.findOne({ userId, guildId, itemId: item._id });
    if (!slot) {
      slot = await Inventory.create({ userId, guildId, itemId: item._id, amount });
    } else {
      slot.amount += amount;
      await slot.save();
    }
    return true;
  },

  async removeItem(userId: string, guildId: string, itemName: string, amount: number = 1): Promise<any> {
    const item = await this.getItemByName(guildId, itemName);
    if (!item) return { success: false };

    const slot = await Inventory.findOne({ userId, guildId, itemId: item._id });
    if (!slot || slot.amount < amount) return { success: false };

    slot.amount -= amount;
    if (slot.amount <= 0) await slot.deleteOne();
    else await slot.save();

    return { success: true };
  },

  async getShop(guildId: string): Promise<any[]> {
    return Item.find({ guildId }).sort({ price: 1 });
  },

  async setPoliceRole(guildId: string, roleId: string): Promise<any> {
    return PoliceConfig.findOneAndUpdate({ guildId }, { roleId }, { upsert: true, new: true });
  },

  async getPoliceRole(guildId: string): Promise<string | null> {
    const cfg = await PoliceConfig.findOne({ guildId });
    return cfg ? cfg.roleId : null;
  },

  async setMariConfig(guildId: string, data: any = {}): Promise<any> {
    return MariConfig.findOneAndUpdate({ guildId }, { $set: data }, { new: true, upsert: true });
  },

  async getMariConfig(guildId: string): Promise<any> {
    return MariConfig.findOne({ guildId });
  },

  async setMariItem(guildId: string, itemName: string): Promise<any> {
    const cfg = await this.getMariConfig(guildId);
    if (!cfg) {
      return this.setMariConfig(guildId, { itemName });
    }
    cfg.itemName = itemName;
    await cfg.save();
    return cfg;
  },

  async setMariRole(guildId: string, roleId: string): Promise<any> {
    const cfg = await this.getMariConfig(guildId);
    if (!cfg) {
      return this.setMariConfig(guildId, { roleId });
    }
    cfg.roleId = roleId;
    await cfg.save();
    return cfg;
  },

  async sellMari(userId: string, guildId: string): Promise<any> {
    const cfg = await this.getMariConfig(guildId);
    if (!cfg) return { success: false, message: "Config no establecida." };

    const itemName = cfg.itemName;
    const minConsume = Number(cfg.minConsume ?? 1);
    const maxConsume = Number(cfg.maxConsume ?? 1);
    const minPrice = Number(cfg.minPrice ?? 1);
    const maxPrice = Number(cfg.maxPrice ?? 1);

    if (!itemName) return { success: false, message: "Item no configurado." };
    if (minConsume > maxConsume || minPrice > maxPrice) return { success: false, message: "Configuración inválida." };

    const consumeQty = Math.floor(Math.random() * (maxConsume - minConsume + 1)) + minConsume;
    const unitPrice = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;
    const total = consumeQty * unitPrice;

    const removed = await this.removeItem(userId, guildId, itemName, consumeQty);
    if (!removed.success) return { success: false, message: "No tienes suficiente mercancía." };

    await this.addMoney(userId, guildId, total, "mari_sell");

    return {
      success: true,
      consume: consumeQty,
      earn: total,
      priceUnit: unitPrice,
    };
  },
};

