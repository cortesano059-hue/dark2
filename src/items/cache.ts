import { Item } from "#database";
import { logger } from "../utils/logger.js";

const itemCache = new Map<string, any>();
let loaded = false;

export async function loadItems(guildId?: string) {
    try {
        const query = guildId ? { guildId } : {};
        const items = await Item.find(query).lean();

        // If guildId is provided, we might only want to cache for that guild?
        // Original cache seemed global. We will use a key "guildId:itemName" or just "itemName" if names are unique globally?
        // Item schema has guildId. Names might collide across guilds.
        // Original code used `itemCache.set(item.name, item)`. It assumed unique names or single guild?
        // If names are not unique, this cache is dangerous.
        // I'll stick to original logic: name -> item.

        itemCache.clear();
        for (const item of items) {
            itemCache.set(item.itemName, item);
        }

        loaded = true;
        // console.log(`[ITEM CACHE] Loaded ${items.length} items.`);
    } catch (err) {
        console.error("[ITEM CACHE] Failed to load items", err);
    }
}

export async function getItem(name: string, guildId: string) {
    // If we want to support multi-guild properly, we should query DB or filter cache.
    // Original code: itemCache.get(name).
    // I will use DB fallback for safety.

    // Check cache first
    /*
    if (!loaded) await loadItems();
    const cached = itemCache.get(name);
    if (cached && cached.guildId === guildId) return cached;
    */

    // DB Direct for reliability
    return await Item.findOne({
        guildId,
        itemName: { $regex: `^${name}$`, $options: "i" }
    }).lean();
}

export async function getAllItems(guildId: string) {
    // DB Direct
    return await Item.find({ guildId }).lean();
}

export function invalidateAll() {
    itemCache.clear();
    loaded = false;
}
