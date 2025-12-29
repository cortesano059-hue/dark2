import { createCommand } from "#base";
import { GuildConfig } from "#database";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";

createCommand({
    name: "removeincome",
    description: "Elimina el sueldo asignado a un rol.",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: "rol",
            description: "Rol al que deseas quitar el sueldo.",
            type: ApplicationCommandOptionType.Role,
            required: true
        }
    ],
    async run(interaction) {
        const guildId = interaction.guildId;
        const role = interaction.options.getRole("rol");
        if (!role || !guildId) return;

        const res = await GuildConfig.updateOne(
            { guildId },
            { $pull: { incomeRoles: { roleId: role.id } } }
        );

        const removed = res.modifiedCount > 0;

        if (!removed) {
            await safeReply(interaction, "❌ Ese rol no tenía un sueldo configurado.");
            return;
        }

        await safeReply(interaction, `🗑️ Se eliminó el sueldo del rol **${role.name}**.`);
    }
});
