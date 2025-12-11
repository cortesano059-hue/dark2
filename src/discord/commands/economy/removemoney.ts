import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import ThemedEmbed from '@src/utils/ThemedEmbed';
import eco from '@economy';
import safeReply from '@src/utils/safeReply';

export default {
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Quitar dinero a un usuario (Admin).')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ });

        try {
            const targetUser = interaction.options.getUser('usuario', true);

            if (!targetUser) {
                return await safeReply(interaction, { embeds: [ThemedEmbed.error('Error', 'Usuario no encontrado.')] });
            }

            const amount = interaction.options.getInteger('cantidad', true);
            if (amount <= 0) {
                return await safeReply(interaction, { embeds: [ThemedEmbed.error('Error', 'Cantidad inválida.')] });
            }

            // Retirar dinero
            await eco.removeMoney(targetUser.id, interaction.guild!.id, amount);

            // Obtener balance actualizado
            const balance = await eco.getBalance(targetUser.id, interaction.guild!.id);

            const embed = new ThemedEmbed(interaction)
                .setTitle('💸 Dinero Retirado')
                .setColor('#e74c3c')
                .setDescription(`Se han quitado **$${amount}** a **${targetUser.tag}**.\n` +
                                `💰 Balance actualizado: **$${balance.money}** (Banco: **${balance.bank}**)`);

            return await safeReply(interaction, { embeds: [embed] });

        } catch (err) {
            console.error('❌ ERROR al ejecutar removemoney:', err);
            return await safeReply(interaction, { embeds: [ThemedEmbed.error('Error', 'No se pudo retirar el dinero.')] });
        }
    }
};
