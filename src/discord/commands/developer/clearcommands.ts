import { SlashCommandBuilder, REST, Routes, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import { env } from '#env';

const command = {
    data: new SlashCommandBuilder()
        .setName("clearcommands")
        .setDescription("Elimina todos los comandos globales (Owner Only)."),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        // OWNER CHECK
        if (interaction.user.id !== env.OWNER_ID) {
            return safeReply(interaction, "❌ Solo el owner del bot puede usar este comando.");
        }

        await interaction.deferReply({ ephemeral: true });

        const client = interaction.client;
        const rest = new REST({ version: "10" }).setToken(env.BOT_TOKEN);

        try {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: [] } // VACÍA TODOS LOS COMANDOS
            );

            const embed = new EmbedBuilder()
                .setTitle("🗑️ Comandos eliminados")
                .setDescription("Todos los comandos globales han sido borrados.")
                .setColor("Red");

            return safeReply(interaction, { embeds: [embed] });

        } catch (err) {
            console.error("❌ Error en clearcommands:", err);
            return safeReply(interaction, "❌ No se pudo eliminar los comandos.");
        }
    }
};

export default command;
