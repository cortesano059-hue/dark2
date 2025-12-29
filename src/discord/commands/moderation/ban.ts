import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";

createCommand({
    name: "ban",
    description: "Banear usuario.",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    options: [
        {
            name: "target",
            description: "Usuario",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "razon",
            description: "Motivo",
            type: ApplicationCommandOptionType.String
        }
    ],
    async run(interaction) {
        if (!interaction.guild) return;

        const target = interaction.options.getMember("target");
        if (!target) {
            await safeReply(interaction, {
                embeds: [ThemedEmbed.error('Usuario no encontrado', '❌ No se pudo encontrar al usuario especificado.')]
            });
            return;
        }

        // Check if bannable
        if (!target.bannable) {
            await safeReply(interaction, {
                embeds: [ThemedEmbed.error('Error', '❌ No puedo banear a este usuario (jerarquía o permisos).')]
            });
            return;
        }

        try {
            await target.ban({ reason: interaction.options.getString("razon") || "Sin motivo" });

            const embed = ThemedEmbed.success('Usuario Baneado', `✅ ${target.user.tag} ha sido baneado.`)
                .setFooter({ text: `Acción ejecutada por ${interaction.user.username}` })
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });
        } catch (e) {
            console.error(e);
            await safeReply(interaction, {
                embeds: [ThemedEmbed.error('Error', '❌ Ocurrió un error al banear.')]
            });
        }
    }
});
