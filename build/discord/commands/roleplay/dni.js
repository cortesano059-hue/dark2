import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { Dni } from "../../../database/index.js";
createCommand({
  name: "dni",
  description: "Sistema de DNI.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "crear",
      description: "Crea tu DNI.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "nombre", description: "Nombre", type: ApplicationCommandOptionType.String, required: true },
        { name: "apellido", description: "Apellido", type: ApplicationCommandOptionType.String, required: true },
        { name: "edad", description: "Edad", type: ApplicationCommandOptionType.Integer, required: true },
        { name: "nacionalidad", description: "Nacionalidad", type: ApplicationCommandOptionType.String, required: true },
        { name: "psid", description: "ID PlayStation", type: ApplicationCommandOptionType.String, required: true }
      ]
    },
    {
      name: "ver",
      description: "Muestra tu DNI o el de otro.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "usuario", description: "Usuario", type: ApplicationCommandOptionType.User }
      ]
    },
    {
      name: "borrar",
      description: "Borra tu DNI.",
      type: ApplicationCommandOptionType.Subcommand
    }
  ],
  async run(interaction) {
    if (!interaction.guildId) return;
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    if (sub === "crear") {
      const existing = await Dni.findOne({ userId, guildId });
      if (existing) {
        await safeReply(interaction, "\u274C Ya tienes DNI.");
        return;
      }
      const dniNumber = Math.floor(1e7 + Math.random() * 9e7).toString();
      await Dni.create({
        userId,
        guildId,
        dni: dniNumber,
        nombre: interaction.options.getString("nombre", true),
        apellido: interaction.options.getString("apellido", true),
        edad: interaction.options.getInteger("edad", true),
        nacionalidad: interaction.options.getString("nacionalidad", true),
        psid: interaction.options.getString("psid", true)
      });
      await safeReply(interaction, `\u2705 Tu DNI ha sido creado.
\u{1F194} DNI: **${dniNumber}**`);
    }
    if (sub === "ver") {
      const target = interaction.options.getUser("usuario") || interaction.user;
      const data = await Dni.findOne({ userId: target.id, guildId });
      if (!data) {
        await safeReply(interaction, `\u274C ${target.username} no tiene DNI.`);
        return;
      }
      const embed = new ThemedEmbed().setTitle("\u{1FAAA} \u2503 Documento Nacional").setThumbnail(target.displayAvatarURL()).addFields(
        { name: "\u{1F522} N\xBA Dni:", value: data.dni, inline: false },
        { name: "\u{1FAAA} Nombre:", value: data.nombre, inline: true },
        { name: "\u{1FAAA} Apellido:", value: data.apellido, inline: true },
        { name: "\u{1F382} Edad:", value: data.edad.toString(), inline: true },
        { name: "\u{1F30D} Nacionalidad:", value: data.nacionalidad, inline: true },
        { name: "\u{1F3AE} ID:", value: data.psid, inline: false }
      ).setFooter({ text: `Usuario: ${target.username}` });
      await safeReply(interaction, { embeds: [embed] });
    }
    if (sub === "borrar") {
      const res = await Dni.findOneAndDelete({ userId, guildId });
      if (!res) {
        await safeReply(interaction, "\u274C No tienes DNI.");
      } else {
        await safeReply(interaction, "\u2705 DNI eliminado.");
      }
    }
  }
});
