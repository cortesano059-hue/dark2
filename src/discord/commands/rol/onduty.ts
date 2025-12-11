// src/commands/rol/onduty.js
import { SlashCommandBuilder } from 'discord.js';
import { IncomeRole, DutyStatus } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

export default {
  data: new SlashCommandBuilder()
    .setName("onduty")
    .setDescription("Entrar en servicio y comenzar a recibir salario."),

  async execute(interaction) {
    const user = interaction.user;
    const guild = interaction.guild;

    const existing = await DutyStatus.findOne({
      userId: user.id,
      guildId: guild.id,
    });

    if (existing)
      return safeReply(interaction, "⚠️ Ya estabas en servicio.");

    const member = await guild.members.fetch(user.id);
    const roles = member.roles.cache.map(r => r.id);

    const incomeRoles = await IncomeRole.find({ guildId: guild.id });

    const validRoles = incomeRoles
      .filter(r => roles.includes(r.roleId))
      .sort((a, b) => {
        const posA = guild.roles.cache.get(a.roleId)?.position || 0;
        const posB = guild.roles.cache.get(b.roleId)?.position || 0;
        return posB - posA;
      });

    if (validRoles.length === 0)
      return safeReply(interaction, "❌ No tienes ningún rol con salario configurado.");

    const selectedRole = validRoles[0];

    await DutyStatus.create({
      userId: user.id,
      guildId: guild.id,
      roleId: selectedRole.roleId,
      startTime: new Date(),
      lastPayment: new Date(),
      channelId: interaction.channel.id,
    });

    return safeReply(interaction, {
      embeds: [
        {
          title: "🟢 En servicio",
          description: `Has entrado en servicio como **<@&${selectedRole.roleId}>**.  
Empezarás a recibir pagos automáticos cada hora.`,
          color: 0x2ecc71,
        }
      ]
    });
  }
};


