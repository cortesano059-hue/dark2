import { findAccessibleBackpack, saveBackpack } from "../../../../database/repositories/backpackRepo.js";
import * as eco from "../../../../economy/index.js";
import { ApplicationCommandOptionType } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
const meter = {
  command: {
    name: "meter",
    description: "Meter un item en la mochila",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Nombre de la mochila", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
      { name: "item", description: "Nombre del item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
      { name: "cantidad", description: "Cantidad a guardar", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }
    ]
  },
  async run(interaction) {
    const mochilaName = interaction.options.getString("mochila", true);
    const itemName = interaction.options.getString("item", true);
    const amount = interaction.options.getInteger("cantidad", true);
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const member = interaction.member;
    const roleIds = member.roles.cache ? member.roles.cache.map((r) => r.id) : [];
    if (!guildId) return { content: "\u274C Error de servidor.", ephemeral: true };
    const bp = await findAccessibleBackpack(userId, guildId, mochilaName, roleIds);
    if (!bp) return { content: "\u274C Mochila no encontrada.", ephemeral: true };
    const has = await eco.hasItem(userId, guildId, itemName, amount);
    if (!has) {
      return { content: `\u274C No tienes suficientes **${itemName}** en tu inventario.`, ephemeral: true };
    }
    const removedRes = await eco.removeItem(userId, guildId, itemName, amount);
    if (!removedRes.success) {
      return { content: "\u274C Error al mover item.", ephemeral: true };
    }
    const bpItem = bp.items[itemName] || { itemId: itemName, amount: 0 };
    bpItem.amount += amount;
    bp.items[itemName] = bpItem;
    if (!bp.guildId) bp.guildId = guildId;
    await saveBackpack(bp);
    return {
      embeds: [
        ThemedEmbed.success("Item Guardado", `Has guardado **${amount}x ${itemName}** en la mochila **${mochilaName}**.`)
      ],
      ephemeral: true
    };
  }
};
export {
  meter
};
