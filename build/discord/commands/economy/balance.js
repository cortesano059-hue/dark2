import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
createCommand({
  name: "balance",
  description: "Muestra tu balance o el de otro usuario.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "usuario",
      description: "Usuario (opcional)",
      type: ApplicationCommandOptionType.User,
      required: false
    }
  ],
  async run(interaction) {
    const user = interaction.options.getUser("usuario") || interaction.user;
    const guildId = interaction.guildId;
    if (!guildId) return;
    try {
      const bal = await eco.getBalance(user.id, guildId);
      if (!bal) {
        await safeReply(interaction, "\u274C No se pudo obtener el balance.");
        return;
      }
      const money = Number(bal.money || 0);
      const bank = Number(bal.bank || 0);
      const embed = new ThemedEmbed(interaction).setTitle(`\u{1F4B0} Balance de ${user.username}`).setColor("#f1c40f").addFields(
        {
          name: "\u{1FA99} Dinero en mano",
          value: `${money.toLocaleString()}$`,
          inline: false
        },
        {
          name: "\u{1F3E6} Banco",
          value: `${bank.toLocaleString()}$`,
          inline: false
        },
        {
          name: "\u{1F4BC} Total",
          value: `${(money + bank).toLocaleString()}$`,
          inline: false
        }
      );
      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      console.error("\u274C Error en /balance:", err);
      await safeReply(interaction, "\u274C Ha ocurrido un error al obtener el balance.");
    }
  }
});
