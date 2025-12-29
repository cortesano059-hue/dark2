import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { getMariConfig, sellMari } from "../../../economy/index.js";

createCommand({
    name: "vendermari",
    description: "Vende marihuana (requiere rol ilegal y item configurado).",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        if (!interaction.guildId || !interaction.member) return;
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        const cfg = await getMariConfig(guildId);
        if (!cfg) {
            await safeReply(interaction, {
                content: "❌ No se ha configurado la venta de marihuana. Usa `/config mari`.",
                ephemeral: true
            });
            return;
        }

        const { roleId } = cfg;
        // @ts-ignore
        if (roleId && !interaction.member.roles.cache.has(roleId)) {
            await safeReply(interaction, {
                content: `❌ No tienes el rol ilegal requerido para vender. Debes tener: <@&${roleId}>`,
                ephemeral: true
            });
            return;
        }

        const result = await sellMari(userId, guildId);

        if (!result.success) {
            await safeReply(interaction, {
                content: `❌ ${result.message || "No se pudo completar la venta."}`,
                ephemeral: true
            });
            return;
        }

        // @ts-ignore
        const { consume, priceUnit, earn, itemName } = result;

        const embed = new ThemedEmbed()
            .setTitle("🌿 Venta realizada con éxito")
            .setColor("#2ecc71")
            .setThumbnail(interaction.user.displayAvatarURL())
            .setDescription(`Has vendido **${itemName}** en el mercado ilegal.`)
            .addFields(
                { name: "📦 Cantidad consumida", value: `${consume} unidades`, inline: true },
                { name: "💰 Precio por unidad", value: `${priceUnit}$`, inline: true },
                { name: "🤑 Ganancia total", value: `**${earn.toLocaleString()}$**`, inline: false }
            )
            .setFooter({ text: "Mercado ilegal | DarkRP" })
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed], ephemeral: true });
    }
});
