import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import safeReply from "@src/utils/safeReply";
import ThemedEmbed from "@src/utils/ThemedEmbed";

const command = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Realiza una acción.')
        .addStringOption((o: any) => o
            .setName('accion')
            .setDescription('Texto')
            .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ });

        try {
            const text = interaction.options.getString('texto');

            const embed = new ThemedEmbed(interaction)
                .setTitle('🎭 Me')
                .setColor('#9B59B6')
                .setDescription(`${text}`);

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            console.error('Error en me.ts:', err);
            await safeReply(interaction, { content: 'Error al ejecutar el comando.' });
        }
    }
};

export default command;
