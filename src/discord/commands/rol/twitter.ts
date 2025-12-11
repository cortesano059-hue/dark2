// src/discord/commands/rol/twitter.ts

import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
// FIX: Eliminada la extensión .js en las importaciones
import safeReply from '../../../utils/safeReply.js';
import ThemedEmbed from '../../../utils/ThemedEmbed.js';

// Define la estructura del comando
interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder; 
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const TwitterCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('twitter')
        .setDescription('Publicar un tweet.')
        .addStringOption(o => 
            o.setName('mensaje').setDescription('Texto').setRequired(true)
        )
        .addAttachmentOption(o => 
            o.setName('imagen').setDescription('Imagen opcional')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false }); 

        try {
            const text = interaction.options.getString('mensaje', true);
            const img = interaction.options.getAttachment('imagen');

            const embed = new ThemedEmbed()
                .setAuthor({ name: `@${interaction.user.username}`, iconURL: 'https://cdn-icons-png.flaticon.com/512/733/733579.png' })
                .setTitle('🐦 Nuevo Tweet')
                .setDescription(text)
                .setColor('#1DA1F2')
                .setFooter({ text: 'Twitter for Discord', iconURL: interaction.user.displayAvatarURL() });

            if (img) {
                embed.setImage(img.url);
            }

            await safeReply(interaction, { embeds: [embed], ephemeral: false });
            
        } catch (err) {
            console.error('❌ ERROR en twitter.ts:', err);
            await safeReply(interaction, { content: '❌ Ocurrió un error al publicar el tweet.', ephemeral: true });
        }
    }
};

export default TwitterCommand;