import { findAccessibleBackpack, BackpackModel } from "../../../../database/repositories/backpackRepo.js";
import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder
} from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
import { Item, Inventory } from "../../../../database/index.js";
const abrir = {
  command: {
    name: "abrir",
    description: "Abrir una mochila (Interactivo)",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Nombre de la mochila", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
    ]
  },
  async run(interaction) {
    const nombre = interaction.options.getString("mochila", true);
    const member = interaction.member;
    const roleIds = member.roles.cache ? member.roles.cache.map((r) => r.id) : [];
    let bp = await findAccessibleBackpack(interaction.user.id, interaction.guildId, nombre, roleIds);
    if (!bp) {
      await interaction.editReply({ content: `\u274C No encontr\xE9 la mochila ** ${nombre}**.`, ephemeral: true });
      return;
    }
    const resolveItems = async (backpackItems) => {
      const entries = Object.entries(backpackItems);
      if (entries.length === 0) return [];
      const ids = entries.map(([k, v]) => v.itemId || k).filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
      const names = entries.map(([k, v]) => v.itemId || k).filter((id) => !/^[0-9a-fA-F]{24}$/.test(id));
      const [docsById, docsByName] = await Promise.all([
        Item.find({ _id: { $in: ids } }).lean(),
        Item.find({ itemName: { $in: names }, guildId: interaction.guildId }).lean()
      ]);
      const map = /* @__PURE__ */ new Map();
      docsById.forEach((d) => map.set(d._id.toString(), d));
      docsByName.forEach((d) => map.set(d.itemName, d));
      return entries.map(([key, raw]) => {
        const idToLook = raw.itemId || key;
        const doc = map.get(idToLook);
        return {
          uniqueKey: key,
          // The key in the map (usually same as ID now)
          id: idToLook,
          amount: raw.amount,
          name: doc ? doc.itemName : idToLook,
          emoji: doc ? doc.emoji || "\u{1F4E6}" : "\u2753",
          description: doc ? doc.description : "Desconocido"
        };
      });
    };
    let resolvedItems = await resolveItems(bp.items);
    let currentPage = 0;
    const ITEMS_PER_PAGE = 5;
    const render = (page) => {
      const totalPages = Math.ceil(resolvedItems.length / ITEMS_PER_PAGE) || 1;
      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const slice = resolvedItems.slice(start, end);
      const listStr = slice.map((i) => {
        return `\u2022 ${i.emoji} ** ${i.name}**
   \u2514 Cantidad: \`${i.amount}\``;
      }).join("\n\n") || "Mochila vac\xEDa.";
      const embed = new ThemedEmbed().setTitle(`\u{1F392} Mochila: ${bp.name}`).setDescription(listStr).setFooter({ text: `P\xE1gina ${page + 1}/${totalPages} \u2022 Capacidad: ${resolvedItems.length}/${bp.capacity}` });
      const rows = [];
      if (slice.length > 0) {
        const options = slice.map(
          (i) => new StringSelectMenuOptionBuilder().setLabel(`${i.name} (x${i.amount})`).setValue(i.uniqueKey).setDescription(`Sacar item del slot...`).setEmoji(i.emoji.length < 5 ? i.emoji : "\u{1F4E6}")
        );
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId("withdraw_select").setPlaceholder("\u{1F4E4} Sacar item...").addOptions(options)
        ));
      }
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setEmoji("\u2B05\uFE0F").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("refresh").setEmoji("\u{1F504}").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("next").setEmoji("\u27A1\uFE0F").setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
      ));
      return { embeds: [embed], components: rows };
    };
    const msg = await interaction.editReply(render(currentPage));
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 5 * 60 * 1e3
      // 5 mins
    });
    collector.on("collect", async (i) => {
      try {
        if (i.customId === "prev") {
          currentPage--;
          await i.update(render(currentPage));
        } else if (i.customId === "next") {
          currentPage++;
          await i.update(render(currentPage));
        } else if (i.customId === "refresh") {
          bp = await findAccessibleBackpack(interaction.user.id, interaction.guildId, nombre, roleIds);
          resolvedItems = await resolveItems(bp.items);
          await i.update(render(currentPage));
        } else if (i.customId === "withdraw_select") {
          const selectedKey = i.values[0];
          const itemData = resolvedItems.find((x) => x.uniqueKey === selectedKey);
          if (!itemData) {
            await i.reply({ content: "\u274C Error: Item no encontrado en cach\xE9 visual.", ephemeral: true });
            return;
          }
          const modal = new ModalBuilder().setCustomId(`withdraw_modal_${selectedKey}`).setTitle(`Sacar: ${itemData.name.substring(0, 30)}`);
          const qtyInput = new TextInputBuilder().setCustomId("qty").setLabel(`Cantidad (Max: ${itemData.amount})`).setStyle(TextInputStyle.Short).setPlaceholder("1").setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));
          await i.showModal(modal);
          try {
            const submit = await i.awaitModalSubmit({
              time: 3e4,
              filter: (s) => s.customId === `withdraw_modal_${selectedKey}` && s.user.id === interaction.user.id
            });
            const qtyStr = submit.fields.getTextInputValue("qty");
            const qty = parseInt(qtyStr);
            if (isNaN(qty) || qty <= 0) {
              await submit.reply({ content: "\u274C Cantidad inv\xE1lida.", ephemeral: true });
              return;
            }
            const freshBp = await findAccessibleBackpack(interaction.user.id, interaction.guildId, nombre, roleIds);
            if (!freshBp) {
              await submit.reply({ content: "\u274C La mochila ya no existe.", ephemeral: true });
              return;
            }
            const bpDoc = await BackpackModel.findOne({ _id: freshBp.id });
            if (!bpDoc) {
              await submit.reply({ content: "\u274C Error cr\xEDtico sincronizando mochila.", ephemeral: true });
              return;
            }
            const itemsMap = bpDoc.items;
            const storedItem = itemsMap.get(selectedKey);
            if (!storedItem || storedItem.amount < qty) {
              await submit.reply({ content: `\u274C No hay suficientes items. Tienes ${storedItem?.amount || 0}.`, ephemeral: true });
              return;
            }
            storedItem.amount -= qty;
            if (storedItem.amount <= 0) {
              itemsMap.delete(selectedKey);
            } else {
              itemsMap.set(selectedKey, storedItem);
            }
            const inv = await Inventory.findOne({ userId: interaction.user.id, guildId: interaction.guildId, itemId: itemData.id });
            if (inv) {
              inv.amount += qty;
              await inv.save();
            } else {
              if (/^[0-9a-fA-F]{24}$/.test(itemData.id)) {
                await Inventory.create({ userId: interaction.user.id, guildId: interaction.guildId, itemId: itemData.id, amount: qty });
              } else {
                await submit.reply({ content: "\u274C Error: El item no tiene un ID v\xE1lido para el inventario. Usa /mochila abrir de nuevo para migrarlo.", ephemeral: true });
                return;
              }
            }
            await bpDoc.save();
            await submit.reply({ content: `\u2705 Sacaste **${qty}x ${itemData.name}** a tu inventario.`, ephemeral: true });
            bp = await findAccessibleBackpack(interaction.user.id, interaction.guildId, nombre, roleIds);
            resolvedItems = await resolveItems(bp.items);
            await msg.edit(render(currentPage));
          } catch (e) {
            console.error(e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
};
export {
  abrir
};
