import { createCommand } from "#base";
import { GuildConfig } from "#database";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
createCommand({
  name: "prefix",
  description: "Configura el prefijo para los comandos tradicionales.",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: "nuevo",
      description: "El nuevo prefijo (ej: !, ., ?, -)",
      type: ApplicationCommandOptionType.String,
      required: true,
      maxLength: 3
    }
  ],
  async run(interaction) {
    const { guild, options } = interaction;
    if (!guild) return;
    const newPrefix = options.getString("nuevo", true);
    await GuildConfig.findOneAndUpdate(
      { guildId: guild.id },
      { $set: { prefix: newPrefix } },
      { upsert: true }
    );
    const embed = ThemedEmbed.success("Prefijo Actualizado", `El prefijo del servidor ha sido cambiado con \xE9xito.
Ahora puedes usar comandos con: \`${newPrefix}\``).addFields({ name: "Ejemplo", value: `\`${newPrefix}help\`` }).setFooter({ text: `Acci\xF3n realizada por ${interaction.user.username}` });
    await interaction.reply({ embeds: [embed] });
  }
});
