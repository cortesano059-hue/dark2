import {
  ApplicationCommandOptionType,
  InteractionReplyOptions,
  PermissionFlagsBits
} from "discord.js";
import { BackpackModel, saveBackpack } from "../../../../database/repositories/backpackRepo.js"; // Added BackpackModel just in case needing raw check

export const crear = {
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
        required: true,
      },
      {
        name: "usuario",
        description: "Dueño (solo tipo personal)",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
      {
        name: "rol",
        description: "Rol dueño (solo tipo rol)",
        type: ApplicationCommandOptionType.Role,
        required: false,
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
        description: "Descripción",
        type: ApplicationCommandOptionType.String,
        required: false
      }
    ],
  },
  async run(interaction: any): Promise<InteractionReplyOptions> {
    const member = interaction.member;
    // Admin check from user snippet logic implies admins use this command
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return { content: "❌ Solo administradores pueden crear mochilas.", ephemeral: true };
    }

    const tipo = interaction.options.getString("tipo", true);
    const nombre = interaction.options.getString("nombre", true);
    const targetUser = interaction.options.getUser("usuario");
    const targetRole = interaction.options.getRole("rol");
    const capacidad = interaction.options.getInteger("capacidad") || 10;
    const emoji = interaction.options.getString("emoji") || "🎒";
    const descripcion = interaction.options.getString("descripcion") || "";
    const guildId = interaction.guildId!;

    let ownerId = interaction.user.id;
    let accessType = "owner_only";
    let allowedRoles: string[] = [];
    let allowedUsers: string[] = [];

    if (tipo === "user") {
      if (targetUser) ownerId = targetUser.id;
      // Default owner_only
    } else if (tipo === "role") {
      if (!targetRole) return { content: "❌ Debes especificar un rol para mochilas de tipo Rol.", ephemeral: true };
      ownerId = targetRole.id;
      accessType = "custom";
      allowedRoles.push(targetRole.id); // Add the owner role to allowed roles so they can access it?
      // Actually, if ownerType is role, our logic for access might need to check if user has role.
      // But for now, adding to allowedRoles ensures compatibility with existing `listAccessibleBackpacks`.
    } else if (tipo === "system") {
      ownerId = "system"; // Virtual owner
      // accessType = "public"; // REMOVED
      accessType = "owner_only";
    }

    // Check uniqueness: user+name (or guild+name for system/role?)
    // Basic unique check: ownerId + name
    const existing = await BackpackModel.findOne({ guildId, ownerId, name: nombre });
    if (existing) {
      return { content: `❌ Ya existe la mochila **${nombre}** para este dueño (${tipo}).`, ephemeral: true };
    }

    await saveBackpack({
      id: "",
      ownerId: ownerId,
      ownerType: tipo as any,
      guildId: guildId,
      name: nombre,
      capacity: capacidad,
      emoji: emoji,
      description: descripcion,
      items: {},
      accessType: accessType as any,
      allowedRoles: allowedRoles,
      allowedUsers: allowedUsers
    });

    const ownerDisplay = tipo === 'user' ? `<@${ownerId}>` : tipo === 'role' ? `<@&${ownerId}>` : 'Sistema';

    return {
      content: `✅ Mochila **${nombre}** (${tipo}) creada.\nDueño: ${ownerDisplay}\nCapacidad: ${capacidad}`,
      ephemeral: true,
    };
  },
};
