import { loadBackpack, BackpackModel } from "../../../../database/repositories/backpackRepo.js";
import { ApplicationCommandOptionType, InteractionReplyOptions } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";

export const borrar = {
    command: {
        name: "borrar",
        description: "Eliminar una mochila (debe estar vacía)",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
            { name: "mochila", description: "Nombre de la mochila a borrar", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
        ]
    },
    async run(interaction: any): Promise<InteractionReplyOptions> {
        const nombre = interaction.options.getString("mochila", true);
        const userId = interaction.user.id;

        // Strict owner check - only owner can delete
        const bp = await loadBackpack(userId, nombre);
        if (!bp) return { content: "❌ No encontré esa mochila o no eres el dueño.", ephemeral: true };

        // Check if empty
        if (Object.keys(bp.items).length > 0) {
            return { content: `❌ La mochila **${nombre}** no está vacía. Saca los items primero.`, ephemeral: true };
        }

        await BackpackModel.deleteOne({ _id: bp.id });

        return {
            embeds: [
                ThemedEmbed.success("Mochila Eliminada", `Has eliminado la mochila **${nombre}**.`)
            ],
            ephemeral: true
        };
    },
};
