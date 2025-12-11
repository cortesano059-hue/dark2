// src/discord/responders/shop/shopPayload.ts
import {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  Client,
  Interaction,
} from "discord.js";
import eco from "@economy";
import safeReply from "@src/utils/safeReply";

interface ShopItem {
  itemName: string;
  description?: string;
  type: string;
}

interface ShopPayloadOptions {
  customId: string;
  placeholder?: string;
}

/**
 * Función auxiliar para generar el payload del menú de selección de la tienda
 * @deprecated Esta función puede no ser necesaria si ya usas generateShopEmbed.ts
 * Se mantiene por compatibilidad si algún código la está usando
 */
export async function shopPayload(
  interaction: Interaction,
  shopItems: ShopItem[],
  client: Client,
  options?: ShopPayloadOptions
): Promise<void> {
  try {
    if (!shopItems || shopItems.length === 0) return;

    // Construimos las opciones del select menu
    const selectOptions = shopItems.map((item) => ({
      label: item.itemName,
      description: item.description || "Sin descripción",
      value: item.itemName,
      emoji: item.type === "food" ? "🍔" : "📦",
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId(options?.customId || "shop_select_item")
      .setPlaceholder(options?.placeholder || "Selecciona un item para comprar")
      .addOptions(selectOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      menu
    );

    if (interaction.isRepliable()) {
      await interaction.editReply({
        content: "🛒 Selecciona un item para comprar:",
        components: [row],
      });
    }
  } catch (err) {
    console.error("🔴 Error en shopPayload:", err);
    if (interaction.isRepliable()) {
      await safeReply(
        interaction,
        "❌ Error al mostrar la tienda."
      );
    }
  }
}

export default shopPayload;

