import { SlashCommandBuilder } from 'discord.js';
import safeReply from "@src/utils/safeReply";
import eco from "@economy";
import ThemedEmbed from "@src/utils/ThemedEmbed";

export default {
    data: new SlashCommandBuilder()
        .setName('esposar')
        .setDescription('Esposa a un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
            .setDescription('Usuario a esposar')
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const policeRole = await eco.getPoliceRole(guildId);

        if (!policeRole)
            return safeReply(interaction, "⚠️ No se ha configurado el rol de policía.");

        if (!interaction.member.roles.cache.has(policeRole))
            return safeReply(interaction, `❌ Necesitas el rol <@&${policeRole}>.`);

        const user = interaction.options.getMember('usuario');

        if (!user)
            return safeReply(interaction, "❌ Usuario no encontrado.");

        if (user.id === interaction.user.id)
            return safeReply(interaction, "❌ No puedes esposarte a ti mismo.");

        const embed = ThemedEmbed.success(
            "🔒 Usuario esposado",
            `${user.user.tag} ha sido esposado por ${interaction.user.tag}.`
        );

        return safeReply(interaction, { embeds: [embed] });
    }
};


