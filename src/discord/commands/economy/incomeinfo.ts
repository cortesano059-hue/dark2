import { createCommand } from "#base";
import { GuildConfig } from "#database";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";

createCommand({
    name: "incomeinfo",
    description: "Muestra el salario configurado de un rol.",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "rol",
            description: "Rol a consultar",
            type: ApplicationCommandOptionType.Role,
            required: true
        }
    ],
    async run(interaction) {
        const guildId = interaction.guildId;
        const role = interaction.options.getRole("rol");

        if (!role || !guildId) return;

        const config = await GuildConfig.findOne({ guildId }).lean();
        const info = config?.incomeRoles?.find(r => r.roleId === role.id);

        if (!info) {
            await safeReply(interaction, `❌ El rol **${role.name}** no tiene salario configurado.`);
            return;
        }

        await safeReply(interaction, {
            embeds: [
                {
                    title: "📄 Información salarial",
                    description:
                        `El rol **${role.name}** cobra **$${info.incomePerHour.toLocaleString()}/hora**.`,
                    color: 0xf1c40f,
                }
            ]
        });
    }
});
