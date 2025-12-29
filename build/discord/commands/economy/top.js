import { createCommand } from "#base";
import {
  ApplicationCommandType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from "discord.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
createCommand({
  name: "top",
  description: "Muestra el ranking econ\xF3mico del servidor.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    if (!guildId) return;
    async function buildEmbed(mode) {
      const top = await eco.getLeaderboard(guildId, mode);
      const titles = {
        total: "\u{1F3C6} Top Econom\xEDa \u2014 Total (Cartera + Banco)",
        money: "\u{1FA99} Top Econom\xEDa \u2014 Solo Cartera",
        bank: "\u{1F3E6} Top Econom\xEDa \u2014 Solo Banco"
      };
      let description = "";
      for (let i = 0; i < top.length; i++) {
        const user = top[i];
        const rank = i + 1;
        let value = 0;
        if (mode === "total") value = user.total;
        if (mode === "money") value = user.money;
        if (mode === "bank") value = user.bank;
        description += `${rank}. <@${user.userId}> \u2014 **$${(value || 0).toLocaleString()}**
`;
      }
      const embed2 = new ThemedEmbed(interaction).setTitle(titles[mode]).setColor("#f1c40f").setDescription(description || "No hay suficientes datos.");
      return embed2;
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("top_total").setLabel("\u{1F4B0} Total").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("top_money").setLabel("\u{1FA99} Cartera").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("top_bank").setLabel("\u{1F3E6} Banco").setStyle(ButtonStyle.Secondary)
    );
    const embed = await buildEmbed("total");
    const reply = await interaction.editReply({ embeds: [embed], components: [row] });
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 6e4
    });
    collector.on("collect", async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        await btn.reply({ content: "Solo quien ejecut\xF3 el comando puede usar esto.", ephemeral: true });
        return;
      }
      let mode = "total";
      if (btn.customId === "top_money") mode = "money";
      if (btn.customId === "top_bank") mode = "bank";
      const newEmbed = await buildEmbed(mode);
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("top_total").setLabel("\u{1F4B0} Total").setStyle(mode === "total" ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("top_money").setLabel("\u{1FA99} Cartera").setStyle(mode === "money" ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("top_bank").setLabel("\u{1F3E6} Banco").setStyle(mode === "bank" ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
      await btn.update({ embeds: [newEmbed], components: [updatedRow] });
    });
    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch {
      }
    });
  }
});
