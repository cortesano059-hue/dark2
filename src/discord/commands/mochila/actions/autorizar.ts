import { BackpackModel } from "../../../../database/repositories/backpackRepo.js";
import { InteractionReplyOptions, PermissionFlagsBits } from "discord.js";
import { ThemedEmbed } from "../../../../utils/ThemedEmbed.js";

function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const autorizar = {
    command: {
        name: "autorizar",
        description: "Gestionar acceso a una mochila",
        type: 1, // Subcommand
        options: [
            { name: "mochila", description: "Nombre de la mochila", type: 3, required: true, autocomplete: true },
            {
                name: "accion",
                description: "Añadir o quitar permiso",
                type: 3,
                required: true,
                choices: [
                    { name: "Añadir", value: "add" },
                    { name: "Quitar", value: "remove" }
                ]
            },
            { name: "usuario", description: "Usuario a gestionar", type: 6 },
            { name: "rol", description: "Rol a gestionar", type: 8 },
            { name: "admin", description: "Modo admin (ignora propiedad)", type: 5 }
        ]
    },
    async run(interaction: any): Promise<InteractionReplyOptions> {
        const mochilaName = interaction.options.getString("mochila", true);
        const accion = interaction.options.getString("accion", true); // add | remove
        const targetUser = interaction.options.getUser("usuario");
        const targetRole = interaction.options.getRole("rol");
        const adminFlag = interaction.options.getBoolean("admin") === true;
        const guildId = interaction.guildId;
        const member = interaction.member;

        if (!guildId) return { content: "❌ Error de servidor.", ephemeral: true };

        if (!targetUser && !targetRole) {
            return { content: "❌ Debes indicar un usuario o un rol.", ephemeral: true };
        }

        // Search logic:
        // 1. Try to find one owned by the executor (most common case).
        // 2. If not found and IS ADMIN, try to find any backpack with that name (loose search).

        const regex = new RegExp(`^${escapeRegex(mochilaName)}$`, "i");

        // Priority 1: Owned by user
        let bp = await BackpackModel.findOne({ ownerId: interaction.user.id, name: regex });

        // Priority 2: Global search (only if admin because it might pick someone else's)
        if (!bp && (member.permissions.has(PermissionFlagsBits.Administrator) || adminFlag)) {
            // Try to find ANY backpack with this name. 
            // Note: If multiple exist, this is ambiguous. Dark legacy behavior implies unique names or "first found".
            bp = await BackpackModel.findOne({ name: regex });
        }

        if (!bp) return { content: "❌ Mochila no encontrada.", ephemeral: true };

        // Permission check
        const isOwner = bp.ownerId === interaction.user.id;
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isOwner && !(isAdmin && adminFlag)) {
            return { content: "❌ No tienes permisos para autorizar en esta mochila.", ephemeral: true };
        }

        if (accion === "add") bp.accessType = "custom";

        let changes = [];

        if (targetUser) {
            const id = targetUser.id;
            if (accion === "add") {
                if (!bp.allowedUsers.includes(id)) {
                    bp.allowedUsers.push(id);
                    changes.push(`Usuario ${targetUser} añadido.`);
                }
            } else {
                bp.allowedUsers = bp.allowedUsers.filter((u: string) => u !== id);
                changes.push(`Usuario ${targetUser} eliminado.`);
            }
        }

        if (targetRole) {
            const id = targetRole.id;
            if (accion === "add") {
                if (!bp.allowedRoles.includes(id)) {
                    bp.allowedRoles.push(id);
                    changes.push(`Rol ${targetRole} añadido.`);
                }
            } else {
                bp.allowedRoles = bp.allowedRoles.filter((r: string) => r !== id);
                changes.push(`Rol ${targetRole} eliminado.`);
            }
        }

        if (bp.allowedUsers.length === 0 && bp.allowedRoles.length === 0) {
            bp.accessType = "owner_only";
        }

        // Fix legacy backpacks without guildId
        if (!(bp as any).guildId) {
            (bp as any).guildId = guildId;
        }

        await bp.save();

        return {
            embeds: [
                ThemedEmbed.success(
                    "Permisos Actualizados",
                    `Mochila: **${bp.name}**\n${changes.join("\n") || "Sin cambios."}`
                )
            ],
            ephemeral: true
        };
    }
};
