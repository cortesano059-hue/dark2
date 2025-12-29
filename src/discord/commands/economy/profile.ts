import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";

createCommand({
    name: "profile",
    description: "Muestra tu perfil económico o el de otro usuario.",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "usuario",
            description: "Usuario del que ver el perfil",
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    async run(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser("usuario") || interaction.user;
        const guildId = interaction.guildId;
        if (!guildId) return;

        const balance = await eco.getBalance(user.id, guildId);

        if (!balance) {
            await safeReply(interaction, "❌ No se pudo obtener el perfil.");
            return;
        }

        // Valores seguros
        const money = balance.money ?? 0;
        const bank = balance.bank ?? 0;
        const dailyCooldown = Number(balance.dailyClaim) || 0;
        const workCooldown = Number(balance.workCooldown) || 0;

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

        await safeReply(interaction, { embeds: [embed] });
    }
});
