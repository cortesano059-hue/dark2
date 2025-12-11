// src/discord/commands/info/ping.ts

import {
    ChatInputCommandInteraction,
    Client, // Tipos necesarios para el retorno de safeReply
    InteractionResponse,
    Message,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

import safeReply from '../../../utils/safeReply.js';
import ThemedEmbed from '../../../utils/ThemedEmbed.js';

// FIX: Corregido el tipo de retorno de execute para incluir Message | InteractionResponse | void
interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder; 
    execute: (
        interaction: ChatInputCommandInteraction, 
        client: Client
    ) => Promise<void | Message | InteractionResponse>;
}

const PingCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra la latencia del bot y el tiempo en línea.'),

    async execute(interaction, client) {
        const startTimestamp = Date.now();
        // Ponemos ephemeral: false para que el bot edite su respuesta visible
        await interaction.deferReply({ ephemeral: false }); 

        // 1. Latencia de la API de Discord (WebSocket Ping)
        const apiPing: number = Math.abs(client.ws.ping); 

        // 2. Uptime del bot
        const uptime: number = client.uptime || 0;
        const totalSeconds = Math.floor(uptime / 1000);
        const days = Math.floor(totalSeconds / (60 * 60 * 24));
        const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;


        // 3. Latencia del Bot
        const botLatency: number = Date.now() - startTimestamp;

        // 4. Embed Final
        const embed = new ThemedEmbed()
            .setThumbnail(client.user?.displayAvatarURL({ forceStatic: false, size: 64 }) || null)
            .addFields([
                { name: 'Ping de la API (WS)', value: `> \`${apiPing}ms\``, inline: true },
                { name: 'Latencia del Bot', value: `> \`${botLatency}ms\``, inline: true }, 
                { name: 'Tiempo en Línea', value: `> \`${uptimeString}\``, inline: true },
            ])
            .setFooter({ text: 'Estos tiempos de respuesta son aproximados' });

        return await safeReply(interaction, { embeds: [embed], ephemeral: false });
    },
};

export default PingCommand;