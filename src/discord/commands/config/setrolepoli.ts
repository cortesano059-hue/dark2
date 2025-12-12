import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import safeReply from "@safeReply";
import eco from "@economy";
import MyClient from "@structures/MyClient.js";

export default {
    data: new SlashCommandBuilder()
        .setName("setrolepoli")
        .setDescription("Establece el rol requerido para los comandos policiales.")
        .addRoleOption(o =>
            o.setName("rol")
                .setDescription("Rol de policía")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient): Promise<void> {
        const guildId = interaction.guild?.id;
        if (!guildId) {
            return safeReply(interaction, "❌ No se pudo identificar el servidor.");
        }

        const role = interaction.options.getRole("rol", true);

        await eco.setPoliceRole(guildId, role.id);

        return safeReply(interaction, {
            content: `✅ El rol de policía se ha establecido como <@&${role.id}>`
        });
    }
};


