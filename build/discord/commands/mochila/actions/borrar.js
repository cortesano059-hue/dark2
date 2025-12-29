import { loadBackpack, BackpackModel } from "../../../../database/repositories/backpackRepo.js";
import { ApplicationCommandOptionType } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";
const borrar = {
  command: {
    name: "borrar",
    description: "Eliminar una mochila (debe estar vac\xEDa)",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "mochila", description: "Nombre de la mochila a borrar", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
    ]
  },
  async run(interaction) {
    const nombre = interaction.options.getString("mochila", true);
    const userId = interaction.user.id;
    const bp = await loadBackpack(userId, nombre);
    if (!bp) return { content: "\u274C No encontr\xE9 esa mochila o no eres el due\xF1o.", ephemeral: true };
    if (Object.keys(bp.items).length > 0) {
      return { content: `\u274C La mochila **${nombre}** no est\xE1 vac\xEDa. Saca los items primero.`, ephemeral: true };
    }
    await BackpackModel.deleteOne({ _id: bp.id });
    return {
      embeds: [
        ThemedEmbed.success("Mochila Eliminada", `Has eliminado la mochila **${nombre}**.`)
      ],
      ephemeral: true
    };
  }
};
export {
  borrar
};
