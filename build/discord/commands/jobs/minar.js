import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { addMoney, getMiningConfig, getMiningCooldown, hasItem, setMiningCooldown } from "../../../economy/index.js";
import { MINING_CONFIG, chance, formatTime, pickRarity, random } from "../../../economy/miningRules.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";
createCommand({
  name: "minar",
  description: "Minar minerales y obtener dinero.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    if (!interaction.guildId || !interaction.member) return;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const cd = await getMiningCooldown(userId, guildId);
    if (cd > Date.now()) {
      await safeReply(interaction, {
        embeds: [new ThemedEmbed().setTitle("\u23F3 Miner\xEDa en cooldown").setDescription(`Debes esperar **${formatTime(cd - Date.now())}**.`)]
      });
      return;
    }
    const config = await getMiningConfig(guildId);
    if (config?.requireType === "role") {
      if (!interaction.member.roles.cache.has(config.requireId)) {
        await safeReply(interaction, `\u274C No tienes el rol necesario para minar.
Requerido: <@&${config.requireId}> (ID: ${config.requireId})`);
        return;
      }
    }
    if (config?.requireType === "item") {
      const ok = await hasItem(userId, guildId, config.requireId, 1);
      if (!ok) {
        await safeReply(interaction, "\u274C Necesitas un pico (item) para minar.");
        return;
      }
    }
    let totalMoney = 0;
    let lines = [];
    for (const [name, data] of Object.entries(MINING_CONFIG.minerals)) {
      if (!chance(data.chance)) continue;
      const rarity = pickRarity(MINING_CONFIG.rarities);
      const qtyBase = random(data.quantity[0], data.quantity[1]);
      const qtyFinal = Math.max(1, Math.floor(qtyBase * MINING_CONFIG.rarities[rarity].multiplier));
      const earned = qtyFinal * data.price;
      totalMoney += earned;
      lines.push(`\u26CF\uFE0F **${name}** (${rarity}) \xD7 ${qtyFinal} \u2192 **${earned}$**`);
    }
    await setMiningCooldown(userId, guildId, Date.now() + MINING_CONFIG.cooldown);
    if (!totalMoney) {
      await safeReply(interaction, {
        embeds: [new ThemedEmbed().setTitle("\u26CF\uFE0F Miner\xEDa").setColor("Grey").setDescription("No has encontrado nada.")]
      });
      return;
    }
    await addMoney(userId, guildId, totalMoney, "mining");
    const embed = new ThemedEmbed().setTitle("\u26CF\uFE0F Resultado").setColor("Gold").setDescription(lines.join("\n")).addFields({ name: "\u{1F4B0} Total ganado", value: `**${totalMoney}$**` }).setFooter({ text: `Cooldown: ${formatTime(MINING_CONFIG.cooldown)}` });
    await safeReply(interaction, { embeds: [embed] });
  }
});
