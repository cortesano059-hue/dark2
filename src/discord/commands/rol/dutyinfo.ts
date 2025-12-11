import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { DutyStatus, IncomeRole } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

export default {
    data: new SlashCommandBuilder()
        .setName("dutyinfo")
        .setDescription("Muestra qué usuarios están actualmente en servicio."),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        const active = await DutyStatus.find({ guildId });

        if (active.length === 0) {
            return safeReply(interaction, "🟡 No hay nadie en servicio.");
        }

        const embed = new EmbedBuilder()
            .setTitle("👮 Usuarios en servicio")
            .setColor("#3498db")
            .setDescription(
                active
                    .map(duty => {
                        const role = interaction.guild.roles.cache.get(duty.roleId);
                        const mins = Math.floor((Date.now() - duty.startTime) / 60000);
                        return `• <@${duty.userId}> — ${role} — **${mins} min**`;
                    })
                    .join("\n")
            );

        safeReply(interaction, { embeds: [embed] });
    }
};


