import { SlashCommandBuilder } from 'discord.js';
import eco from "@economy";
import safeReply from "@safeReply";
import ThemedEmbed from "@src/utils/ThemedEmbed";

export default {
    data: new SlashCommandBuilder()
        .setName('desescoltar')
        .setDescription('Detiene la escolta de un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
            .setDescription('Usuario')
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const policeRole = await eco.getPoliceRole(interaction.guild.id);

        if (!policeRole)
            return safeReply(interaction, "⚠️ No se ha configurado el rol de policía.");

        if (!interaction.member.roles.cache.has(policeRole))
            return safeReply(interaction, `❌ Necesitas el rol <@&${policeRole}>.`);

        const user = interaction.options.getMember("usuario");

        if (!user)
            return safeReply(interaction, "❌ Usuario no encontrado.");

        const embed = ThemedEmbed.success(
            "🚓 Escolta finalizada",
            `${interaction.user.tag} ha dejado de escoltar a ${user.user.tag}.`
        );

        return safeReply(interaction, { embeds: [embed] });
    }
};


