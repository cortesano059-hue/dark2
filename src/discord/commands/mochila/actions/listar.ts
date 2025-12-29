import { ApplicationCommandOptionType, InteractionReplyOptions, PermissionFlagsBits } from "discord.js";
import { listAccessibleBackpacks, listAllGuildBackpacks } from "../../../../database/repositories/backpackRepo.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";

export const listar = {
  command: {
    name: "listar",
    description: "Listar mochilas",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "admin", description: "Ver todas las mochilas (Admin)", type: ApplicationCommandOptionType.Boolean }
    ]
  },
  async run(interaction: any): Promise<InteractionReplyOptions> {
    const member = interaction.member;
    const adminMode = interaction.options.getBoolean("admin");

    let list;

    if (adminMode) {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        return { content: "❌ No tienes permisos de administrador.", ephemeral: true };
      }
      list = await listAllGuildBackpacks(interaction.guildId!);
    } else {
      // Robust role extraction (handles APIInteractionGuildMember and GuildMember)
      const roleIds = Array.isArray(member.roles)
        ? member.roles
        : (member.roles.cache ? member.roles.cache.map((r: any) => r.id) : []);
      list = await listAccessibleBackpacks(interaction.user.id, interaction.guildId!, roleIds);
    }

    if (!list.length) return { content: "❌ No se encontraron mochilas.", ephemeral: true };

    const content = list.map(b => {
      const isOwner = b.ownerId === interaction.user.id;
      const typeIcon = b.accessType === 'custom' ? "👥" : "🔒";
      const ownerText = isOwner ? " (Tuya)" : " (Compartida)";
      // Admin view extra info
      let ownerDisplay = `<@${b.ownerId}>`;
      if (b.ownerType === 'role') ownerDisplay = `<@&${b.ownerId}>`;
      if (b.ownerType === 'system') ownerDisplay = `[SISTEMA]`;

      const adminInfo = adminMode ? ` [Dueño: ${ownerDisplay}]` : "";

      return `• ${typeIcon} **${b.name}**${ownerText}${adminInfo} • ${Object.keys(b.items).length}/${b.capacity} items`;
    }).join("\n");

    return {
      embeds: [
        new ThemedEmbed()
          .setTitle(adminMode ? "🎒 ADMIN: Todas las Mochilas" : "🎒 Mochilas Disponibles")
          .setDescription(content || "No hay mochilas accesibles.")
      ],
      ephemeral: true
    };
  },
};
