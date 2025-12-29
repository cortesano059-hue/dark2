import { findAccessibleBackpack } from "../../../../database/repositories/backpackRepo.js";
import { ApplicationCommandOptionType, InteractionReplyOptions } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";

export const info = {
  command: {
    name: "info",
    description: "Información de una mochila",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Nombre de la mochila", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
    ]
  },
  async run(interaction: any): Promise<InteractionReplyOptions> {
    const nombre = interaction.options.getString("mochila", true);
    const member = interaction.member;
    // Robust role extraction
    const roleIds = Array.isArray(member.roles)
      ? member.roles
      : (member.roles.cache ? member.roles.cache.map((r: any) => r.id) : []);

    const bp = await findAccessibleBackpack(interaction.user.id, interaction.guildId!, nombre, roleIds);

    if (!bp) return { content: "❌ Mochila no encontrada.", ephemeral: true };

    const itemCount = Object.keys(bp.items).length;

    let ownerDisplay = `<@${bp.ownerId}>`;
    if (bp.ownerType === 'role') ownerDisplay = `<@&${bp.ownerId}>`;
    if (bp.ownerType === 'system') ownerDisplay = `[SISTEMA]`;

    const embed = new ThemedEmbed()
      .setTitle(`🎒 Info: ${bp.name}`)
      .addFields(
        { name: "Propietario", value: ownerDisplay, inline: true },
        { name: "Capacidad", value: `${itemCount}/${bp.capacity}`, inline: true },
        { name: "Acceso", value: bp.accessType || "Privado", inline: true }
      );

    // List perms if any
    if (bp.allowedUsers && bp.allowedUsers.length > 0) {
      embed.addFields({ name: "Usuarios permitidos", value: bp.allowedUsers.map(u => `<@${u}>`).join(", ") });
    }
    if (bp.allowedRoles && bp.allowedRoles.length > 0) {
      embed.addFields({ name: "Roles permitidos", value: bp.allowedRoles.map(r => `<@&${r}>`).join(", ") });
    }

    return {
      embeds: [embed],
      ephemeral: true
    };
  },
};
