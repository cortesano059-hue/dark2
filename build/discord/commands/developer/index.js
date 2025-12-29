import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { DutyStatus, User } from "../../../database/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";
createCommand({
  name: "developer",
  description: "Comandos de desarrollador.",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: ["Administrator"],
  // Using string or bitfield
  options: [
    {
      name: "offdutyall",
      description: "Saca de servicio a todos los usuarios.",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "getids",
      description: "Obtiene IDs de configuraci\xF3n (roles, canales, etc).",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "list",
      description: "Lista todos los comandos cargados.",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "clear",
      description: "Borra los comandos slash del servidor actual.",
      type: ApplicationCommandOptionType.Subcommand
    }
  ],
  async run(interaction) {
    if (!interaction.guildId) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await safeReply(interaction, "\u274C No tienes permisos.");
      return;
    }
    if (sub === "offdutyall") {
      const allDuty = await DutyStatus.find({ guildId });
      if (allDuty.length === 0) {
        await safeReply(interaction, "\u26A0\uFE0F No hay usuarios en servicio.");
        return;
      }
      let results = [];
      const now = /* @__PURE__ */ new Date();
      for (const status of allDuty) {
        const startTime = new Date(status.startTime);
        const minutesWorked = Math.floor((now.getTime() - startTime.getTime()) / 6e4);
        if (minutesWorked < 10) {
          results.push(`\u23F1\uFE0F <@${status.userId}> estuvo **${minutesWorked} min** \u2192 \u274C Sin pago (menos de 10 min)`);
          await DutyStatus.deleteOne({ userId: status.userId, guildId });
          continue;
        }
        const config = await GuildConfig.findOne({ guildId }).lean();
        const incomeRole = config?.incomeRoles?.find((r) => r.roleId === status.roleId);
        if (!incomeRole) {
          results.push(`\u26A0\uFE0F <@${status.userId}> no tiene salario asignado.`);
          await DutyStatus.deleteOne({ userId: status.userId, guildId });
          continue;
        }
        const perMinute = incomeRole.incomePerHour / 60;
        const payment = Math.round(perMinute * minutesWorked);
        await User.findOneAndUpdate(
          { userId: status.userId, guildId },
          { $inc: { bank: payment } },
          { upsert: true }
        );
        results.push(`\u{1F4B5} <@${status.userId}> trabaj\xF3 **${minutesWorked} min** \u2192 Pagado **$${payment}**`);
        await DutyStatus.deleteOne({ userId: status.userId, guildId });
      }
      await safeReply(interaction, {
        embeds: [
          new ThemedEmbed().setTitle("\u{1F4E2} Todos fuera de servicio").setDescription(results.join("\n").slice(0, 4e3)).setColor("#e74c3c")
        ]
      });
    }
    if (sub === "getids") {
      const channel = interaction.channel;
      const guild = interaction.guild;
      const txt = `
**Guild ID:** \`${guildId}\`
**Channel ID:** \`${channel?.id}\`
**User ID:** \`${interaction.user.id}\`
            `;
      await safeReply(interaction, {
        embeds: [
          new ThemedEmbed().setTitle("\u{1F194} IDs").setDescription(txt)
        ]
      });
    }
    if (sub === "list") {
      const sortedMap = new Map([...interaction.client.commands.entries()].sort());
      const list = [...sortedMap.keys()].map((name) => `\`/${name}\``).join(", ");
      await safeReply(interaction, {
        embeds: [
          new ThemedEmbed().setTitle(`\u{1F4DC} Comandos (${sortedMap.size})`).setDescription(list || "No hay comandos cargados.")
        ]
      });
    }
    if (sub === "clear") {
      await safeReply(interaction, "\u{1F9F9} Borrando comandos de este servidor...");
      await interaction.guild?.commands.set([]);
      await interaction.followUp({ content: "\u2705 Comandos borrados del servidor (cache local no afectada).", ephemeral: true });
    }
  }
});
