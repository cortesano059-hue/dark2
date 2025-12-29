import { findAccessibleBackpack, saveBackpack } from "../../../../database/repositories/backpackRepo.js";
import * as eco from "../../../../economy/index.js";
import { ApplicationCommandOptionType } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
const sacar = {
  command: {
    name: "sacar",
    description: "Sacar un item de la mochila",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Nombre de la mochila", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
      { name: "item", description: "Nombre del item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
      { name: "cantidad", description: "Cantidad a sacar", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }
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
    const bpItem = bp.items[itemName];
    if (!bpItem || bpItem.amount < amount) {
      return { content: `\u274C No hay suficientes **${itemName}** en la mochila (Tienes: ${bpItem?.amount || 0}).`, ephemeral: true };
    }
    bpItem.amount -= amount;
    if (bpItem.amount <= 0) delete bp.items[itemName];
    else bp.items[itemName] = bpItem;
    const added = await eco.addToInventory(userId, guildId, itemName, amount);
    if (!added) {
      return { content: `\u274C Error: El item **${itemName}** no existe en el registro global.`, ephemeral: true };
    }
    if (!bp.guildId) bp.guildId = guildId;
    await saveBackpack(bp);
    return {
      embeds: [
        ThemedEmbed.success("Item Sacado", `Has sacado **${amount}x ${itemName}** de la mochila **${mochilaName}**.`)
      ],
      ephemeral: true
    };
  }
};
export {
  sacar
};
