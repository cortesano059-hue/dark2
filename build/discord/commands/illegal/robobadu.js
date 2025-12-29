import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { BadulaqueLocalCooldown, GuildConfig } from "../../../database/index.js";
import { addToInventory, getPoliceRole, getUser } from "../../../economy/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";
const USER_CD = 15 * 60 * 1e3;
const BADU_CD = 30 * 60 * 1e3;
const BADUS = ["central", "casino", "rojo", "verde", "licoreria"];
function formatTime(ms) {
  const m = Math.floor(ms / 6e4);
  const s = Math.floor(ms % 6e4 / 1e3);
  return `${m}m ${s}s`;
}
createCommand({
  name: "robobadu",
  description: "Robo a un badulaque.",
  type: ApplicationCommandType.ChatInput,
  options: BADUS.map((b) => ({
    name: b,
    description: `Robo al Badulaque ${b.charAt(0).toUpperCase() + b.slice(1)}`,
    type: ApplicationCommandOptionType.Subcommand
  })),
  async run(interaction) {
    if (!interaction.guildId) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const now = Date.now();
    if (!BADUS.includes(sub)) {
      await safeReply(interaction, { content: "\u274C Badulaque inv\xE1lido.", ephemeral: true });
      return;
    }
    const user = await getUser(userId, guildId);
    if (!user) {
      await safeReply(interaction, { content: "\u274C Error al obtener tu perfil.", ephemeral: true });
      return;
    }
    const userCd = user.robobadu_cooldown || 0;
    if (userCd > now) {
      await safeReply(interaction, {
        content: `\u23F3 Debes esperar **${formatTime(userCd - now)}** para volver a robar.`,
        ephemeral: true
      });
      return;
    }
    const guildConfig = await GuildConfig.findOne({ guildId }).lean();
    const cfg = guildConfig?.badulaques?.find((b) => b.key === sub);
    if (!cfg) {
      await safeReply(interaction, {
        content: "\u274C Este badulaque no est\xE1 configurado.",
        ephemeral: true
      });
      return;
    }
    let baduCd = await BadulaqueLocalCooldown.findOne({ guildId, key: sub });
    if (!baduCd) {
      baduCd = await BadulaqueLocalCooldown.create({
        guildId,
        key: sub,
        cooldownUntil: 0
      });
    }
    if (baduCd.cooldownUntil > now) {
      await safeReply(interaction, {
        content: `\u{1F3EA} Este badulaque est\xE1 en enfriamiento.
\u23F3 Disponible en **${formatTime(baduCd.cooldownUntil - now)}**`,
        ephemeral: true
      });
      return;
    }
    user.robobadu_cooldown = now + USER_CD;
    await user.save();
    baduCd.cooldownUntil = now + BADU_CD;
    await baduCd.save();
    await addToInventory(userId, guildId, cfg.reward.itemName, cfg.reward.amount);
    const policeRoleId = await getPoliceRole(guildId);
    const policePing = policeRoleId ? `<@&${policeRoleId}>` : null;
    const embed = new ThemedEmbed().setTitle("\u{1F6A8} ROBO EN BADULAQUE").setColor("#E74C3C").setDescription(`\u{1F575}\uFE0F **Robo al Badulaque ${sub.toUpperCase()}**`).addFields(
      { name: "\u{1F4CD} Ubicaci\xF3n", value: `Badulaque ${sub}`, inline: true },
      { name: "\u{1F4B0} Bot\xEDn", value: `${cfg.reward.amount}x ${cfg.reward.itemName}`, inline: true }
    );
    if (cfg.image) embed.setImage(cfg.image);
    const content = policePing ? `${policePing}
\u{1F693} **Robo en curso**` : `\u{1F693} **Robo en curso**`;
    await safeReply(interaction, {
      content,
      embeds: [embed],
      allowedMentions: policeRoleId ? { roles: [policeRoleId] } : {}
    });
  }
});
