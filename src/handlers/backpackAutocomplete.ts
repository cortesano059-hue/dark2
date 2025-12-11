import { AutocompleteInteraction } from "discord.js";
import { Backpack } from "@database/mongodb";
import eco from "@economy";
import { isAdmin, canAccessBackpack } from "@src/utils/backpackAccess";
import escapeRegex from "@src/utils/escapeRegex";
import MyClient from "../structures/MyClient.js";

export default {
    name: "backpackAutocomplete",

    async execute(interaction: AutocompleteInteraction, client: MyClient): Promise<void> {
        if (!interaction.isAutocomplete()) return;

        const guildId = interaction.guild!.id;
        const member = interaction.member as any;

        const focused = interaction.options.getFocused(true);
        const query = (focused.value || "").toLowerCase();

        try {
            if (["nombre", "mochila"].includes(focused.name)) {
                const all = await Backpack.find({ guildId }).limit(200);

                const accesibles = all.filter(bp =>
                    bp.ownerId === member.id ||
                    isAdmin(member) ||
                    canAccessBackpack(bp, member)
                );

                return interaction.respond(
                    accesibles
                        .filter(bp => bp.name.toLowerCase().includes(query))
                        .slice(0, 25)
                        .map(bp => ({
                            name: `${bp.emoji || "🎒"} ${bp.name}`,
                            value: bp.name
                        }))
                );
            }

            let sub: string | null = null;
            try {
                sub = interaction.options.getSubcommand();
            } catch {
                // Durante autocomplete puede fallar si aún no se define el subcomando
            }

            if (sub === "meter" && focused.name === "item") {
                const inv = await eco.getUserInventory(member.id, guildId);

                return interaction.respond(
                    inv
                        .filter((i: any) => i.itemName.toLowerCase().includes(query))
                        .slice(0, 25)
                        .map((i: any) => ({
                            name: `${i.emoji || "📦"} ${i.itemName} (${i.amount})`,
                            value: i.itemName
                        }))
                );
            }

            if (sub === "sacar" && focused.name === "item") {
                const mochilaName = interaction.options.getString("mochila");
                if (!mochilaName) return interaction.respond([]);

                const bp = await Backpack.findOne({
                    guildId,
                    name: new RegExp("^" + escapeRegex(mochilaName) + "$", "i")
                }).populate("items.itemId");

                if (!bp) return interaction.respond([]);

                return interaction.respond(
                    bp.items
                        .filter((i: any) => i.itemId.itemName.toLowerCase().includes(query))
                        .slice(0, 25)
                        .map((i: any) => ({
                            name: `${i.itemId.emoji} ${i.itemId.itemName} (${i.amount})`,
                            value: i.itemId.itemName
                        }))
                );
            }

            return interaction.respond([]);

        } catch (err) {
            console.error("❌ Error en backpackAutocomplete:", err);
            return interaction.respond([]);
        }
    }
};

