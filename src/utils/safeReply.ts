import { InteractionReplyOptions, MessageFlags, MessagePayload, RepliableInteraction } from 'discord.js';

/**
 * safeReply: Envía respuestas de forma inteligente (reply, editReply o followUp).
 * Corrige el problema del "Bot está pensando".
 */
export async function safeReply(interaction: RepliableInteraction, payload: string | InteractionReplyOptions | MessagePayload) {
    if (!payload) return;

    // 1. Normalizar la entrada (permite pasar solo un string)
    let data: any;
    if (typeof payload === 'string') {
        data = { content: payload, ephemeral: true };
    } else {
        // Copiamos para no mutar el original
        data = { ...payload };
        // Si no se especifica ephemeral, por defecto true (seguridad), 
        // pero si ya se hizo deferReply, esto se ignorará en favor de lo que se puso en el defer.
        if (data.ephemeral === undefined) data.ephemeral = true;
    }

    // Aseguramos flags correctos si es efímero
    if (data.ephemeral && !data.flags) {
        data.flags = MessageFlags.Ephemeral;
    }

    try {
        // 2. Lógica de Respuesta Correcta
        if (!interaction) {
            console.error('❌ safeReply: Interacción nula');
            return;
        }

        // CASO A: Ya se respondió completamente (reply o editReply exitoso) -> Usamos followUp para un mensaje NUEVO
        if (interaction.replied) {
            return await interaction.followUp(data);
        }

        // CASO B: Se pausó (deferReply) pero no se ha editado aún -> Usamos editReply para QUITAR el "Pensando..."
        if (interaction.deferred) {
            return await interaction.editReply(data);
        }

        // CASO C: Interacción virgen -> Usamos reply normal
        return await interaction.reply(data);

    } catch (err: any) {
        if (err.code !== 10062 && err.code !== 40060) {
            console.error('⚠️ Error en safeReply:', err.message);
            if (err.errors) console.error('🔍 Detalle errores:', JSON.stringify(err.errors, null, 2));
            // Opcional: console.log('📦 Payload:', JSON.stringify(data, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
        }
    }
}
