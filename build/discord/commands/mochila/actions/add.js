import { saveBackpack, BackpackModel } from "../../../../database/repositories/backpackRepo.js";
import * as eco from "../../../../economy/index.js";
import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
const add = {
  command: {
    name: "a\xF1adir",
    description: "A\xF1adir items (admin)",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Mochila", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
      { name: "item", description: "Item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
      { name: "cantidad", description: "Cantidad", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }
    ]
  },
  async run(interaction) {
    const member = interaction.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return { content: "\u274C Solo administradores.", ephemeral: true };
    }
    const mochilaName = interaction.options.getString("mochila", true);
    const itemName = interaction.options.getString("item", true);
    const amount = interaction.options.getInteger("cantidad", true);
    const guildId = interaction.guildId;
    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    const regex = new RegExp(`^${escapeRegex(mochilaName)}$`, "i");
    const bp = await BackpackModel.findOne({ guildId, name: regex });
    if (!bp) return { content: "\u274C Mochila no encontrada.", ephemeral: true };
    const bpMapped = {
      id: bp.id,
      ownerId: bp.ownerId,
      guildId: bp.guildId,
      name: bp.name,
      capacity: bp.capacity,
      items: Object.fromEntries(bp.items || /* @__PURE__ */ new Map()),
      allowedUsers: bp.allowedUsers || [],
      allowedRoles: bp.allowedRoles || [],
      accessType: bp.accessType || "owner_only"
    };
    const globalItem = await eco.getItemByName(guildId, itemName);
    if (!globalItem) {
      return { content: `\u274C El item **${itemName}** no existe en el sistema.`, ephemeral: true };
    }
    const currentCount = Object.keys(bpMapped.items).length;
    const existsInBp = bpMapped.items[globalItem.name];
    if (!existsInBp && currentCount >= bpMapped.capacity) {
      return { content: "\u274C La mochila est\xE1 llena (slots).", ephemeral: true };
    }
    if (existsInBp) {
      bpMapped.items[globalItem.name].amount += amount;
    } else {
      bpMapped.items[globalItem.name] = { itemId: globalItem.name, amount };
    }
    await saveBackpack(bpMapped);
    return {
      embeds: [
        ThemedEmbed.success("Item A\xF1adido (Admin)", `A\xF1adido **${amount}x ${globalItem.name}** a **${bp.name}**.`)
      ],
      ephemeral: true
    };
  }
};
export {
  add
};
