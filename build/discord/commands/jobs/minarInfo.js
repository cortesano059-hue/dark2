import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { getMiningConfig } from "../../../economy/index.js";
import { MINING_CONFIG, formatTime } from "../../../economy/miningRules.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";
createCommand({
  name: "minar-info",
  description: "Muestra informaci\xF3n sobre minerales, precios y requisitos.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    if (!interaction.guildId) return;
    const guildId = interaction.guildId;
    const config = await getMiningConfig(guildId);
    const mineralList = Object.entries(MINING_CONFIG.minerals).map(([name, data]) => `\u2022 **${name.charAt(0).toUpperCase() + name.slice(1)}**: ${data.price}$ (${(data.chance * 100).toFixed(1)}%)`).join("\n");
    const rarityList = Object.entries(MINING_CONFIG.rarities).map(([name, data]) => `\u2022 **${name.toUpperCase()}**: x${data.multiplier} (${(data.chance * 100).toFixed(0)}%)`).join("\n");
    let requirements = "Ninguno";
    if (config?.requireType === "role") {
      requirements = `Rol: <@&${config.requireId}>`;
    } else if (config?.requireType === "item" && config.requireId) {
      requirements = `Item requerido (ID: ${config.requireId})`;
    }
    const embed = new ThemedEmbed().setTitle("\u2139\uFE0F Informaci\xF3n de Miner\xEDa").setDescription("Aqu\xED tienes los detalles sobre la profesi\xF3n de minero.").addFields(
      { name: "\u{1F4CB} Requisitos", value: requirements, inline: true },
      { name: "\u23F1\uFE0F Cooldown", value: formatTime(MINING_CONFIG.cooldown), inline: true },
      { name: "\u{1F48E} Minerales", value: mineralList || "No hay minerales definidos.", inline: false },
      { name: "\u2728 Rarezas", value: rarityList || "N/A", inline: false }
    ).setColor("Blue");
    await safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
});
