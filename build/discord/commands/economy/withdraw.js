import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import * as eco from "../../../economy/index.js";
createCommand({
  name: "withdraw",
  description: "Retira dinero del banco.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "cantidad",
      description: "Cantidad o 'all'",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) return;
    const raw = interaction.options.getString("cantidad");
    if (!raw) return;
    const bal = await eco.getBalance(userId, guildId);
    if (!bal) {
      await safeReply(interaction, "\u274C No se pudo obtener tu balance.", true);
      return;
    }
    let amount;
    if (raw.toLowerCase() === "all") {
      if ((bal.bank || 0) <= 0) {
        await safeReply(interaction, "\u274C No tienes dinero en el banco.", true);
        return;
      }
      amount = Number(bal.bank);
    } else {
      amount = Number(raw);
      if (isNaN(amount) || amount <= 0) {
        await safeReply(interaction, "\u274C Ingresa una cantidad v\xE1lida.", true);
        return;
      }
    }
    const result = await eco.withdraw(userId, guildId, amount);
    if (!result.success) {
      await safeReply(interaction, "\u274C No tienes suficiente dinero en el banco.", true);
      return;
    }
    const newBal = await eco.getBalance(userId, guildId);
    await safeReply(interaction, {
      content: `\u{1F3E6} Has retirado **$${amount.toLocaleString()}**.
\u{1F4B5} Ahora tienes **$${Number(newBal.money).toLocaleString()}** en mano.`
    }, true);
  }
});
