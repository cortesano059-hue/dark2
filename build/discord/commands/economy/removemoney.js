import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
import { logger } from "../../../utils/logger.js";
createCommand({
  name: "removemoney",
  description: "Quitar dinero a un usuario (Admin).",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: "usuario",
      description: "Usuario",
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: "cantidad",
      description: "Cantidad",
      type: ApplicationCommandOptionType.Integer,
      required: true
    },
    {
      name: "origen",
      description: "Desde d\xF3nde quitar el dinero",
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: "Dinero en mano", value: "money" },
        { name: "Banco", value: "bank" }
      ],
      required: true
    }
  ],
  async run(interaction) {
    await interaction.deferReply({});
    try {
      const targetUser = interaction.options.getUser("usuario");
      const source = interaction.options.getString("origen");
      const guildId = interaction.guildId;
      if (!targetUser || !guildId || !source) return;
      const amount = interaction.options.getInteger("cantidad");
      if (!amount || amount <= 0) {
        await safeReply(interaction, ThemedEmbed.error("Error", "Cantidad inv\xE1lida."));
        return;
      }
      const balance = await eco.getBalance(targetUser.id, guildId);
      let removeResult = { success: false, message: "" };
      if (source === "money") {
        if ((balance.money ?? 0) < amount) {
          await safeReply(interaction, { embeds: [ThemedEmbed.error("Error", "El usuario no tiene suficiente dinero en mano.")] });
          return;
        }
        removeResult = await eco.removeMoney(targetUser.id, guildId, amount, "admin_removemoney");
      } else if (source === "bank") {
        if ((balance.bank ?? 0) < amount) {
          await safeReply(interaction, ThemedEmbed.error("Error", "El usuario no tiene suficiente dinero en el banco."));
          return;
        }
        const userDoc = await eco.getUser(targetUser.id, guildId);
        if (userDoc) {
          userDoc.bank = Math.max(0, (userDoc.bank || 0) - amount);
          await userDoc.save();
          logger.logTransaction({
            userId: targetUser.id,
            guildId,
            type: "admin_removebank",
            amount: -amount,
            from: "bank"
          });
          removeResult.success = true;
        }
      }
      if (!removeResult.success) {
        await safeReply(interaction, ThemedEmbed.error("Error", "No se pudo retirar el dinero."));
        return;
      }
      const newBalance = await eco.getBalance(targetUser.id, guildId);
      const embed = new ThemedEmbed(interaction).setTitle("\u{1F4B8} Dinero Retirado").setColor("#e74c3c").setDescription(`Se han quitado **$${amount.toLocaleString()}** de su **${source === "money" ? "cartera" : "banco"}** a **${targetUser}**.`).addFields(
        { name: "Dinero en Mano", value: `$${(newBalance.money ?? 0).toLocaleString()}`, inline: true },
        { name: "Dinero en Banco", value: `$${(newBalance.bank ?? 0).toLocaleString()}`, inline: true }
      );
      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      console.error("\u274C ERROR al ejecutar removemoney:", err);
      await safeReply(interaction, ThemedEmbed.error("Error", "No se pudo retirar el dinero."));
    }
  }
});
