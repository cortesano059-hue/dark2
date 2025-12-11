import { SlashCommandBuilder } from 'discord.js';
import { IncomeRole } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

const command = {
  data: new SlashCommandBuilder()
    .setName("incomeall")
    .setDescription("Muestra todos los roles con salarios configurados."),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;

    const incomes = await IncomeRole.find({ guildId });

    if (!incomes || incomes.length === 0) {
      return safeReply(interaction, {
        embeds: [
          {
            title: "📄 Lista de salarios",
            description: "No hay salarios configurados en este servidor.",
            color: 0xe74c3c
          }
        ]
      });
    }

    // Ordenar: mayor → menor salario
    incomes.sort((a, b) => b.incomePerHour - a.incomePerHour);

    const lines = incomes.map((r, i) => {
      const role = guild.roles.cache.get(r.roleId);
      const roleName = role ? role.name : "(Rol eliminado)";
      const roleTag = role ? `<@&${r.roleId}>` : "❌";

      return `**${i + 1}.** ${roleTag} **${roleName}** — 💵 **$${r.incomePerHour}/hora**`;
    });

    return safeReply(interaction, {
      embeds: [
        {
          title: "💼 Salarios configurados",
          description: lines.join("\n"),
          color: 0x3498db,
          footer: {
            text: `Total de roles con salario: ${incomes.length}`
          }
        }
      ]
    });
  }
};
export default command;