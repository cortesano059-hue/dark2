import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
createCommand({
  name: "anonimo",
  description: "Env\xEDa un mensaje an\xF3nimo.",
  type: ApplicationCommandType.ChatInput,
  options: [
    { name: "mensaje", description: "Contenido", type: ApplicationCommandOptionType.String, required: true }
  ],
  async run(interaction) {
    const text = interaction.options.getString("mensaje", true);
    const embed = new ThemedEmbed().setTitle("\u{1F575}\uFE0F Mensaje An\xF3nimo").setColor("#000001").setDescription(text).setFooter({ text: "Identidad Oculta", iconURL: "https://cdn-icons-png.flaticon.com/512/4645/4645305.png" }).setTimestamp();
    await safeReply(interaction, { embeds: [embed], ephemeral: false });
  }
});
