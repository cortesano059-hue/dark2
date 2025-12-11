import { createResponder, ResponderType } from "#base";
import eco from "@economy";
import safeReply from "@src/utils/safeReply";

// Handler para tienda_buy_* (compra de items)
createResponder({
    customId: "tienda_buy/:userId",
    types: [ResponderType.StringSelect],
    parse: ({ userId }) => ({ userId }),
    async run(interaction, { userId }) {
        const guildId = interaction.guild!.id;

        // Verificar que el usuario que compra es el mismo que inició la interacción
        if (interaction.user.id !== userId) {
            return safeReply(interaction, {
                content: "❌ Solo puedes comprar desde tu propia tienda.",
                flags: 64
            });
        }

        const selected = interaction.values[0];
        if (!selected) {
            return safeReply(interaction, {
                content: "❌ No seleccionaste ningún item.",
                flags: 64
            });
        }

        const item = await eco.getItemByName(guildId, selected);
        if (!item) {
            return safeReply(interaction, {
                content: "❌ El ítem no existe.",
                flags: 64
            });
        }

        if (!item.price || item.price <= 0) {
            return safeReply(interaction, {
                content: "❌ Este ítem no está en venta.",
                flags: 64
            });
        }

        const bal = await eco.getBalance(userId, guildId);

        if (bal.money < item.price) {
            return safeReply(interaction, {
                content: `❌ No tienes suficiente dinero. Necesitas **$${item.price}**`,
                flags: 64
            });
        }

        const remove = await eco.removeMoney(userId, guildId, item.price, "shop_buy");
        if (!remove.success) {
            return safeReply(interaction, {
                content: "❌ Error al procesar el pago.",
                flags: 64
            });
        }

        const add = await eco.addToInventory(userId, guildId, item.itemName, 1);
        if (!add) {
            return safeReply(interaction, {
                content: "❌ Error al añadir el ítem al inventario.",
                flags: 64
            });
        }

        return safeReply(interaction, {
            content: `✅ Has comprado **${item.emoji} ${item.itemName}** por **$${item.price}**.`,
            flags: 64
        });
    },
});

