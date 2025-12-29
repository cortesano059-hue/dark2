import { createCommand } from "#base";
import { GuildConfig } from "#database";
import { ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
createCommand({
  name: "incomeall",
  description: "Muestra todos los roles con salarios configurados.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    try {
      const guild = interaction.guild;
      if (!guild) return;
      const guildId = guild.id;
      const config = await GuildConfig.findOne({ guildId }).lean();
      const incomes = config?.incomeRoles || [];
      if (!incomes || incomes.length === 0) {
        await safeReply(interaction, {
          embeds: [
            {
              title: "\u{1F4C4} Lista de salarios",
              description: "No hay salarios configurados en este servidor.",
              color: 15158332
            }
          ]
        });
        return;
      }
      incomes.sort((a, b) => b.incomePerHour - a.incomePerHour);
      const lines = [];
      for (let i = 0; i < incomes.length; i++) {
        const r = incomes[i];
        let role = guild.roles.cache.get(r.roleId);
        if (!role) {
          try {
            role = await guild.roles.fetch(r.roleId) ?? void 0;
          } catch {
            role = void 0;
          }
        }
        const roleTag = role ? `<@&${r.roleId}>` : "\u274C Rol eliminado";
        lines.push(
          `**${i + 1}.** ${roleTag} \u2014 \u{1F4B5} **$${r.incomePerHour.toLocaleString()}/hora**`
        );
      }
      const description = lines.join("\n").slice(0, 4e3);
      await safeReply(interaction, {
        embeds: [
          {
            title: "\u{1F4BC} Salarios configurados",
            description,
            color: 3447003,
            footer: {
              text: `Total de roles con salario: ${incomes.length}`
            }
          }
        ]
      });
    } catch (err) {
      console.error("\u274C Error en /incomeall:", err);
      await safeReply(interaction, {
        content: "\u274C Ocurri\xF3 un error al obtener los salarios.",
        ephemeral: true
      });
    }
  }
});
