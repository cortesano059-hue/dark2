import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { getPoliceRole } from "../../../economy/index.js";

createCommand({
    name: "policia",
    description: "Comandos de policía.",
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

        // Check Police Role
        const policeRole = await getPoliceRole(guildId);
        if (!policeRole) {
            await safeReply(interaction, "⚠️ No se ha configurado el rol de policía.");
            return;
        }

        // Check if executor has role
        // @ts-ignore
        if (!interaction.member.roles.cache.has(policeRole)) {
            await safeReply(interaction, `❌ Necesitas el rol <@&${policeRole}>.`);
            return;
        }

        if (!target) {
            await safeReply(interaction, "❌ Usuario no encontrado.");
            return;
        }

        if (target.id === interaction.user.id) {
            await safeReply(interaction, "❌ No puedes aplicarte esto a ti mismo.");
            return;
        }

        if (sub === "esposar") {
            const embed = new ThemedEmbed()
                .setTitle("🔒 Usuario esposado")
                .setDescription(`${target} ha sido esposado por ${interaction.member}.`)
                .setColor("#e74c3c");
            await safeReply(interaction, { embeds: [embed], ephemeral: false });
        }

        if (sub === "desesposar") {
            const embed = new ThemedEmbed() // check if success color is better
                .setTitle("🔓 Usuario liberado")
                .setDescription(`${target} ya no está esposado.`)
                .setColor("#2ecc71");
            await safeReply(interaction, { embeds: [embed], ephemeral: false });
        }

        if (sub === "escoltar") {
            const embed = new ThemedEmbed()
                .setTitle("🚓 Escolta iniciada")
                .setDescription(`${interaction.member} ha comenzado a escoltar a ${target}.`)
                .setColor("#f1c40f");
            await safeReply(interaction, { embeds: [embed], ephemeral: false });
        }

        if (sub === "desescoltar") {
            // Logic not seen but assumed similar
            const embed = new ThemedEmbed()
                .setTitle("🚓 Escolta finalizada")
                .setDescription(`${interaction.member} ha dejado de escoltar a ${target}.`)
                .setColor("#f1c40f");
            await safeReply(interaction, { embeds: [embed], ephemeral: false });
        }
    }
});
