import {
  ApplicationCommandOptionType,
  PermissionFlagsBits
} from "discord.js";
import { BackpackModel, saveBackpack } from "../../../../database/repositories/backpackRepo.js";
const crear = {
  command: {
    name: "crear",
    description: "Crear una mochila",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      {
        name: "tipo",
        description: "Tipo de mochila",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "Personal", value: "user" },
          { name: "Rol (comunitaria)", value: "role" },
          { name: "Sistema", value: "system" }
        ]
      },
      {
        name: "nombre",
        description: "Nombre de la mochila",
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: "usuario",
        description: "Due\xF1o (solo tipo personal)",
        type: ApplicationCommandOptionType.User,
        required: false
      },
      {
        name: "rol",
        description: "Rol due\xF1o (solo tipo rol)",
        type: ApplicationCommandOptionType.Role,
        required: false
      },
      {
        name: "capacidad",
        description: "Capacidad",
        type: ApplicationCommandOptionType.Integer,
        required: false,
        minValue: 1
      },
      {
        name: "emoji",
        description: "Emoji",
        type: ApplicationCommandOptionType.String,
        required: false
      },
      {
        name: "descripcion",
        description: "Descripci\xF3n",
        type: ApplicationCommandOptionType.String,
        required: false
      }
    ]
  },
  async run(interaction) {
    const member = interaction.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return { content: "\u274C Solo administradores pueden crear mochilas.", ephemeral: true };
    }
    const tipo = interaction.options.getString("tipo", true);
    const nombre = interaction.options.getString("nombre", true);
    const targetUser = interaction.options.getUser("usuario");
    const targetRole = interaction.options.getRole("rol");
    const capacidad = interaction.options.getInteger("capacidad") || 10;
    const emoji = interaction.options.getString("emoji") || "\u{1F392}";
    const descripcion = interaction.options.getString("descripcion") || "";
    const guildId = interaction.guildId;
    let ownerId = interaction.user.id;
    let accessType = "owner_only";
    let allowedRoles = [];
    let allowedUsers = [];
    if (tipo === "user") {
      if (targetUser) ownerId = targetUser.id;
    } else if (tipo === "role") {
      if (!targetRole) return { content: "\u274C Debes especificar un rol para mochilas de tipo Rol.", ephemeral: true };
      ownerId = targetRole.id;
      accessType = "custom";
      allowedRoles.push(targetRole.id);
    } else if (tipo === "system") {
      ownerId = "system";
      accessType = "owner_only";
    }
    const existing = await BackpackModel.findOne({ guildId, ownerId, name: nombre });
    if (existing) {
      return { content: `\u274C Ya existe la mochila **${nombre}** para este due\xF1o (${tipo}).`, ephemeral: true };
    }
    await saveBackpack({
      id: "",
      ownerId,
      ownerType: tipo,
      guildId,
      name: nombre,
      capacity: capacidad,
      emoji,
      description: descripcion,
      items: {},
      accessType,
      allowedRoles,
      allowedUsers
    });
    const ownerDisplay = tipo === "user" ? `<@${ownerId}>` : tipo === "role" ? `<@&${ownerId}>` : "Sistema";
    return {
      content: `\u2705 Mochila **${nombre}** (${tipo}) creada.
Due\xF1o: ${ownerDisplay}
Capacidad: ${capacidad}`,
      ephemeral: true
    };
  }
};
export {
  crear
};
