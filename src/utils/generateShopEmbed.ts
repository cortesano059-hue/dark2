import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  Client,
} from "discord.js";
import eco from "@src/database/economy";
import ThemedEmbed from "@src/utils/ThemedEmbed";

// CONFIGURACIÓN
const COLOR_PRINCIPAL = "#2b2d31";
const ITEMS_PER_PAGE = 8;
const IMAGEN_BANNER =
  "https://cdn.discordapp.com/attachments/1438575452288581632/1445207801331712214/image.png?ex=693570e6&is=69341f66&hm=28d659750188201993b61af5af33cd1e27583eb58da5470e4e44c181a01a73c8&";
const IMAGEN_FOOTER =
  "https://cdn.discordapp.com/attachments/1438575452288581632/1445213527617966201/Tienda_abajo.png?ex=6935763b&is=693424bb&hm=c63621c8f9d0d1315e4fc34e7476a97842b73cba9f6f513bd7ce5d4ac41da1d6&";

interface ShopPayload {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<
    ButtonBuilder | StringSelectMenuBuilder
  >[];
}

interface ShopItem {
  _id: string;
  itemName: string;
  description?: string;
  price: number;
}

/**
 * Genera embeds y componentes para la tienda
 */
export async function generateShopPayload(
  guildId: string,
  pageIndex: number,
  userId: string,
  client: Client
): Promise<ShopPayload> {
  const shopItems = await eco.getShop(guildId);
  const totalItems = shopItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  // Validar página
  pageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
  const startIndex = pageIndex * ITEMS_PER_PAGE;
  const itemsOnPage = shopItems.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // --- Embed Banner ---
  const embedBanner = new EmbedBuilder()
    .setImage(IMAGEN_BANNER)
    .setColor(COLOR_PRINCIPAL);

  // --- Embed Contenido Tienda ---
  const shopEmbed = new ThemedEmbed()
    .setColor(COLOR_PRINCIPAL)
    .setTitle(
      `🛍️ Tienda del Servidor (Página ${pageIndex + 1}/${totalPages})`
    )
    .setDescription(
      `Selecciona un artículo en el menú desplegable para comprarlo.\n\n**Artículos en esta página:**\n` +
        itemsOnPage
          .map((item: ShopItem, index: number) =>
            `**${startIndex + index + 1}.** **${item.itemName}** — $${item.price}\n*${
              item.description || "Sin descripción"
            }*`
          )
          .join("\n\n")
    )
    .setThumbnail(client.user?.displayAvatarURL() || null)
    .setImage(IMAGEN_FOOTER)
    .setFooter({
      text: `Mostrando ${startIndex + 1}-${startIndex + itemsOnPage.length} de ${totalItems} artículos.`,
    });

  // --- Menú Desplegable (solo items de la página) ---
  const selectMenuOptions = itemsOnPage.map((item: ShopItem) => ({
    label: `${item.itemName} ($${item.price})`,
    description: item.description || "Comprar este artículo.",
    value: item._id.toString(),
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tienda_buy_menu_${userId}`)
    .setPlaceholder("🛒 Selecciona un artículo para comprar")
    .addOptions(selectMenuOptions);

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );

  // --- Botones de Paginación ---
  const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`tienda_prev_${pageIndex}_${userId}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 0),

    new ButtonBuilder()
      .setCustomId("shop_close")
      .setLabel("Cerrar")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`tienda_next_${pageIndex}_${userId}`)
      .setLabel("Siguiente ➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === totalPages - 1 || totalPages === 0)
  );

  return { embeds: [embedBanner, shopEmbed], components: [selectRow, paginationRow] };
}

export default {
  generateShopPayload,
};
