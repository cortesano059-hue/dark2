import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { getMiningConfig } from "../../../economy/index.js";
import { MINING_CONFIG, formatTime } from "../../../economy/miningRules.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";

createCommand({
    name: "minar-info",
    description: "Muestra información sobre minerales, precios y requisitos.",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        if (!interaction.guildId) return;
        const guildId = interaction.guildId;

        const config = await getMiningConfig(guildId);

        // Build mineral list
        const mineralList = Object.entries(MINING_CONFIG.minerals)
            // @ts-ignore
            .map(([name, data]) => `• **${name.charAt(0).toUpperCase() + name.slice(1)}**: ${data.price}$ (${(data.chance * 100).toFixed(1)}%)`)
            .join("\n");

        // Build rarity list
        const rarityList = Object.entries(MINING_CONFIG.rarities)
            // @ts-ignore
            .map(([name, data]) => `• **${name.toUpperCase()}**: x${data.multiplier} (${(data.chance * 100).toFixed(0)}%)`)
            .join("\n");

        let requirements = "Ninguno";
        if (config?.requireType === "role") {
            requirements = `Rol: <@&${config.requireId}>`;
        } else if (config?.requireType === "item" && config.requireId) {
            requirements = `Item requerido (ID: ${config.requireId})`;
        }

        const embed = new ThemedEmbed()
            .setTitle("ℹ️ Información de Minería")
            .setDescription("Aquí tienes los detalles sobre la profesión de minero.")
            .addFields(
                { name: "📋 Requisitos", value: requirements, inline: true },
                { name: "⏱️ Cooldown", value: formatTime(MINING_CONFIG.cooldown), inline: true },
                { name: "💎 Minerales", value: mineralList || "No hay minerales definidos.", inline: false },
                { name: "✨ Rarezas", value: rarityList || "N/A", inline: false }
            )
            .setColor("Blue");

        await safeReply(interaction, { embeds: [embed], ephemeral: true });
    }
});
