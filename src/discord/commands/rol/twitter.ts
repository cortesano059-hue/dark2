import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import ThemedEmbed from '@src/utils/ThemedEmbed';

const command = {
    data: new SlashCommandBuilder()
        .setName('twitter')
        .setDescription('Publicar un tweet.')
        .addStringOption(o => o.setName('mensaje').setDescription('Texto').setRequired(true))
        .addAttachmentOption(o => o.setName('imagen').setDescription('Imagen opcional')),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const text = interaction.options.getString('mensaje');
            const img = interaction.options.getAttachment('imagen');

            const embed = new ThemedEmbed(interaction)
                .setAuthor({ name: `@${interaction.user.username}`, iconURL: 'https://cdn-icons-png.flaticon.com/512/733/733579.png' })
                .setTitle('🐦 Nuevo Tweet')
                .setDescription(text)
                .setColor('#1DA1F2')
                .setFooter({ text: 'Twitter for Discord', iconURL: interaction.user.displayAvatarURL() });

            if (img) embed.setImage(img.url);

            await safeReply(interaction, { embeds: [embed] }, false);
        } catch (err) {
            console.error('❌ ERROR en twitter.js:', err);
            await safeReply(interaction, { content: '❌ Ocurrió un error al publicar el tweet.' });
        }
    }
};

export default command;
