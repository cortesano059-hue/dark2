import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import eco from "@economy";
import safeReply from "@src/utils/safeReply";
import MyClient from "@structures/MyClient.js";

export default {
    data: new SlashCommandBuilder()
        .setName("deposit")
        .setDescription("Deposita dinero en el banco.")
        .addStringOption(option =>
            option.setName("cantidad")
                .setDescription("Cantidad o 'all'")
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: MyClient): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild!.id;
        const userId = interaction.user.id;

        const raw = interaction.options.getString("cantidad")!;

        const bal = await eco.getBalance(userId, guildId);
        if (!bal)
            return safeReply(interaction, "❌ No se pudo obtener tu balance.");

        let amount: number;

        if (raw.toLowerCase() === "all") {
            if (bal.money <= 0)
                return safeReply(interaction, "❌ No tienes dinero en mano.");

            amount = bal.money;
        } else {
            amount = Number(raw);
            if (isNaN(amount) || amount <= 0)
                return safeReply(interaction, "❌ Ingresa una cantidad válida.");
        }

        const result = await eco.deposit(userId, guildId, amount);

        if (!result.success)
            return safeReply(interaction, "❌ No tienes suficiente dinero en mano.");

        const newBal = await eco.getBalance(userId, guildId);

        return safeReply(interaction, {
            content:
                `🏦 Has depositado **$${amount.toLocaleString()}**.\n` +
                `💵 Ahora tienes **$${newBal.money.toLocaleString()}** en mano.\n` +
                `🏛️ Banco: **$${newBal.bank.toLocaleString()}**`
        });
    }
};

