import type { Backpack } from "../../core/inventory/backpackTypes.js";
import { BackpackModel } from "../schemas/Backpack.js";
export { BackpackModel };

export async function loadBackpack(ownerId: string, name: string): Promise<Backpack | null> {
  const doc = await BackpackModel.findOne({ ownerId, name });
  if (!doc) return null;

  return mapDoc(doc);
}

// Update type definition in separate file or interface if reachable, 
// but here we just ensure we pass data. 
// Ideally we need to update Backpack interface too.

export async function saveBackpack(bp: any) {
  // Use guildId if available in object
  const filter: any = { ownerId: bp.ownerId, name: bp.name };
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
        emoji: bp.emoji || "🎒",
        guildId: bp.guildId // Ensure guildId is saved
      }
    },
    { upsert: true }
  );
}

export async function listBackpacks(ownerId: string): Promise<Backpack[]> {
  const docs = await BackpackModel.find({ ownerId });
  return docs.map(mapDoc);
}

export async function listAccessibleBackpacks(userId: string, guildId: string, roleIds: string[] = []): Promise<Backpack[]> {
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

export async function listAllGuildBackpacks(guildId: string): Promise<Backpack[]> {
  // Finds explicitly associated with guild (preferred) or legacy ones that might not have guildId if we want?
  // Actually, new code enforces guildId. For legacy, we might need $or: [{guildId}, {guildId: {$exists: false}}] if we want to be super broad, 
  // but let's stick to guildId for "guild admin" logic.
  const docs = await BackpackModel.find({ guildId });
  return docs.map(mapDoc);
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findAccessibleBackpack(userId: string, guildId: string, name: string, roleIds: string[] = []): Promise<Backpack | null> {
  const regex = new RegExp(`^${escapeRegex(name)}$`, "i");

  // Priority 1: Owned by user (Scoped to guild ideally, but ownerId is unique enough usually, though we enforce guildId now)
  const owned = await BackpackModel.findOne({ ownerId: userId, guildId, name: regex });
  if (owned) return mapDoc(owned);

  // Priority 2: Shared/Public in this guild
  const shared = await BackpackModel.findOne({
    guildId,
    name: regex,
    $or: [
      { allowedUsers: userId },
      { allowedRoles: { $in: roleIds } }
    ]
  });

  if (shared) return mapDoc(shared);

  // Fallback: Legacy Owned (no guildId) search if checking for own backpack
  // This is for migration support if "autorizar" hasn't run yet.
  // If I own it, I should find it even if I haven't migrated it.
  const legacyOwned = await BackpackModel.findOne({ ownerId: userId, name: regex });
  if (legacyOwned) return mapDoc(legacyOwned);

  return null;
}

function mapDoc(doc: any): Backpack {
  return {
    id: doc.id,
    ownerId: doc.ownerId,
    guildId: doc.guildId,
    name: doc.name,
    capacity: doc.capacity,
    items: Object.fromEntries(doc.items || new Map()) as any,
    allowedUsers: doc.allowedUsers || [],
    allowedRoles: doc.allowedRoles || [],
    accessType: doc.accessType || 'owner_only',
    ownerType: doc.ownerType || 'user',
    description: doc.description,
    emoji: doc.emoji || '🎒'
  };
}