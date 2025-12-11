import { SlashCommandBuilder } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import ThemedEmbed from '@src/utils/ThemedEmbed';

export default {
    data: new SlashCommandBuilder()
        .setName('do')
        .setDescription('Do.')
        .addStringOption(o => o
            .setName('texto')
            .setDescription('Describe lo que sucede')
            .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ });

        try {
            const text = interaction.options.getString('texto');

            const embed = new ThemedEmbed(interaction)
                .setTitle('🎭 DO')
                .setColor('#3498DB')
                .setDescription(text)
                .setFooter({ text: `— ${interaction.user.username}` });

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            console.error('❌ Error en do.js:', err);
            await safeReply(interaction, { content: '❌ Ocurrió un error al ejecutar este comando.' });
        }
    }
};


