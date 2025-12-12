import { SlashCommandBuilder } from 'discord.js';
import eco from '@economy';
import safeReply from '@src/utils/safeReply';
import ThemedEmbed from '@src/utils/ThemedEmbed';

const command = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Muestra tu perfil económico o el de otro usuario.")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuario del que ver el perfil")
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser("usuario") || interaction.user;
        const guildId = interaction.guild.id;

        const balance = await eco.getBalance(user.id, guildId);

        if (!balance)
            return safeReply(interaction, "❌ No se pudo obtener el perfil.");

        // Valores seguros
        const money = balance.money ?? 0;
        const bank = balance.bank ?? 0;

        const dailyCooldown = balance.dailyClaim || 0;
        const workCooldown = balance.workCooldown || 0;

        const embed = new ThemedEmbed(interaction)
            .setTitle(`📘 Perfil de ${user.username}`)
            .setDescription(`Información económica del usuario`)
            .addFields(
                {
                    name: "💵 Dinero en mano",
                    value: `$${money.toLocaleString()}`,
                    inline: true
                },
                {
                    name: "🏦 Banco",
                    value: `$${bank.toLocaleString()}`,
                    inline: true
                },
                {
                    name: "⏳ Cooldowns",
                    value:
                        `**Daily:** ${dailyCooldown === 0 ? "Disponible" : `<t:${Math.floor(dailyCooldown / 1000)}:R>`}\n` +
                        `**Work:** ${workCooldown === 0 ? "Disponible" : `<t:${Math.floor(workCooldown / 1000)}:R>`}`
                }
            );

        return safeReply(interaction, { embeds: [embed] });
    }
};

export default command;
