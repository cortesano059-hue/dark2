import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { listAccessibleBackpacks, listAllGuildBackpacks } from "../../../../database/repositories/backpackRepo.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
const listar = {
  command: {
    name: "listar",
    description: "Listar mochilas",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "admin", description: "Ver todas las mochilas (Admin)", type: ApplicationCommandOptionType.Boolean }
    ]
  },
  async run(interaction) {
    const member = interaction.member;
    const adminMode = interaction.options.getBoolean("admin");
    let list;
    if (adminMode) {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        return { content: "\u274C No tienes permisos de administrador.", ephemeral: true };
      }
      list = await listAllGuildBackpacks(interaction.guildId);
    } else {
      const roleIds = Array.isArray(member.roles) ? member.roles : member.roles.cache ? member.roles.cache.map((r) => r.id) : [];
      list = await listAccessibleBackpacks(interaction.user.id, interaction.guildId, roleIds);
    }
    if (!list.length) return { content: "\u274C No se encontraron mochilas.", ephemeral: true };
    const content = list.map((b) => {
      const isOwner = b.ownerId === interaction.user.id;
      const typeIcon = b.accessType === "custom" ? "\u{1F465}" : "\u{1F512}";
      const ownerText = isOwner ? " (Tuya)" : " (Compartida)";
      let ownerDisplay = `<@${b.ownerId}>`;
      if (b.ownerType === "role") ownerDisplay = `<@&${b.ownerId}>`;
      if (b.ownerType === "system") ownerDisplay = `[SISTEMA]`;
      const adminInfo = adminMode ? ` [Due\xF1o: ${ownerDisplay}]` : "";
      return `\u2022 ${typeIcon} **${b.name}**${ownerText}${adminInfo} \u2022 ${Object.keys(b.items).length}/${b.capacity} items`;
    }).join("\n");
    return {
      embeds: [
        new ThemedEmbed().setTitle(adminMode ? "\u{1F392} ADMIN: Todas las Mochilas" : "\u{1F392} Mochilas Disponibles").setDescription(content || "No hay mochilas accesibles.")
      ],
      ephemeral: true
    };
  }
};
export {
  listar
};
