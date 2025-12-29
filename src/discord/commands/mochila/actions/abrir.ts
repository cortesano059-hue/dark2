
import { findAccessibleBackpack, BackpackModel, saveBackpack } from "../../../../database/repositories/backpackRepo.js";
import {
  ApplicationCommandOptionType,
  InteractionReplyOptions,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder
} from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
import { Item, Inventory } from "../../../../database/index.js";

export const abrir = {
  command: {
    name: "abrir",
    description: "Abrir una mochila (Interactivo)",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Nombre de la mochila", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
    ]
  },
  async run(interaction: any): Promise<void> {
    const nombre = interaction.options.getString("mochila", true);
    const member = interaction.member;
    const roleIds = member.roles.cache ? member.roles.cache.map((r: any) => r.id) : [];

    // 1. Initial Fetch
    let bp = await findAccessibleBackpack(interaction.user.id, interaction.guildId!, nombre, roleIds);
    if (!bp) {
      await interaction.editReply({ content: `❌ No encontré la mochila ** ${nombre}**.`, ephemeral: true });
      return;
    }

    // 2. Helper to fetch and resolve items
    // We fetch all at start to make pagination brisk. 
    // Optimization: In huge backpacks, this might be slow, but for <100 slots it's fine.
    const resolveItems = async (backpackItems: any) => {
      const entries = Object.entries(backpackItems);
      if (entries.length === 0) return [];

      const ids = entries.map(([k, v]: any) => v.itemId || k).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
      const names = entries.map(([k, v]: any) => v.itemId || k).filter(id => !/^[0-9a-fA-F]{24}$/.test(id));

      const [docsById, docsByName] = await Promise.all([
        Item.find({ _id: { $in: ids } }).lean(),
        Item.find({ itemName: { $in: names }, guildId: interaction.guildId }).lean()
      ]);

      const map = new Map<string, any>();
      docsById.forEach(d => map.set(d._id.toString(), d));
      docsByName.forEach(d => map.set(d.itemName, d));

      return entries.map(([key, raw]: any) => {
        const idToLook = raw.itemId || key;
        const doc = map.get(idToLook);
        return {
          uniqueKey: key, // The key in the map (usually same as ID now)
          id: idToLook,
          amount: raw.amount,
          name: doc ? doc.itemName : idToLook,
          emoji: doc ? (doc.emoji || "📦") : "❓",
          description: doc ? doc.description : "Desconocido"
        };
      });
    };

    let resolvedItems = await resolveItems(bp.items);
    let currentPage = 0;
    const ITEMS_PER_PAGE = 5;

    // 3. Render Function
    const render = (page: number) => {
      const totalPages = Math.ceil(resolvedItems.length / ITEMS_PER_PAGE) || 1;
      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const slice = resolvedItems.slice(start, end);

      const listStr = slice.map(i => {
        return `• ${i.emoji} ** ${i.name}**\n   └ Cantidad: \`${i.amount}\``;
      }).join("\n\n") || "Mochila vacía.";

      const embed = new ThemedEmbed()
        .setTitle(`🎒 Mochila: ${bp!.name}`)
        .setDescription(listStr)
        .setFooter({ text: `Página ${page + 1}/${totalPages} • Capacidad: ${resolvedItems.length}/${bp!.capacity}` });

      const rows: any[] = [];

      // Select Menu (Withdraw)
      if (slice.length > 0) {
        const options = slice.map(i =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${i.name} (x${i.amount})`)
            .setValue(i.uniqueKey) // we use the map key to identify exactly
            .setDescription(`Sacar item del slot...`)
            .setEmoji(i.emoji.length < 5 ? i.emoji : "📦")
        );

        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('withdraw_select')
            .setPlaceholder('📤 Sacar item...')
            .addOptions(options)
        ));
      }

      // Navigation
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('refresh').setEmoji('🔄').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
      ));

      return { embeds: [embed], components: rows };
    };

    // 4. Send Initial
    const msg = await interaction.editReply(render(currentPage));

    // 5. Collector
    const collector = msg.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      time: 5 * 60 * 1000 // 5 mins
    });

    collector.on('collect', async (i: any) => {
      try {
        if (i.customId === 'prev') {
          currentPage--;
          await i.update(render(currentPage));
        } else if (i.customId === 'next') {
          currentPage++;
          await i.update(render(currentPage));
        } else if (i.customId === 'refresh') {
          // Refresh data
          bp = await findAccessibleBackpack(interaction.user.id, interaction.guildId!, nombre, roleIds);
          resolvedItems = await resolveItems(bp!.items);
          await i.update(render(currentPage));
        } else if (i.customId === 'withdraw_select') {
          const selectedKey = i.values[0];
          const itemData = resolvedItems.find(x => x.uniqueKey === selectedKey);

          if (!itemData) {
            await i.reply({ content: "❌ Error: Item no encontrado en caché visual.", ephemeral: true });
            return;
          }

          // Show Modal
          const modal = new ModalBuilder()
            .setCustomId(`withdraw_modal_${selectedKey}`)
            .setTitle(`Sacar: ${itemData.name.substring(0, 30)}`);

          const qtyInput = new TextInputBuilder()
            .setCustomId('qty')
            .setLabel(`Cantidad (Max: ${itemData.amount})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput));

          await i.showModal(modal);

          // Await Modal Logic
          try {
            const submit = await i.awaitModalSubmit({
              time: 30000,
              filter: (s: any) => s.customId === `withdraw_modal_${selectedKey}` && s.user.id === interaction.user.id
            });

            const qtyStr = submit.fields.getTextInputValue('qty');
            const qty = parseInt(qtyStr);

            if (isNaN(qty) || qty <= 0) {
              await submit.reply({ content: "❌ Cantidad inválida.", ephemeral: true });
              return;
            }

            // DB Transaction Logic
            // Re-fetch to ensure atomicity
            const freshBp = await findAccessibleBackpack(interaction.user.id, interaction.guildId!, nombre, roleIds);
            if (!freshBp) {
              await submit.reply({ content: "❌ La mochila ya no existe.", ephemeral: true });
              return;
            }

            // Need direct model access for atomic updates usually, but simplified here with standard repo pattern
            // Note: 'freshBp' is POJO from repo mapDoc. We need the Mongoose Document to save safely?
            // The repo 'saveBackpack' uses updateOne.
            // Let's use direct DB manip for transaction safety or simple check-set-save.

            const bpDoc = await BackpackModel.findOne({ _id: freshBp.id }); // Using ID from POJO
            if (!bpDoc) {
              await submit.reply({ content: "❌ Error crítico sincronizando mochila.", ephemeral: true });
              return;
            }

            // Check items handling map vs object
            // Mongoose map: .get()
            const itemsMap = bpDoc.items as Map<string, any>;
            const storedItem = itemsMap.get(selectedKey);

            if (!storedItem || storedItem.amount < qty) {
              await submit.reply({ content: `❌ No hay suficientes items. Tienes ${storedItem?.amount || 0}.`, ephemeral: true });
              return;
            }

            // 1. Remove from BP
            storedItem.amount -= qty;
            if (storedItem.amount <= 0) {
              itemsMap.delete(selectedKey);
            } else {
              itemsMap.set(selectedKey, storedItem);
            }

            // 2. Add to Inventory
            // Logic from meter/sacar handlers
            const inv = await Inventory.findOne({ userId: interaction.user.id, guildId: interaction.guildId, itemId: itemData.id });
            if (inv) {
              inv.amount += qty;
              await inv.save();
            } else {
              // Assuming valid ID was migrated. If Name based, we might fail validation if Inventory is strict? 
              // Inventory Schema expects ObjectId for `itemId`.
              // If `itemData.id` is a Name string (legacy not migrated?), this will crash.
              // BUT we added auto-migration on list, so it *should* be an ID.
              // Safety check:
              if (/^[0-9a-fA-F]{24}$/.test(itemData.id)) {
                await Inventory.create({ userId: interaction.user.id, guildId: interaction.guildId, itemId: itemData.id, amount: qty });
              } else {
                // Fallback: This shouldn't happen with migration, but user might have blocked it?
                await submit.reply({ content: "❌ Error: El item no tiene un ID válido para el inventario. Usa /mochila abrir de nuevo para migrarlo.", ephemeral: true });
                return;
              }
            }

            await bpDoc.save();

            // Success Feedback
            await submit.reply({ content: `✅ Sacaste **${qty}x ${itemData.name}** a tu inventario.`, ephemeral: true });

            // Refresh UI
            bp = await findAccessibleBackpack(interaction.user.id, interaction.guildId!, nombre, roleIds);
            resolvedItems = await resolveItems(bp!.items);
            await msg.edit(render(currentPage));

          } catch (e) {
            // Modal timeout or error
            console.error(e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

  },
};

