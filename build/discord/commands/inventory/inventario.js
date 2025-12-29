import { createCommand, createResponder, ResponderType } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import * as eco from "../../../economy/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
const ITEMS_PER_PAGE = 8;
async function generateInventoryPayload(guildId, userId, targetUser, page, client) {
  const items = await eco.getUserInventory(targetUser.id, guildId);
  items.sort((a, b) => a.itemName.localeCompare(b.itemName));
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  page = Math.max(0, Math.min(page, totalPages - 1));
  const startIndex = page * ITEMS_PER_PAGE;
  const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const embed = new ThemedEmbed().setTitle(`\u{1F4E6} Inventario de ${targetUser.username}`).setDescription(items.length === 0 ? "El inventario est\xE1 vac\xEDo." : `P\xE1gina ${page + 1} de ${totalPages}`).setFooter({ text: `Total items: ${totalItems}` }).setThumbnail(targetUser.displayAvatarURL());
  if (pageItems.length > 0) {
    for (const item of pageItems) {
      embed.addFields({
        name: `${item.emoji} ${item.itemName} (x${item.amount})`,
        value: item.description || "Sin descripci\xF3n",
        inline: false
      });
    }
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`inv/prev/${page}/${userId}/${targetUser.id}`).setLabel("\u2B05\uFE0F").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`inv/next/${page}/${userId}/${targetUser.id}`).setLabel("\u27A1\uFE0F").setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
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
      await interaction.reply({ content: "\u274C No puedes usar estos botones.", ephemeral: true });
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
