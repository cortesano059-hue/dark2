import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { DutyStatus, IncomeRole, User } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

const command = {
  data: new SlashCommandBuilder()
    .setName("offdutyall")
    .setDescription("Saca de servicio a todos los usuarios y les paga lo que les corresponde.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    await interaction.deferReply({ ephemeral: false });

    const allDuty = await DutyStatus.find({ guildId });

    if (allDuty.length === 0) {
      return safeReply(interaction, "⚠️ No hay usuarios en servicio.");
    }

    const now = Date.now();
    let results = [];

    for (const status of allDuty) {
      const start = new Date(status.startTime).getTime();
      const minutesWorked = Math.floor((now - start) / 60000);

      if (minutesWorked < 10) {
        // No paga, estuvo poco
        results.push(
          `⏱️ <@${status.userId}> estuvo **${minutesWorked} min** → ❌ Sin pago (menos de 10 min)`
        );
        await DutyStatus.deleteOne({ userId: status.userId, guildId });
        continue;
      }

      const incomeRole = await IncomeRole.findOne({
        guildId,
        roleId: status.roleId,
      });

      if (!incomeRole) {
        results.push(
          `⚠️ <@${status.userId}> no tiene salario asignado.`
        );
        await DutyStatus.deleteOne({ userId: status.userId, guildId });
        continue;
      }

      // Pago proporcional
      const perMinute = incomeRole.incomePerHour / 60;
      const payment = Math.round(perMinute * minutesWorked);

      // Pagar al banco
      await User.findOneAndUpdate(
        { userId: status.userId, guildId },
        { $inc: { bank: payment } },
        { upsert: true }
      );

      results.push(
        `💵 <@${status.userId}> trabajó **${minutesWorked} min** → Pagado **$${payment}**`
      );

      // Limpia estado
      await DutyStatus.deleteOne({ userId: status.userId, guildId });
    }

    return safeReply(interaction, {
      embeds: [
        {
          title: "📢 Todos fuera de servicio",
          description: results.join("\n"),
          color: 0xe74c3c,
        }
      ]
    });
  }
};

export default command;
