import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { getPoliceRole } from "../../../economy/index.js";
createCommand({
  name: "policia",
  description: "Comandos de polic\xEDa.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "esposar",
      description: "Esposa a un usuario.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "usuario", description: "Usuario a esposar", type: ApplicationCommandOptionType.User, required: true }
      ]
    },
    {
      name: "desesposar",
      description: "Desesposa a un usuario.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "usuario", description: "Usuario a desesposar", type: ApplicationCommandOptionType.User, required: true }
      ]
    },
    {
      name: "escoltar",
      description: "Escolta a un usuario.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "usuario", description: "Usuario a escoltar", type: ApplicationCommandOptionType.User, required: true }
      ]
    },
    {
      name: "desescoltar",
      description: "Deja de escoltar a un usuario.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "usuario", description: "Usuario a desescoltar", type: ApplicationCommandOptionType.User, required: true }
      ]
    }
  ],
  async run(interaction) {
    if (!interaction.guildId || !interaction.member) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const target = interaction.options.getMember("usuario");
    const policeRole = await getPoliceRole(guildId);
    if (!policeRole) {
      await safeReply(interaction, "\u26A0\uFE0F No se ha configurado el rol de polic\xEDa.");
      return;
    }
    if (!interaction.member.roles.cache.has(policeRole)) {
      await safeReply(interaction, `\u274C Necesitas el rol <@&${policeRole}>.`);
      return;
    }
    if (!target) {
      await safeReply(interaction, "\u274C Usuario no encontrado.");
      return;
    }
    if (target.id === interaction.user.id) {
      await safeReply(interaction, "\u274C No puedes aplicarte esto a ti mismo.");
      return;
    }
    if (sub === "esposar") {
      const embed = new ThemedEmbed().setTitle("\u{1F512} Usuario esposado").setDescription(`${target} ha sido esposado por ${interaction.member}.`).setColor("#e74c3c");
      await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
    if (sub === "desesposar") {
      const embed = new ThemedEmbed().setTitle("\u{1F513} Usuario liberado").setDescription(`${target} ya no est\xE1 esposado.`).setColor("#2ecc71");
      await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
    if (sub === "escoltar") {
      const embed = new ThemedEmbed().setTitle("\u{1F693} Escolta iniciada").setDescription(`${interaction.member} ha comenzado a escoltar a ${target}.`).setColor("#f1c40f");
      await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
    if (sub === "desescoltar") {
      const embed = new ThemedEmbed().setTitle("\u{1F693} Escolta finalizada").setDescription(`${interaction.member} ha dejado de escoltar a ${target}.`).setColor("#f1c40f");
      await safeReply(interaction, { embeds: [embed], ephemeral: false });
    }
  }
});
