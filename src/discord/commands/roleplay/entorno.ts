import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { getPoliceRole } from "../../../economy/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";

createCommand({
    name: "entorno",
    description: "Envía un mensaje de entorno global.",
    type: ApplicationCommandType.ChatInput,
    options: [
        { name: "mensaje", description: "Lo que sucede", type: ApplicationCommandOptionType.String, required: true },
        { name: "ubicacion", description: "Ubicación del evento", type: ApplicationCommandOptionType.String, required: false }
    ],
    async run(interaction) {
        if (!interaction.guildId) return;
        const text = interaction.options.getString("mensaje", true);
        const ubicacion = interaction.options.getString("ubicacion") || "Desconocida";
        const guildId = interaction.guildId;

        const policeRoleId = await getPoliceRole(guildId);
        const policePing = policeRoleId ? `<@&${policeRoleId}>` : null;

        const embed = new ThemedEmbed()
            .setTitle("📢 LLAMADA DE ENTORNO")
            .setColor("#F1C40F")
            .setDescription(text)
            .addFields({ name: "📍 Ubicación", value: ubicacion, inline: true })
            .setFooter({ text: `Reportado por ${interaction.user.displayName}` });

        const content = policePing
            ? `|| ${policePing} ||\n🚨 Nueva llamada de entorno`
            : `🚨 Nueva llamada de entorno`;

        await safeReply(interaction, {
            content,
            embeds: [embed],
            allowedMentions: policeRoleId ? { roles: [policeRoleId] } : {},
            ephemeral: false
        });
    }
});
