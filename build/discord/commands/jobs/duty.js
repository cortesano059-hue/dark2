import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { DutyStatus, User } from "../../../database/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";
function formatHM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}
createCommand({
  name: "duty",
  description: "Sistema de servicio (Duty).",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "on",
      description: "Entrar en servicio.",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "off",
      description: "Salir de servicio.",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "info",
      description: "Ver tu estado.",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "list",
      description: "Ver qui\xE9n est\xE1 en servicio.",
      type: ApplicationCommandOptionType.Subcommand
    }
  ],
  async run(interaction) {
    if (!interaction.guildId || !interaction.member) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (sub === "on") {
      const existing = await DutyStatus.findOne({ userId, guildId });
      if (existing) {
        await safeReply(interaction, "\u26A0\uFE0F Ya estabas en servicio.");
        return;
      }
      const config = await GuildConfig.findOne({ guildId }).lean();
      const incomeRoles = config?.incomeRoles || [];
      const userRoles = interaction.member.roles.cache;
      const validRoles = incomeRoles.filter((ir) => userRoles.has(ir.roleId));
      if (validRoles.length === 0) {
        await safeReply(interaction, "\u274C No tienes rol con salario.");
        return;
      }
      validRoles.sort((a, b) => {
        const ra = interaction.guild?.roles.cache.get(a.roleId);
        const rb = interaction.guild?.roles.cache.get(b.roleId);
        return (rb?.position || 0) - (ra?.position || 0);
      });
      const selected = validRoles[0];
      await DutyStatus.create({
        userId,
        guildId,
        roleId: selected.roleId,
        startTime: /* @__PURE__ */ new Date(),
        lastPayment: /* @__PURE__ */ new Date(),
        channelId: interaction.channelId
      });
      await safeReply(interaction, {
        embeds: [
          new ThemedEmbed().setTitle("\u{1F7E2} En servicio").setDescription(`Servicio iniciado como <@&${selected.roleId}>.`).setColor("#2ecc71")
        ]
      });
    }
    if (sub === "off") {
      const status = await DutyStatus.findOne({ userId, guildId });
      if (!status) {
        await safeReply(interaction, "\u274C No est\xE1s en servicio.");
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const minutes = Math.floor((now.getTime() - status.lastPayment.getTime()) / 6e4);
      const config = await GuildConfig.findOne({ guildId }).lean();
      const incomeRole = config?.incomeRoles?.find((r) => r.roleId === status.roleId);
      let payment = 0;
      let msg = `Has trabajado **${minutes} minutos**.`;
      if (incomeRole && minutes >= 1) {
        const perMin = incomeRole.incomePerHour / 60;
        payment = Math.round(perMin * minutes);
        await User.findOneAndUpdate(
          { userId, guildId },
          { $inc: { bank: payment } },
          { upsert: true }
        );
        msg += `
Has recibido **$${payment}** en tu banco.`;
      }
      await DutyStatus.deleteOne({ userId, guildId });
      await safeReply(interaction, {
        embeds: [
          new ThemedEmbed().setTitle("\u{1F534} Fin de servicio").setDescription(msg).setColor("#e74c3c")
        ]
      });
    }
    if (sub === "info") {
      const duty = await DutyStatus.findOne({ userId, guildId });
      if (!duty) {
        await safeReply(interaction, "\u{1F6AB} No est\xE1s en servicio.");
        return;
      }
      const start = new Date(duty.startTime).getTime();
      const totalMin = Math.floor((Date.now() - start) / 6e4);
      await safeReply(interaction, {
        embeds: [
          new ThemedEmbed().setTitle("\u{1F9D1} Estado").addFields({ name: "Tiempo", value: formatHM(totalMin) })
        ]
      });
    }
    if (sub === "list") {
      const all = await DutyStatus.find({ guildId });
      if (all.length === 0) {
        await safeReply(interaction, "\u{1F7E1} Nadie en servicio.");
        return;
      }
      const list = all.map((d) => `<@${d.userId}> (<@&${d.roleId}>)`).join("\n");
      await safeReply(interaction, {
        embeds: [
          new ThemedEmbed().setTitle("\u{1F46E} En servicio").setDescription(list)
        ]
      });
    }
  }
});
