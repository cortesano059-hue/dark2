import { createCommand } from "#base";
import {
    ApplicationCommandType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ButtonInteraction
} from "discord.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";

createCommand({
    name: "top",
    description: "Muestra el ranking económico del servidor.",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guildId;
        if (!guildId) return;

        // Función para crear embed según el modo
        async function buildEmbed(mode: "total" | "money" | "bank") {
            const top = await eco.getLeaderboard(guildId as string, mode);

            const titles = {
                total: "🏆 Top Economía — Total (Cartera + Banco)",
                money: "🪙 Top Economía — Solo Cartera",
                bank: "🏦 Top Economía — Solo Banco"
            };

            let description = "";

            for (let i = 0; i < top.length; i++) {
                const user = top[i];
                const rank = i + 1;

                let value = 0;
                if (mode === "total") value = user.total; // total is aggregated field
                if (mode === "money") value = user.money;
                if (mode === "bank") value = user.bank;

                description += `${rank}. <@${user.userId}> — **$${(value || 0).toLocaleString()}**\n`;
            }

            const embed = new ThemedEmbed(interaction)
                .setTitle(titles[mode])
                .setColor("#f1c40f")
                .setDescription(description || "No hay suficientes datos.");

            return embed;
        }

        // Botones
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("top_total")
                .setLabel("💰 Total")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("top_money")
                .setLabel("🪙 Cartera")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("top_bank")
                .setLabel("🏦 Banco")
                .setStyle(ButtonStyle.Secondary),
        );

        // Enviar primer embed
        const embed = await buildEmbed("total");
        const reply = await interaction.editReply({ embeds: [embed], components: [row] });

        // Collector
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000
        });

        collector.on("collect", async (btn: ButtonInteraction) => {
            if (btn.user.id !== interaction.user.id) {
                await btn.reply({ content: "Solo quien ejecutó el comando puede usar esto.", ephemeral: true });
                return;
            }

            let mode: "total" | "money" | "bank" = "total";
            if (btn.customId === "top_money") mode = "money";
            if (btn.customId === "top_bank") mode = "bank";

            const newEmbed = await buildEmbed(mode);

            const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("top_total")
                    .setLabel("💰 Total")
                    .setStyle(mode === "total" ? ButtonStyle.Success : ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("top_money")
                    .setLabel("🪙 Cartera")
                    .setStyle(mode === "money" ? ButtonStyle.Success : ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("top_bank")
                    .setLabel("🏦 Banco")
                    .setStyle(mode === "bank" ? ButtonStyle.Success : ButtonStyle.Secondary),
            );

            await btn.update({ embeds: [newEmbed], components: [updatedRow] });
        });

        collector.on("end", async () => {
            try {
                await interaction.editReply({ components: [] });
            } catch { }
        });
    }
});
