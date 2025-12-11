// src/commands/economy/incomeinfo.js
import { SlashCommandBuilder } from 'discord.js';
import { IncomeRole } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

const command = {
  data: new SlashCommandBuilder()
    .setName("incomeinfo")
    .setDescription("Muestra el salario configurado de un rol.")
    .addRoleOption(o =>
      o.setName("rol")
        .setDescription("Rol a consultar")
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const role = interaction.options.getRole("rol");

    const info = await IncomeRole.findOne({ guildId, roleId: role.id });

    if (!info)
      return safeReply(interaction, `❌ El rol **${role.name}** no tiene salario configurado.`);

    return safeReply(interaction, {
      embeds: [
        {
          title: "📄 Información salarial",
          description:
            `El rol **${role.name}** cobra **$${info.incomePerHour}/hora**.`,
          color: 0xf1c40f,
        }
      ]
    });
  },
};

export default command;
