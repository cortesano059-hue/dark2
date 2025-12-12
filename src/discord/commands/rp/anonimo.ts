import { SlashCommandBuilder, ChatInputCommandInteraction, StringSelectMenuOptionBuilder } from 'discord.js';
import safeReply from "@src/utils/safeReply";
import ThemedEmbed from "@src/utils/ThemedEmbed";

export const data = new SlashCommandBuilder()
    .setName('anonimo')
    .setDescription('Envía un mensaje anónimo.')
    .addStringOption((o: any) => o
        .setName('mensaje')
        .setDescription('Contenido')
        .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ });

        try {
            const text = interaction.options.getString('mensaje');

            // Embed anónimo, sin asociar usuario
            const embed = new ThemedEmbed()
                .setTitle('🕵️ Mensaje Anónimo')
                .setColor('#000001')
                .setDescription(text)
                .setFooter({ text: 'Identidad Oculta', iconURL: 'https://cdn-icons-png.flaticon.com/512/4645/4645305.png' })
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            console.error('❌ Error en anonimo.ts:', err);
            await safeReply(interaction, { content: '❌ Ocurrió un error al enviar el mensaje anónimo.' });
        }
}

export default { data, execute };
