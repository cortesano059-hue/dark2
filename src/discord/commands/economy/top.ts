import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { User } from "@database/mongodb";
import ThemedEmbed from "@src/utils/ThemedEmbed";
import safeReply from "@src/utils/safeReply";

const command = {
    data: new SlashCommandBuilder()
        .setName("top")
        .setDescription("Muestra el ranking económico del servidor."),

    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;

        // Función para obtener el top según el modo seleccionado
        async function getTop(mode) {
            if (mode === "total") {
                return await User.aggregate([
                    { $match: { guildId } },
                    { $addFields: { total: { $add: ["$money", "$bank"] } } },
                    { $sort: { total: -1 } },
                    { $limit: 10 }
                ]);
            }

            if (mode === "money") {
                return await User.find({ guildId }).sort({ money: -1 }).limit(10);
            }

            if (mode === "bank") {
                return await User.find({ guildId }).sort({ bank: -1 }).limit(10);
            }
        }

        // Función para crear embed según el modo
        async function buildEmbed(mode) {
            const top = await getTop(mode);

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
                if (mode === "total") value = user.total;
                if (mode === "money") value = user.money;
                if (mode === "bank") value = user.bank;

                description += `${rank}. <@${user.userId}> — **$${value.toLocaleString()}**\n`;
            }

            const embed = new ThemedEmbed(interaction)
                .setTitle(titles[mode])
                .setColor("#f1c40f")
                .setDescription(description || "No hay suficientes datos.");

            return embed;
        }

        // Botones
        const row = new ActionRowBuilder().addComponents(
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

        collector.on("collect", async (btn) => {
            if (btn.user.id !== interaction.user.id)
                return btn.reply({ content: "Solo quien ejecutó el comando puede usar esto.", ephemeral: true });

            let mode = "total";
            if (btn.customId === "top_money") mode = "money";
            if (btn.customId === "top_bank") mode = "bank";

            const newEmbed = await buildEmbed(mode);

            const updatedRow = new ActionRowBuilder().addComponents(
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
            } catch {}
        });
    }
};

export default command;
