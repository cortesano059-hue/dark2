import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";

createCommand({
    name: "twitter",
    description: "Publicar un tweet.",
    type: ApplicationCommandType.ChatInput,
    options: [
        { name: "mensaje", description: "Texto", type: ApplicationCommandOptionType.String, required: true },
        { name: "imagen", description: "Imagen opcional", type: ApplicationCommandOptionType.Attachment, required: false }
    ],
    async run(interaction) {
        const text = interaction.options.getString("mensaje", true);
        const img = interaction.options.getAttachment("imagen");

        const embed = new ThemedEmbed()
            .setAuthor({ name: `@${interaction.user.username}`, iconURL: 'https://cdn-icons-png.flaticon.com/512/733/733579.png' })
            .setTitle("🐦 Nuevo Tweet")
            .setDescription(text)
            .setColor("#1DA1F2")
            .setFooter({ text: "Twitter for Discord", iconURL: interaction.user.displayAvatarURL() });

        if (img) embed.setImage(img.url);

        await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
});
