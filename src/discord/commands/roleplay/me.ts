import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";

createCommand({
    name: "me",
    description: "Acción de personaje.",
    type: ApplicationCommandType.ChatInput,
    options: [
        { name: "texto", description: "Acción", type: ApplicationCommandOptionType.String, required: true }
    ],
    async run(interaction) {
        const text = interaction.options.getString("texto", true);
        const embed = new ThemedEmbed()
            .setTitle("🎭 Me")
            .setColor("#9B59B6")
            .setDescription(text)
            .setFooter({ text: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() });

        await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
});
