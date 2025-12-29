import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";

createCommand({
    name: "do",
    description: "Describe el entorno o estado de tu personaje.",
    type: ApplicationCommandType.ChatInput,
    options: [
        { name: "texto", description: "Descripción", type: ApplicationCommandOptionType.String, required: true }
    ],
    async run(interaction) {
        const text = interaction.options.getString("texto", true);
        const embed = new ThemedEmbed()
            .setTitle("📜 Do")
            .setColor("#3498DB")
            .setDescription(text)
            .setFooter({ text: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() });

        await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
});
