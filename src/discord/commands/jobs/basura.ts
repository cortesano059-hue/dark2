import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import safeReply from "@src/utils/safeReply";
import ThemedEmbed from "@src/utils/ThemedEmbed";
import eco from "@economy";
import logger from "@src/utils/logger";
import ms from "ms";

const BROKEN_BOTTLE = "Botella rota";
const COOLDOWN = 15000; // 15 segundos

export const data = new SlashCommandBuilder()
    .setName("basura")
    .setDescription("Buscar en la basura.");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const now = Date.now();

        const balance = await eco.getBalance(userId, guildId);
        const cooldownEnd = Number(balance.trashCooldown) || 0;

        if (cooldownEnd > now) {
            const remaining = Math.max(cooldownEnd - now, 1);
            const formatted = ms(remaining, { long: true });

            return safeReply(interaction, {
                content: `⏱️ Debes esperar ${formatted} antes de buscar otra vez.`
            });
        }

        await interaction.deferReply();
        await eco.setTrashCooldown(userId, guildId, now + COOLDOWN);

        try {
            const roll = Math.random();

            // --- BOTELLA ROTA ---
            if (roll < 0.05) {
                let bottle = await eco.getItemByName(guildId, BROKEN_BOTTLE);
                if (!bottle) {
                    bottle = await eco.createItem(
                        guildId,
                        BROKEN_BOTTLE,
                        1000,
                        "Una botella rota. Cuidado con los cortes.",
                        "🍾",
                        { type: "trash", data: { broken: true } }
                    );
                }

                await eco.addToInventory(userId, guildId, bottle._id, 1);

                return safeReply(interaction, {
                    embeds: [
                        new ThemedEmbed(interaction)
                            .setTitle("🩸 ¡Te has cortado!")
                            .setDescription(
                                `Encontraste una **botella rota** y te hiciste daño.\n\n` +
                                `La botella fue añadida a tu inventario.`
                            )
                            .setColor("#c0392b")
                    ]
                });
            }

            // --- NADA ---
            if (roll < 0.35) {
                logger.info(`${interaction.user.tag} no encontró nada`, "Basura");

                return safeReply(interaction, {
                    embeds: [
                        new ThemedEmbed(interaction)
                            .setDescription("🗑️ No encontraste nada útil esta vez.")
                            .setColor("#7f8c8d")
                    ]
                });
            }

            // --- RECOMPENSAS ---
            const lootTable = [
                { name: "Botellas", min: 10, max: 50 },
                { name: "Monedas antiguas", min: 20, max: 120 },
                { name: "Chatarra valiosa", min: 50, max: 200 },
                { name: "Latas", min: 5, max: 25 },
                { name: "Tapones", min: 3, max: 15 },
                { name: "Restos de metal", min: 20, max: 80 }
            ];

            const loot = lootTable[Math.floor(Math.random() * lootTable.length)];
            const reward =
                Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;

            await eco.addMoney(userId, guildId, reward, "basura");

            return safeReply(interaction, {
                embeds: [
                    ThemedEmbed.success(
                        "Búsqueda Terminada",
                        `Encontraste **${loot.name}** y ganaste **$${reward}**.`
                    )
                ]
            });

        } catch (err) {
            logger.error(`Error ejecutando /basura: ${err}`, "Basura");

            return safeReply(interaction, {
                content: "❌ Ocurrió un error al ejecutar el comando."
            });
        }
}

export default { data, execute };
