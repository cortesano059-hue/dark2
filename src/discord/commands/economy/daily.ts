import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
import { EconomyConfig } from "../../../config/economy.js";
import { logger } from "../../../utils/logger.js";

const { daily: dailyConfig } = EconomyConfig;
const COOLDOWN_TIME = dailyConfig.cooldown;
const MIN_AMOUNT = dailyConfig.min;
const MAX_AMOUNT = dailyConfig.max;

createCommand({
    name: "daily",
    description: "Reclama tu recompensa diaria.",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        await interaction.deferReply({ ephemeral: false });
        try {
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            if (!guildId) return;

            const balance = await eco.getBalance(userId, guildId);
            const lastClaim = balance.dailyClaim || 0;
            const now = Date.now();

            if (now < lastClaim + COOLDOWN_TIME) {
                const remaining = lastClaim + COOLDOWN_TIME - now;
                const hours = Math.floor(remaining / 3600000);
                const minutes = Math.floor((remaining % 3600000) / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);

                await safeReply(interaction, {
                    embeds: [ThemedEmbed.error(
                        '⏳ Cooldown Activo',
                        `Ya reclamaste tu daily. Vuelve en ${hours}h ${minutes}m ${seconds}s.`
                    )]
                });
                return;
            }

            const actions = [
                { text: 'Hoy encontraste un tesoro escondido' },
                { text: 'Recibiste un pago por un trabajo especial' },
                { text: 'Tu inversión diaria dio frutos' },
                { text: 'La suerte estuvo de tu lado hoy' },
                { text: 'Alguien te recompensó por tu ayuda' }
            ];

            const action = actions[Math.floor(Math.random() * actions.length)];
            const amount = Math.floor(Math.random() * (MAX_AMOUNT - MIN_AMOUNT + 1)) + MIN_AMOUNT;

            // --- FIX: Añadir al BANCO directamente ---
            // Using eco.addBank which manages user retrieval and saving too.
            // But wait, the original code used eco.getUser manually explicitly to modify bank directly.
            // eco.addBank is cleaner.

            await eco.addBank(userId, guildId, amount, 'daily');

            await eco.claimDaily(userId, guildId);

            const newBalance = await eco.getBalance(userId, guildId);

            const embed = new ThemedEmbed(interaction)
                .setTitle('🎁 Recompensa Diaria')
                .setColor('#2ecc71')
                .setDescription(`${action.text} y ganaste **$${amount}**.`)
                .addFields(
                    { name: 'Usuario', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Dinero en mano', value: `$${newBalance.money}`, inline: true },
                    { name: 'Dinero en el banco', value: `$${newBalance.bank}`, inline: true }
                );

            await safeReply(interaction, { embeds: [embed] });

        } catch (err: any) {
            console.error('❌ ERROR EN COMANDO daily.ts:', err);
            await safeReply(interaction, {
                embeds: [ThemedEmbed.error('Error', 'No se pudo reclamar la daily.')]
            });
        }
    }
});
