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
                            title: "📄 Lista de salarios",
                            description: "No hay salarios configurados en este servidor.",
                            color: 0xe74c3c,
                        },
                    ],
                });
                return;
            }

            // Ordenar por salario (desc)
            incomes.sort((a, b) => b.incomePerHour - a.incomePerHour);

            const lines = [];

            for (let i = 0; i < incomes.length; i++) {
                const r = incomes[i];

                // Cache → fetch fallback
                let role = guild.roles.cache.get(r.roleId);
                if (!role) {
                    try {
                        role = (await guild.roles.fetch(r.roleId)) ?? undefined;
                    } catch {
                        role = undefined;
                    }
                }

                const roleTag = role ? `<@&${r.roleId}>` : "❌ Rol eliminado";

                lines.push(
                    `**${i + 1}.** ${roleTag} — 💵 **$${r.incomePerHour.toLocaleString()}/hora**`
                );
            }

            // Protección límite embed
            const description = lines.join("\n").slice(0, 4000);

            await safeReply(interaction, {
                embeds: [
                    {
                        title: "💼 Salarios configurados",
                        description,
                        color: 0x3498db,
                        footer: {
                            text: `Total de roles con salario: ${incomes.length}`,
                        },
                    },
                ],
            });
        } catch (err) {
            console.error("❌ Error en /incomeall:", err);
            await safeReply(interaction, {
                content: "❌ Ocurrió un error al obtener los salarios.",
                ephemeral: true,
            });
        }
    }
});
