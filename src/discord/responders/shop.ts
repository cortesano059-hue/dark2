import { createResponder, ResponderType } from "#base";
import { generateShopPayload } from "../../utils/shopUtils.js";

import * as eco from "../../economy/index.js";
import { ThemedEmbed } from "../../utils/ThemedEmbed.js";

createResponder({
    customId: "shop/close",
    types: [ResponderType.Button],
    cache: "cached",
    async run(interaction) {
        await interaction.update({ content: "❌ Tienda cerrada.", components: [], embeds: [] });
    }
});

createResponder({
    customId: "shop/nav/:action/:page/:userId",
    types: [ResponderType.Button],
    cache: "cached",
    parse: (params) => ({
        action: params.action,
        page: Number.parseInt(params.page),
        userId: params.userId
    }),
    async run(interaction, { action, page, userId }) {
        if (interaction.user.id !== userId) {
            await interaction.reply({ content: "❌ No puedes usar este menú.", ephemeral: true });
            return;
        }

        if (action === "prev") page = Math.max(0, page - 1);
        if (action === "next") page = page + 1;

        const payload = await generateShopPayload(interaction.guildId, page, userId);
        await interaction.update(payload as any);
    }
});

createResponder({
    customId: "shop/buy/:itemId/:userId",
    types: [ResponderType.Button],
    cache: "cached",
    parse: (params) => ({
        itemId: params.itemId,
        userId: params.userId
    }),
    async run(interaction, { itemId, userId }) {
        if (interaction.user.id !== userId) {
            await interaction.reply({ content: "❌ No puedes usar este menú.", ephemeral: true });
            return;
        }

        const item = await eco.getItemById(itemId);
        if (!item) {
            await interaction.reply({ content: "❌ Este artículo ya no existe.", ephemeral: true });
            return;
        }

        const bal = await eco.getBalance(interaction.user.id, interaction.guildId!);
        const itemPrice = item.price ?? 0;

        if ((bal.money || 0) < itemPrice) {
            await interaction.reply({ content: `❌ No tienes suficiente dinero. Precio: $${itemPrice.toLocaleString()}`, ephemeral: true });
            return;
        }

        const bought = await eco.removeMoney(interaction.user.id, interaction.guildId!, itemPrice, `buy_${item.itemName}`);
        if (!bought.success) {
            await interaction.reply({ content: "❌ Error al cobrar.", ephemeral: true });
            return;
        }

        await eco.addToInventory(interaction.user.id, interaction.guildId!, item._id.toString(), 1);

        await interaction.reply({
            embeds: [
                new ThemedEmbed(interaction)
                    .setTitle("✅ Compra Exitosa")
                    .setDescription(`Has comprado **${item.itemName}** por **$${itemPrice.toLocaleString()}**.`)
                    .setColor("#2ecc71")
            ],
            ephemeral: true
        });
    }
});
