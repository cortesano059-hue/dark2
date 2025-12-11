import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import safeReply from '@src/utils/safeReply';
import ThemedEmbed from '@src/utils/ThemedEmbed';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banear usuario.')
        .addUserOption(o => o.setName('target').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Motivo'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ });

        try {
            const targetUser = interaction.options.getUser('target', true);
            const targetMember = interaction.options.getMember('target');
            
            if (!targetMember || !('ban' in targetMember)) {
                return await safeReply(interaction, {
                    embeds: [ThemedEmbed.error('Usuario no encontrado', '❌ No se pudo encontrar al usuario especificado o no es un miembro del servidor.')]
                });
            }

            await targetMember.ban({ reason: interaction.options.getString('razon') || 'Sin motivo' });

            const embed = ThemedEmbed.success('Usuario Baneado', `✅ ${targetUser.tag} ha sido baneado.`)
                .setFooter({ text: `Acción ejecutada por ${interaction.user.username}` })
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });

        } catch (e: any) {
            console.error('❌ ERROR AL EJECUTAR COMANDO ban:', e);

            const embed = ThemedEmbed.error('Error', '❌ No tengo permisos suficientes o ocurrió un error.')
                .setFooter({ text: `Intentado por ${interaction.user.username}` })
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }
    }
};
