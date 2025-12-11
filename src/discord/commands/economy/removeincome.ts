import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { IncomeRole } from '@src/database/mongodb';
import safeReply from '@src/utils/safeReply';

const command = {
    data: new SlashCommandBuilder()
        .setName("removeincome")
        .setDescription("Elimina el sueldo asignado a un rol.")
        .addRoleOption(opt =>
            opt.setName("rol")
                .setDescription("Rol al que deseas quitar el sueldo.")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const role = interaction.options.getRole("rol");

        const removed = await IncomeRole.findOneAndDelete({ guildId, roleId: role.id });

        if (!removed) {
            return safeReply(interaction, "❌ Ese rol no tenía un sueldo configurado.");
        }

        safeReply(interaction, `🗑️ Se eliminó el sueldo del rol **${role.name}**.`);
    }
};

export default command;
