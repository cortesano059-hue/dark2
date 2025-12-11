import { InteractionReplyOptions, MessageFlags, RepliableInteraction } from 'discord.js';

type SafeReplyPayload = string | InteractionReplyOptions;

export default async function safeReply(
  interaction: RepliableInteraction,
  payload: SafeReplyPayload,
  ephemeralOverride?: boolean
): Promise<any> {
    if (!payload) return;

    let data: InteractionReplyOptions;
    if (typeof payload === 'string') {
        data = { content: payload, ephemeral: ephemeralOverride ?? true };
    } else {
        data = { ...payload };
        if (ephemeralOverride !== undefined) {
            data.ephemeral = ephemeralOverride;
        } else if (data.ephemeral === undefined) {
            data.ephemeral = true;
        }
    }

    if (data.ephemeral && !data.flags) {
        data.flags = MessageFlags.Ephemeral;
    }

    try {
        if (!interaction) return console.error('❌ safeReply: Interacción nula');

        if (interaction.replied) {
            return await interaction.followUp(data as any);
        }

        if (interaction.deferred) {
            return await interaction.editReply(data as any);
        }

        return await interaction.reply(data as any);

    } catch (err: any) {
        if (err.code !== 10062 && err.code !== 40060) {
            console.error('⚠️ Error en safeReply:', err.message);
        }
    }
}

