import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";

createCommand({
    name: "pay",
    description: "Envía dinero a otro usuario.",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "usuario",
            description: "Usuario al que pagar",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "cantidad",
            description: "Cantidad a enviar",
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: "desde",
            description: "Desde dónde enviar el dinero",
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "Dinero en mano", value: "money" },
                { name: "Banco", value: "bank" }
            ],
            required: true
        }
    ],
    async run(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sender = interaction.user;
        const receiver = interaction.options.getUser("usuario");
        const amount = interaction.options.getInteger("cantidad");
        const method = interaction.options.getString("desde");
        const guildId = interaction.guildId;

        if (!receiver || !guildId || !method || !amount) return;

        if (receiver.bot) {
            await safeReply(interaction, { content: "❌ No puedes pagar a bots.", ephemeral: true });
            return;
        }

        if (receiver.id === sender.id) {
            await safeReply(interaction, { content: "❌ No puedes pagarte a ti mismo.", ephemeral: true });
            return;
        }

        if (amount <= 0) {
            await safeReply(interaction, { content: "❌ La cantidad debe ser mayor a 0.", ephemeral: true });
            return;
        }

        const senderBal = await eco.getBalance(sender.id, guildId);

        /* ======================================================
           VALIDACIONES
        ====================================================== */
        if (method === "money" && senderBal.money < amount) {
            await safeReply(interaction, { content: "❌ No tienes suficiente dinero en mano.", ephemeral: true });
            return;
        }

        if (method === "bank" && senderBal.bank < amount) {
            await safeReply(interaction, { content: "❌ No tienes suficiente dinero en el banco.", ephemeral: true });
            return;
        }

        /* ======================================================
           TRANSFERENCIA REAL SEGÚN MÉTODO
        ====================================================== */

        if (method === "money") {
            // RESTAMOS DE LA MANO DEL EMISOR
            await eco.removeMoney(sender.id, guildId, amount, "money");

            // SUMAMOS A LA MANO DEL RECEPTOR
            await eco.addMoney(receiver.id, guildId, amount, "money");

        } else if (method === "bank") {
            // FIX: The original code used withdraw() which moves Bank -> Money, creating an inflation bug.
            // We implementation proper Bank -> Bank transfer manually here.

            const senderData = await eco.getUser(sender.id, guildId);
            if (!senderData) return;

            senderData.bank = (senderData.bank || 0) - amount;
            await senderData.save();

            // SUMAR AL BANCO DEL RECEPTOR
            const receiverData = await eco.getUser(receiver.id, guildId);
            // It's possible receiverData is null if new user, getUser handles creation
            if (receiverData) {
                receiverData.bank = (receiverData.bank || 0) + amount;
                await receiverData.save();
            }
        }

        /* ======================================================
           RESULTADOS
        ====================================================== */

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

        await safeReply(interaction, { embeds: [embed], ephemeral: true });
    }
});
