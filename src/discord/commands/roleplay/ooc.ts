import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";

createCommand({
    name: "ooc",
    description: "Hablar fuera de rol.",
    type: ApplicationCommandType.ChatInput,
    options: [
        { name: "mensaje", description: "Texto", type: ApplicationCommandOptionType.String, required: true }
    ],
    async run(interaction) {
        const text = interaction.options.getString("mensaje", true);
        const embed = new ThemedEmbed()
            .setTitle("🛡️ Fuera de Rol (OOC)")
            .setColor("#95A5A6")
            .setDescription(text)
            .setFooter({ text: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() });

        await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
});
