import { createResponder, ResponderType } from "#base";
import * as eco from "../../economy/index.js";
import { executeItemUsage } from "./../commands/inventory/itemHandlers.js";
createResponder({
  customId: "item/buy/:itemName",
  types: [ResponderType.Button],
  cache: "cached",
  parse: (params) => ({
    itemName: params.itemName
  }),
  async run(interaction, { itemName }) {
    const res = await eco.buyItem(interaction.user.id, interaction.guildId, itemName, 1);
    if (res.success) {
      await interaction.reply({
        content: `\u2705 Has comprado 1 **${itemName}** por $${res.totalPrice}.`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `\u274C Error: ${res.reason}`,
        ephemeral: true
      });
    }
  }
});
createResponder({
  customId: "item/use/:itemName",
  types: [ResponderType.Button],
  cache: "cached",
  parse: (params) => ({
    itemName: params.itemName
  }),
  async run(interaction, { itemName }) {
    await interaction.deferReply({ ephemeral: true });
    await executeItemUsage(interaction, itemName);
  }
});
