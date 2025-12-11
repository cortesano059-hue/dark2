import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import mongoose from "mongoose";
import safeReply from "@src/utils/safeReply";
import Embed from "@src/utils/ThemedEmbed";
import MyClient from "@structures/MyClient.js";

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra la latencia del bot y la base de datos.'),

    async execute(interaction: ChatInputCommandInteraction, client: MyClient): Promise<void> {
        await interaction.deferReply();

        const start = Date.now();
        let dbLatency = "Desconectada";

        try {
            await mongoose.connection.db.admin().ping();
            dbLatency = `${Date.now() - start}ms`;
        } catch (err) {
            console.error('❌ Error al hacer ping a MongoDB:', err);
            dbLatency = "Error";
        }

        const uptime = client.uptime;
        const uptimeString = `${Math.floor(uptime / 86400000)}d ${Math.floor((uptime % 86400000) / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m ${Math.floor((uptime % 60000) / 1000)}s`;

        const embed = new Embed(interaction)
            .setThumbnail(client.user!.displayAvatarURL({ forceStatic: false, size: 64 }))
            .addFields([
                { name: 'Ping del Bot', value: `> \`${Math.abs(client.ws.ping)}ms\``, inline: true },
                { name: 'Ping de la DB', value: `> \`${dbLatency}\``, inline: true },
                { name: 'Tiempo en Línea', value: `> \`${uptimeString}\``, inline: true },
            ])
            .setFooter({ text: 'Estos tiempos de respuesta son aproximados' });

        return await safeReply(interaction, { embeds: [embed] });
    },
};

