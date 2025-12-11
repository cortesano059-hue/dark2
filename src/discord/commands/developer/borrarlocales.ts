import { SlashCommandBuilder, PermissionFlagsBits, REST, Routes, ChatInputCommandInteraction } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import ThemedEmbed from '@src/utils/ThemedEmbed';
import { env } from '#env';

export default {
    data: new SlashCommandBuilder()
        .setName('borrarlocales')
        .setDescription('Elimina TODOS los comandos registrados solo en este servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        // Seguridad extra: solo el owner puede borrar
        if (interaction.user.id !== env.OWNER_ID) {
            return await safeReply(interaction, { 
                embeds: [ThemedEmbed.error('Acceso Denegado', '❌ Solo el dueño del bot puede usar esto.')] 
            });
        }

        await interaction.deferReply({ });

        try {
            const rest = new REST({ version: '10' }).setToken(env.BOT_TOKEN);

            // Borra todos los comandos locales del servidor
            await rest.put(
                Routes.applicationGuildCommands(env.CLIENT_ID, interaction.guild!.id),
                { body: [] });

            const embed = new ThemedEmbed(interaction)
                .setTitle('✅ Comandos Locales Eliminados')
                .setDescription('Se han eliminado correctamente todos los comandos locales de este servidor.\nAhora solo deberían verse los comandos globales.')
                .setColor('Green')
                .setFooter({ text: `Ejecutado por ${interaction.user.username}` })
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });

        } catch (error: any) {
            console.error('❌ ERROR AL EJECUTAR BORRAR LOCALES:', error);
            await safeReply(interaction, { 
                embeds: [ThemedEmbed.error('Error Crítico', `❌ ${error.message}`)] 
            });
        }
    },
};
