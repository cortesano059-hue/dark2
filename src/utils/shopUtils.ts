import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} from 'discord.js';
import * as eco from '../economy/index.js';

const COLOR_PRINCIPAL = 0x2b2d31;
const ITEMS_PER_PAGE = 8;

// IMÁGENES
const IMAGEN_BANNER = "https://media.discordapp.net/attachments/1446521974271639721/1453958589843505163/mt9cntQ_-_Imgur.png?ex=694f57f5&is=694e0675&hm=f6b3c75e834f15985122d127fd44603c2b5a1fc7d2f8ed1cb0bfe7c841b8db23&=&format=webp&quality=lossless&width=1768&height=393";
const IMAGEN_FOOTER = "https://media.discordapp.net/attachments/1446521974271639721/1453958589420011610/n2WEBOD_-_Imgur.png?ex=694f57f4&is=694e0674&hm=04a1da37d7cf658c7f67809b3e7fd3a5832ecdd73e821526060f04511c6eb624&=&format=webp&quality=lossless&width=1768&height=49";

export async function generateShopPayload(guildId: string | null, pageIndex: number, userId: string) {
    if (!guildId) return { content: "❌ Este comando solo se se puede usar en servidores.", flags: MessageFlags.Ephemeral };

    // Obtener balance del usuario para los botones
    const balance = await eco.getBalance(userId, guildId);
    const userMoney = balance.money || 0;

    const allShopItems = await eco.getShop(guildId);
    allShopItems.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    // Asegurar orden por precio de menor a mayor
    const totalItems = allShopItems.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    pageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
    const startIndex = pageIndex * ITEMS_PER_PAGE;
    const itemsOnPage = allShopItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const container = new ContainerBuilder()
        .setAccentColor(COLOR_PRINCIPAL);

    // 1. Banner (Media Gallery)
    container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
            new MediaGalleryItemBuilder().setURL(IMAGEN_BANNER)
        ])
    );

    // 2. Title Section


    if (itemsOnPage.length === 0) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("### No hay artículos disponibles.")
                )
                .setButtonAccessory(
                    new ButtonBuilder({
                        customId: "shop/ignore/empty",
                        label: "Vacío",
                        style: ButtonStyle.Secondary,
                        disabled: true
                    })
                )
        );
    } else {
        // 3. Shop Items
        for (const [index, item] of itemsOnPage.entries()) {
            const globalIndex = startIndex + index + 1;
            const itemPrice = Number(item.price) || 0;
            const canAfford = userMoney >= itemPrice;
            const priceLabel = `$${itemPrice.toLocaleString()}`;

            container.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${globalIndex}. ${item.itemName}\n> ${item.description || 'Sin descripción'}`)
                    )
                    .setButtonAccessory(
                        new ButtonBuilder({
                            customId: `shop/buy/${item._id}/${userId}`,
                            label: priceLabel,
                            style: canAfford ? ButtonStyle.Success : ButtonStyle.Secondary,
                            disabled: !canAfford
                        })
                    )
            );
        }
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    // 4. Footer Image (Media Gallery)
    container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
            new MediaGalleryItemBuilder().setURL(IMAGEN_FOOTER)
        ])
    );

    // 5. External Navigation (Regular Action Row)
    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder({
            customId: `shop/nav/prev/${pageIndex}/${userId}`,
            emoji: "⬅️",
            style: ButtonStyle.Primary,
            disabled: pageIndex === 0
        }),
        new ButtonBuilder({
            customId: 'shop/close',
            label: 'Cerrar',
            style: ButtonStyle.Secondary
        }),
        new ButtonBuilder({
            customId: `shop/nav/next/${pageIndex}/${userId}`,
            emoji: "➡️",
            style: ButtonStyle.Primary,
            disabled: pageIndex >= totalPages - 1 || totalPages === 0
        })
    );

    return {
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        components: [container, navRow]
    };
}
