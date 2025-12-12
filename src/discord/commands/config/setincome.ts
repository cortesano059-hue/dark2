// src/commands/economy/setincome.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { IncomeRole } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

const command = {
  data: new SlashCommandBuilder()
    .setName("setincome")
    .setDescription("Configura el sueldo por hora de un rol.")
    .addRoleOption(o =>
      o.setName("rol")
        .setDescription("Rol al que asignar salario")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("cantidad")
        .setDescription("Cantidad por hora")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const role = interaction.options.getRole("rol");
    const amount = interaction.options.getInteger("cantidad");
    const guildId = interaction.guild.id;

    await IncomeRole.findOneAndUpdate(
      { guildId, roleId: role.id },
      { incomePerHour: amount },
      { upsert: true }
    );

    return safeReply(interaction, {
      embeds: [
        {
          title: "💼 Salario configurado",
          description: `El rol **${role.name}** ahora cobra **$${amount}/hora**.`,
          color: 0x00a8ff
        }
      ]
    });
  },
};

export default command;
