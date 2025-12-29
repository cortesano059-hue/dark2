import { createCommand, createResponder, ResponderType } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import * as eco from "../../../economy/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";

const ITEMS_PER_PAGE = 8;

async function generateInventoryPayload(guildId: string, userId: string, targetUser: any, page: number, client: Client) {
    const items = await eco.getUserInventory(targetUser.id, guildId);

    // Sort items
    items.sort((a, b) => a.itemName.localeCompare(b.itemName));

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    page = Math.max(0, Math.min(page, totalPages - 1));

    const startIndex = page * ITEMS_PER_PAGE;
    const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const embed = new ThemedEmbed()
        .setTitle(`📦 Inventario de ${targetUser.username}`)
        .setDescription(items.length === 0 ? "El inventario está vacío." : `Página ${page + 1} de ${totalPages}`)
        .setFooter({ text: `Total items: ${totalItems}` })
        .setThumbnail(targetUser.displayAvatarURL());

    if (pageItems.length > 0) {
        for (const item of pageItems) {
            embed.addFields({
                name: `${item.emoji} ${item.itemName} (x${item.amount})`,
                value: item.description || "Sin descripción",
                inline: false
            });
        }
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`inv/prev/${page}/${userId}/${targetUser.id}`)
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),

        new ButtonBuilder()
            .setCustomId(`inv/next/${page}/${userId}/${targetUser.id}`)
            .setLabel("➡️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );

    return { embeds: [embed], components: [row] };
}

createCommand({
    name: "inventario",
    description: "Muestra tu inventario o el de otro usuario.",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "usuario",
            description: "Usuario a revisar",
            type: ApplicationCommandOptionType.User
        }
    ],
    async run(interaction) {
        if (!interaction.guildId) return;
        const target = interaction.options.getUser("usuario") || interaction.user;

        const payload = await generateInventoryPayload(interaction.guildId, interaction.user.id, target, 0, interaction.client);
        await safeReply(interaction, payload);
    }
});

createResponder({
    customId: "inv/:action/:page/:clickerId/:targetId",
    types: [ResponderType.Button],
    cache: "cached",
    async run(interaction) {
        const { action, page: pageStr, clickerId, targetId } = interaction.params;

        if (interaction.user.id !== clickerId) {
            await interaction.reply({ content: "❌ No puedes usar estos botones.", ephemeral: true });
            return;
        }

        let page = parseInt(pageStr);
        if (action === "prev") page--;
        if (action === "next") page++;

        let targetUser = interaction.client.users.cache.get(targetId);
        if (!targetUser) targetUser = await interaction.client.users.fetch(targetId);

        const payload = await generateInventoryPayload(interaction.guildId, clickerId, targetUser, page, interaction.client);
        await interaction.update(payload);
    }
});
