import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import ThemedEmbed from '@src/utils/ThemedEmbed';

export default {
    data: new SlashCommandBuilder()
        .setName('getids')
        .setDescription('Obtener IDs de usuario/servidor.'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ });

        try {
            const embed = new ThemedEmbed(interaction)
                .setTitle('🆔 Información de IDs')
                .addFields(
                    { name: 'Tu ID', value: `\`${interaction.user.id}\``, inline: true },
                    { name: 'ID del Servidor', value: `\`${interaction.guild!.id}\``, inline: true },
                    { name: 'ID del Canal', value: `\`${interaction.channel!.id}\``, inline: true }
                );

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            console.error('❌ ERROR AL EJECUTAR COMANDO getids:', err);
            await safeReply(interaction, { content: '❌ Ocurrió un error al obtener los IDs.' });
        }
    }
};
