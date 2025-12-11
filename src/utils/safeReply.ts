// src/utils/safeReply.ts

import {
    CommandInteraction,
    InteractionReplyOptions,
    InteractionResponse,
    Message,
    MessageFlags
} from 'discord.js';

type SafeReplyPayload = string | (InteractionReplyOptions & { ephemeral?: boolean });

export default async function safeReply(
    interaction: CommandInteraction | any, 
    payload: SafeReplyPayload,
): Promise<void | Message | InteractionResponse> {
    if (!payload) return;

    let data: InteractionReplyOptions & { ephemeral?: boolean };
    
    if (typeof payload === 'string') {
        data = { content: payload, ephemeral: true };
    } else {
        data = { ...payload };
        if (data.ephemeral === undefined) data.ephemeral = true;
    }

    // FIX: Lógica de Flags sin usar MessageFlags.resolve (Soluciona Error 2339)
    if (data.ephemeral) {
        let currentFlags: number = 0;
        
        if (data.flags) {
            // Convertimos la BitFieldResolvable a number directamente.
            // Esto es compatible con Discord.js y evita el error de tipado.
            currentFlags = Number(data.flags); 
        }

        // Combinamos los flags existentes con MessageFlags.Ephemeral
        data.flags = currentFlags | MessageFlags.Ephemeral; 
        delete data.ephemeral; 
    } else if (data.ephemeral === false) {
        delete data.ephemeral;
    }

    try {
        if (!interaction) {
            console.error('❌ safeReply: Interacción nula');
            return;
        }
        
        const replyOptions: InteractionReplyOptions = data;

        if (interaction.replied) {
            return await interaction.followUp(replyOptions);
        }

        if (interaction.deferred) {
            return await interaction.editReply(replyOptions);
        }

        return await interaction.reply(replyOptions);

    } catch (err) {
        if (err instanceof Error && ('code' in err) && (err.code !== 10062 && err.code !== 40060)) {
            console.error('⚠️ Error en safeReply:', (err as Error).message);
        }
    }
}