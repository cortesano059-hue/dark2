import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
createCommand({
  name: "addmoney",
  description: "A\xF1adir dinero a un usuario (Admin).",
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
      name: "destino",
      description: "Destino del dinero",
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
      const destination = interaction.options.getString("destino");
      const guildId = interaction.guildId;
      if (!targetUser || !guildId || !destination) return;
      const amount = interaction.options.getInteger("cantidad");
      if (!amount || amount <= 0) {
        if (!targetUser) return safeReply(interaction, { embeds: [ThemedEmbed.error("Error", "Usuario no encontrado.")] });
        return;
      }
      let actionSuccess = false;
      if (destination === "money") {
        actionSuccess = await eco.addMoney(targetUser.id, guildId, amount, "admin_addmoney");
      } else if (destination === "bank") {
        actionSuccess = await eco.addBank(targetUser.id, guildId, amount, "admin_addbank");
      }
      if (!actionSuccess) {
        await safeReply(interaction, ThemedEmbed.error("Error", "No se pudo a\xF1adir el dinero."));
        return;
      }
      const balance = await eco.getBalance(targetUser.id, guildId);
      const embed = new ThemedEmbed(interaction).setTitle("\u{1F4B0} Dinero A\xF1adido").setDescription(`Se han a\xF1adido **$${amount.toLocaleString()}** a ${targetUser} en su **${destination === "money" ? "cartera" : "banco"}**.`).addFields(
        { name: "Dinero en Mano", value: `$${(balance.money ?? 0).toLocaleString()}`, inline: true },
        { name: "Dinero en Banco", value: `$${(balance.bank ?? 0).toLocaleString()}`, inline: true }
      ).setThumbnail(targetUser.displayAvatarURL({ forceStatic: false })).setColor("#2ecc71");
      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      console.error("\u274C ERROR EN COMANDO addmoney.ts:", err);
      await safeReply(interaction, ThemedEmbed.error("Error", "No se pudo a\xF1adir el dinero."));
    }
  }
});
