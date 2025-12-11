import { PermissionFlagsBits, GuildMember } from "discord.js";

export function isAdmin(member: GuildMember | null): boolean {
  if (!member || !member.guild) return false;
  if (member.id === member.guild.ownerId) return true;
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function canAccessBackpack(backpack: any, member: GuildMember | null): boolean {
  if (!backpack || !member) return false;

  if (isAdmin(member)) return true;

  if (backpack.ownerId === member.id) return true;

  if (backpack.accessType === "owner_only") return false;

  if (Array.isArray(backpack.allowedUsers) && backpack.allowedUsers.includes(member.id))
    return true;

  if (
    member.roles?.cache &&
    backpack.allowedRoles?.some((roleId: string) => member.roles.cache.has(roleId))
  )
    return true;

  return false;
}

export default {
  isAdmin,
  canAccessBackpack,
};

