import { BackpackModel } from "../schemas/Backpack.js";
async function loadBackpack(ownerId, name) {
  const doc = await BackpackModel.findOne({ ownerId, name });
  if (!doc) return null;
  return mapDoc(doc);
}
async function saveBackpack(bp) {
  const filter = { ownerId: bp.ownerId, name: bp.name };
  if (bp.guildId) filter.guildId = bp.guildId;
  await BackpackModel.updateOne(
    filter,
    {
      $set: {
        capacity: bp.capacity,
        items: bp.items,
        allowedUsers: bp.allowedUsers || [],
        allowedRoles: bp.allowedRoles || [],
        accessType: bp.accessType || "owner_only",
        ownerType: bp.ownerType || "user",
        description: bp.description,
        emoji: bp.emoji || "\u{1F392}",
        guildId: bp.guildId
        // Ensure guildId is saved
      }
    },
    { upsert: true }
  );
}
async function listBackpacks(ownerId) {
  const docs = await BackpackModel.find({ ownerId });
  return docs.map(mapDoc);
}
async function listAccessibleBackpacks(userId, guildId, roleIds = []) {
  const query = {
    guildId,
    $or: [
      { ownerId: userId },
      { allowedUsers: userId },
      { allowedRoles: { $in: roleIds } }
    ]
  };
  const docs = await BackpackModel.find(query);
  return docs.map(mapDoc);
}
async function listAllGuildBackpacks(guildId) {
  const docs = await BackpackModel.find({ guildId });
  return docs.map(mapDoc);
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function findAccessibleBackpack(userId, guildId, name, roleIds = []) {
  const regex = new RegExp(`^${escapeRegex(name)}$`, "i");
  const owned = await BackpackModel.findOne({ ownerId: userId, guildId, name: regex });
  if (owned) return mapDoc(owned);
  const shared = await BackpackModel.findOne({
    guildId,
    name: regex,
    $or: [
      { allowedUsers: userId },
      { allowedRoles: { $in: roleIds } }
    ]
  });
  if (shared) return mapDoc(shared);
  const legacyOwned = await BackpackModel.findOne({ ownerId: userId, name: regex });
  if (legacyOwned) return mapDoc(legacyOwned);
  return null;
}
function mapDoc(doc) {
  return {
    id: doc.id,
    ownerId: doc.ownerId,
    guildId: doc.guildId,
    name: doc.name,
    capacity: doc.capacity,
    items: Object.fromEntries(doc.items || /* @__PURE__ */ new Map()),
    allowedUsers: doc.allowedUsers || [],
    allowedRoles: doc.allowedRoles || [],
    accessType: doc.accessType || "owner_only",
    ownerType: doc.ownerType || "user",
    description: doc.description,
    emoji: doc.emoji || "\u{1F392}"
  };
}
export {
  BackpackModel,
  findAccessibleBackpack,
  listAccessibleBackpacks,
  listAllGuildBackpacks,
  listBackpacks,
  loadBackpack,
  saveBackpack
};
