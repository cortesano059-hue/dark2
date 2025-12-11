import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import eco from "@economy";
import ThemedEmbed from "@src/utils/ThemedEmbed";
import safeReply from "@src/utils/safeReply";
import MyClient from "@structures/MyClient.js";

export default {
    data: new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Envía dinero a otro usuario.")
        .addUserOption(option =>
            option.setName("usuario")
                .setDescription("Usuario al que pagar")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("cantidad")
                .setDescription("Cantidad a enviar")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("desde")
                .setDescription("Desde dónde enviar el dinero")
                .addChoices(
                    { name: "Dinero en mano", value: "money" },
                    { name: "Banco", value: "bank" }
                )
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: MyClient): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        const sender = interaction.user;
        const receiver = interaction.options.getUser("usuario")!;
        const amount = interaction.options.getInteger("cantidad")!;
        const method = interaction.options.getString("desde")!;
        const guildId = interaction.guild!.id;

        if (receiver.bot)
            return safeReply(interaction, { content: "❌ No puedes pagar a bots.", ephemeral: true });

        if (receiver.id === sender.id)
            return safeReply(interaction, { content: "❌ No puedes pagarte a ti mismo.", ephemeral: true });

        if (amount <= 0)
            return safeReply(interaction, { content: "❌ La cantidad debe ser mayor a 0.", ephemeral: true });

        const senderBal = await eco.getBalance(sender.id, guildId);

        if (method === "money" && senderBal.money < amount)
            return safeReply(interaction, { content: "❌ No tienes suficiente dinero en mano.", ephemeral: true });

        if (method === "bank" && senderBal.bank < amount)
            return safeReply(interaction, { content: "❌ No tienes suficiente dinero en el banco.", ephemeral: true });

        if (method === "money") {
            await eco.removeMoney(sender.id, guildId, amount, "money");
            await eco.addMoney(receiver.id, guildId, amount, "money");
        } else if (method === "bank") {
            const withdraw = await eco.withdraw(sender.id, guildId, amount);
            if (!withdraw.success)
                return safeReply(interaction, { content: "❌ Error al retirar del banco.", ephemeral: true });

            const receiverData = await eco.getUser(receiver.id, guildId);
            receiverData.bank += amount;
            await receiverData.save();
        }

        const newSender = await eco.getBalance(sender.id, guildId);
        const newReceiver = await eco.getBalance(receiver.id, guildId);

        const embed = new ThemedEmbed(interaction)
            .setTitle("💸 Transferencia Exitosa")
            .setDescription(
                `Has pagado **$${amount.toLocaleString()}** a ${receiver} desde **${method === "money" ? "tu cartera" : "tu banco"}**.\n` +
                `📤 El dinero fue enviado al **${method === "money" ? "dinero en mano" : "banco"}** del receptor.`
            )
            .addFields(
                {
                    name: "Emisor",
                    value: `${sender}`
                },
                {
                    name: "Dinero en mano",
                    value: `$${newSender.money.toLocaleString()}`,
                    inline: true
                },
                {
                    name: "Banco",
                    value: `$${newSender.bank.toLocaleString()}`,
                    inline: true
                },
                {
                    name: "Receptor",
                    value: `${receiver}`
                },
                {
                    name: "Dinero en mano",
                    value: `$${newReceiver.money.toLocaleString()}`,
                    inline: true
                },
                {
                    name: "Banco",
                    value: `$${newReceiver.bank.toLocaleString()}`,
                    inline: true
                }
            );

        return safeReply(interaction, { embeds: [embed], ephemeral: true });
    }
};

