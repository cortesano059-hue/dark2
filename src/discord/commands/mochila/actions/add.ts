import { findAccessibleBackpack, saveBackpack, BackpackModel } from "../../../../database/repositories/backpackRepo.js";
import * as eco from "../../../../economy/index.js";
import { ApplicationCommandOptionType, InteractionReplyOptions, PermissionFlagsBits } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";

// "Añadir items (admin)"
export const add = {
    command: {
        name: "añadir",
        description: "Añadir items (admin)",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
            { name: "mochila", description: "Mochila", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
            { name: "item", description: "Item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
            { name: "cantidad", description: "Cantidad", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }
        ]
    },
    async run(interaction: any): Promise<InteractionReplyOptions> {
        const member = interaction.member;
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            return { content: "❌ Solo administradores.", ephemeral: true };
        }

        const mochilaName = interaction.options.getString("mochila", true);
        const itemName = interaction.options.getString("item", true);
        const amount = interaction.options.getInteger("cantidad", true);
        const guildId = interaction.guildId!;

        // Custom find for admin add
        function escapeRegex(str: string) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
        const regex = new RegExp(`^${escapeRegex(mochilaName)}$`, "i");
        const bp = await BackpackModel.findOne({ guildId, name: regex });

        if (!bp) return { content: "❌ Mochila no encontrada.", ephemeral: true };

        const bpMapped = {
            id: bp.id,
            ownerId: bp.ownerId,
            guildId: bp.guildId,
            name: bp.name,
            capacity: bp.capacity,
            items: Object.fromEntries(bp.items || new Map()) as any,
            allowedUsers: bp.allowedUsers || [],
            allowedRoles: bp.allowedRoles || [],
            accessType: bp.accessType || 'owner_only'
        };

        // Check item existence in global economy
        const globalItem = await eco.getItemByName(guildId, itemName);
        if (!globalItem) {
            return { content: `❌ El item **${itemName}** no existe en el sistema.`, ephemeral: true };
        }

        // Check capacity
        const currentCount = Object.keys(bpMapped.items).length;
        // Wait, capacity is slots or total amount? Dark uses slots (items.length).
        // Converting map keys length check.
        const existsInBp = bpMapped.items[globalItem.name];

        if (!existsInBp && currentCount >= bpMapped.capacity) {
            return { content: "❌ La mochila está llena (slots).", ephemeral: true };
        }

        // Add
        if (existsInBp) {
            bpMapped.items[globalItem.name].amount += amount;
        } else {
            bpMapped.items[globalItem.name] = { itemId: globalItem.name, amount };
        }

        await saveBackpack(bpMapped);

        return {
            embeds: [
                ThemedEmbed.success("Item Añadido (Admin)", `Añadido **${amount}x ${globalItem.name}** a **${bp.name}**.`)
            ],
            ephemeral: true
        };
    },
};
