import { loadBackpack, saveBackpack } from "../../../../database/repositories/backpackRepo.js";
import { ApplicationCommandOptionType, InteractionReplyOptions } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";

export const renombrar = {
    command: {
        name: "renombrar",
        description: "Cambiar el nombre de una mochila",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
            { name: "mochila", description: "Nombre actual", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
            { name: "nuevo_nombre", description: "Nuevo nombre", type: ApplicationCommandOptionType.String, required: true }
        ]
    },
    async run(interaction: any): Promise<InteractionReplyOptions> {
        const currentName = interaction.options.getString("mochila", true);
        const newName = interaction.options.getString("nuevo_nombre", true);
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        if (!guildId) return { content: "❌ Error.", ephemeral: true };

        // Strict owner check
        const bp = await loadBackpack(userId, currentName);
        if (!bp) return { content: "❌ No encontré esa mochila o no eres el dueño.", ephemeral: true };

        // Check if new name exists
        const existing = await loadBackpack(userId, newName);
        if (existing) {
            return { content: `❌ Ya tienes una mochila llamada **${newName}**.`, ephemeral: true };
        }

        const oldName = bp.name;
        bp.name = newName;

        // Ensure guildId is set (fix legacy implicit)
        if (!bp.guildId) bp.guildId = guildId;

        // We must use updateOne manually because saveBackpack uses filter by owner+name, 
        // and if we change name in object but pass it to saveBackpack, it might rely on the new name for filter and fail to update the old doc?
        // Let's check saveBackpack implementation.
        // saveBackpack uses: const filter = { ownerId: bp.ownerId, name: bp.name };
        // If we change bp.name, filter will look for new name, find nothing, and UPSERT a new doc!
        // We want to UPDATE the old doc.
        // So we cannot use saveBackpack for renaming efficiently without changing repository.
        // We'll import BackpackModel and do it manually here.

        const { BackpackModel } = await import("../../../../database/repositories/backpackRepo.js");
        await BackpackModel.updateOne({ _id: bp.id }, { $set: { name: newName, guildId } });

        return {
            embeds: [
                ThemedEmbed.success("Mochila Renombrada", `Has cambiado el nombre de **${oldName}** a **${newName}**.`)
            ],
            ephemeral: true
        };
    },
};
