// src/commands/entorno.js
import { SlashCommandBuilder } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import ThemedEmbed from '@src/utils/ThemedEmbed';
import eco from '@economy';

export default {
    data: new SlashCommandBuilder()
        .setName('entorno')
        .setDescription('Envía un mensaje de entorno global.')
        .addStringOption(o => o
            .setName('mensaje')
            .setDescription('Lo que sucede')
            .setRequired(true))
        .addStringOption(o => o
            .setName('ubicacion')
            .setDescription('Ubicación del evento')
            .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const text = interaction.options.getString('mensaje');
            const ubicacion = interaction.options.getString('ubicacion') || 'Desconocida';

            // Obtener rol policía
            const policeRoleId = await eco.getPoliceRole(interaction.guild.id);
            const policePing = policeRoleId ? `<@&${policeRoleId}>` : null;

            const embed = new ThemedEmbed(interaction)
                .setTitle('📢 LLAMADA DE ENTORNO')
                .setColor('#F1C40F')
                .setDescription(text)
                .addFields({
                    name: '📍 Ubicación',
                    value: ubicacion,
                    inline: true
                });

            const content = policePing
                ? `${policePing} 🚨 Nueva llamada de entorno`
                : `🚨 Nueva llamada de entorno`;

            return safeReply(interaction, { content, embeds: [embed], allowedMentions: { roles: [policeRoleId] } });

        } catch (err) {
            console.error('❌ Error en entorno.js:', err);
            return safeReply(interaction, { content: '❌ Ocurrió un error al enviar el mensaje de entorno.' });
        }
    }
};


