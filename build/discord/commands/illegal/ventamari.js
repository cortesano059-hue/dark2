import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { getMariConfig, sellMari } from "../../../economy/index.js";
createCommand({
  name: "vendermari",
  description: "Vende marihuana (requiere rol ilegal y item configurado).",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    if (!interaction.guildId || !interaction.member) return;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const cfg = await getMariConfig(guildId);
    if (!cfg) {
      await safeReply(interaction, {
        content: "\u274C No se ha configurado la venta de marihuana. Usa `/config mari`.",
        ephemeral: true
      });
      return;
    }
    const { roleId } = cfg;
    if (roleId && !interaction.member.roles.cache.has(roleId)) {
      await safeReply(interaction, {
        content: `\u274C No tienes el rol ilegal requerido para vender. Debes tener: <@&${roleId}>`,
        ephemeral: true
      });
      return;
    }
    const result = await sellMari(userId, guildId);
    if (!result.success) {
      await safeReply(interaction, {
        content: `\u274C ${result.message || "No se pudo completar la venta."}`,
        ephemeral: true
      });
      return;
    }
    const { consume, priceUnit, earn, itemName } = result;
    const embed = new ThemedEmbed().setTitle("\u{1F33F} Venta realizada con \xE9xito").setColor("#2ecc71").setThumbnail(interaction.user.displayAvatarURL()).setDescription(`Has vendido **${itemName}** en el mercado ilegal.`).addFields(
      { name: "\u{1F4E6} Cantidad consumida", value: `${consume} unidades`, inline: true },
      { name: "\u{1F4B0} Precio por unidad", value: `${priceUnit}$`, inline: true },
      { name: "\u{1F911} Ganancia total", value: `**${earn.toLocaleString()}$**`, inline: false }
    ).setFooter({ text: "Mercado ilegal | DarkRP" }).setTimestamp();
    await safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
});
