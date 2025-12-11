import { SlashCommandBuilder } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import { Dni } from '@database/mongodb';

const command = {
    data: new SlashCommandBuilder()
        .setName('deldni')
        .setDescription('Borra tu DNI'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            // Intentamos buscar y borrar en un solo paso
            const deleted = await Dni.findOneAndDelete({ userId, guildId });

            if (!deleted) {
                return await safeReply(interaction, { content: '❌ No tienes DNI registrado en este servidor para borrar.' });
            }

            return await safeReply(interaction, { content: '✅ Tu DNI ha sido eliminado correctamente.' });

        } catch (err) {
            console.error('❌ ERROR al eliminar DNI:', err);
            return await safeReply(interaction, { content: '❌ Ocurrió un error al eliminar tu DNI.' });
        }
    }
};

export default command;