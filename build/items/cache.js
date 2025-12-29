import { Item } from "#database";
const itemCache = /* @__PURE__ */ new Map();
let loaded = false;
async function loadItems(guildId) {
  try {
    const query = guildId ? { guildId } : {};
    const items = await Item.find(query).lean();
    itemCache.clear();
    for (const item of items) {
      itemCache.set(item.itemName, item);
    }
    loaded = true;
  } catch (err) {
    console.error("[ITEM CACHE] Failed to load items", err);
  }
}
async function getItem(name, guildId) {
  return await Item.findOne({
    guildId,
    itemName: { $regex: `^${name}$`, $options: "i" }
  }).lean();
}
async function getAllItems(guildId) {
  return await Item.find({ guildId }).lean();
}
function invalidateAll() {
  itemCache.clear();
  loaded = false;
}
export {
  getAllItems,
  getItem,
  invalidateAll,
  loadItems
};
