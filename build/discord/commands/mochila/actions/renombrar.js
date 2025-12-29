import { loadBackpack } from "../../../../database/repositories/backpackRepo.js";
import { ApplicationCommandOptionType } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
const renombrar = {
  command: {
    name: "renombrar",
    description: "Cambiar el nombre de una mochila",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Nombre actual", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
      { name: "nuevo_nombre", description: "Nuevo nombre", type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  async run(interaction) {
    const currentName = interaction.options.getString("mochila", true);
    const newName = interaction.options.getString("nuevo_nombre", true);
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return { content: "\u274C Error.", ephemeral: true };
    const bp = await loadBackpack(userId, currentName);
    if (!bp) return { content: "\u274C No encontr\xE9 esa mochila o no eres el due\xF1o.", ephemeral: true };
    const existing = await loadBackpack(userId, newName);
    if (existing) {
      return { content: `\u274C Ya tienes una mochila llamada **${newName}**.`, ephemeral: true };
    }
    const oldName = bp.name;
    bp.name = newName;
    if (!bp.guildId) bp.guildId = guildId;
    const { BackpackModel } = await import("../../../../database/repositories/backpackRepo.js");
    await BackpackModel.updateOne({ _id: bp.id }, { $set: { name: newName, guildId } });
    return {
      embeds: [
        ThemedEmbed.success("Mochila Renombrada", `Has cambiado el nombre de **${oldName}** a **${newName}**.`)
      ],
      ephemeral: true
    };
  }
};
export {
  renombrar
};
