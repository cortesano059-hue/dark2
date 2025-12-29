import { BackpackModel } from "../../../../database/repositories/backpackRepo.js";
import { PermissionFlagsBits } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const autorizar = {
  command: {
    name: "autorizar",
    description: "Gestionar acceso a una mochila",
    type: 1,
    // Subcommand
    options: [
      { name: "mochila", description: "Nombre de la mochila", type: 3, required: true, autocomplete: true },
      {
        name: "accion",
        description: "A\xF1adir o quitar permiso",
        type: 3,
        required: true,
        choices: [
          { name: "A\xF1adir", value: "add" },
          { name: "Quitar", value: "remove" }
        ]
      },
      { name: "usuario", description: "Usuario a gestionar", type: 6 },
      { name: "rol", description: "Rol a gestionar", type: 8 },
      { name: "admin", description: "Modo admin (ignora propiedad)", type: 5 }
    ]
  },
  async run(interaction) {
    const mochilaName = interaction.options.getString("mochila", true);
    const accion = interaction.options.getString("accion", true);
    const targetUser = interaction.options.getUser("usuario");
    const targetRole = interaction.options.getRole("rol");
    const adminFlag = interaction.options.getBoolean("admin") === true;
    const guildId = interaction.guildId;
    const member = interaction.member;
    if (!guildId) return { content: "\u274C Error de servidor.", ephemeral: true };
    if (!targetUser && !targetRole) {
      return { content: "\u274C Debes indicar un usuario o un rol.", ephemeral: true };
    }
    const regex = new RegExp(`^${escapeRegex(mochilaName)}$`, "i");
    let bp = await BackpackModel.findOne({ ownerId: interaction.user.id, name: regex });
    if (!bp && (member.permissions.has(PermissionFlagsBits.Administrator) || adminFlag)) {
      bp = await BackpackModel.findOne({ name: regex });
    }
    if (!bp) return { content: "\u274C Mochila no encontrada.", ephemeral: true };
    const isOwner = bp.ownerId === interaction.user.id;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isOwner && !(isAdmin && adminFlag)) {
      return { content: "\u274C No tienes permisos para autorizar en esta mochila.", ephemeral: true };
    }
    if (accion === "add") bp.accessType = "custom";
    let changes = [];
    if (targetUser) {
      const id = targetUser.id;
      if (accion === "add") {
        if (!bp.allowedUsers.includes(id)) {
          bp.allowedUsers.push(id);
          changes.push(`Usuario ${targetUser} a\xF1adido.`);
        }
      } else {
        bp.allowedUsers = bp.allowedUsers.filter((u) => u !== id);
        changes.push(`Usuario ${targetUser} eliminado.`);
      }
    }
    if (targetRole) {
      const id = targetRole.id;
      if (accion === "add") {
        if (!bp.allowedRoles.includes(id)) {
          bp.allowedRoles.push(id);
          changes.push(`Rol ${targetRole} a\xF1adido.`);
        }
      } else {
        bp.allowedRoles = bp.allowedRoles.filter((r) => r !== id);
        changes.push(`Rol ${targetRole} eliminado.`);
      }
    }
    if (bp.allowedUsers.length === 0 && bp.allowedRoles.length === 0) {
      bp.accessType = "owner_only";
    }
    if (!bp.guildId) {
      bp.guildId = guildId;
    }
    await bp.save();
    return {
      embeds: [
        ThemedEmbed.success(
          "Permisos Actualizados",
          `Mochila: **${bp.name}**
${changes.join("\n") || "Sin cambios."}`
        )
      ],
      ephemeral: true
    };
  }
};
export {
  autorizar
};
