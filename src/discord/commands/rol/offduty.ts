// src/commands/rol/offduty.js
import { SlashCommandBuilder } from 'discord.js';
import { DutyStatus, IncomeRole, User } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

export default {
  data: new SlashCommandBuilder()
    .setName("offduty")
    .setDescription("Salir de servicio y recibir el pago proporcional restante."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const status = await DutyStatus.findOne({ userId, guildId });
    if (!status)
      return safeReply(interaction, "❌ No estabas en servicio.");

    const now = Date.now();
    const minutesWorked = Math.floor((now - new Date(status.lastPayment).getTime()) / 60000);

    if (minutesWorked < 1) {
      await DutyStatus.deleteOne({ userId, guildId });
      return safeReply(interaction, "Has salido de servicio. No había pago pendiente.");
    }

    const incomeRole = await IncomeRole.findOne({
      guildId,
      roleId: status.roleId,
    });

    if (!incomeRole) {
      await DutyStatus.deleteOne({ userId, guildId });
      return safeReply(interaction, "⚠️ Tu rol ya no tiene salario configurado.");
    }

    const perMinute = incomeRole.incomePerHour / 60;
    const payment = Math.round(perMinute * minutesWorked);

    await User.findOneAndUpdate(
      { userId, guildId },
      { $inc: { bank: payment } },
      { upsert: true }
    );

    await DutyStatus.deleteOne({ userId, guildId });

    return safeReply(interaction, {
      embeds: [
        {
          title: "🔴 Fin de servicio",
          description:
            `Has trabajado **${minutesWorked} minutos** desde tu último pago.\n\n` +
            `Has recibido **$${payment}** que fueron enviados a tu **banco**.`,
          color: 0xe74c3c,
        }
      ]
    });
  },
};


