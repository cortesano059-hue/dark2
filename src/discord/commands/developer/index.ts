import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { DutyStatus, User } from "../../../database/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";

createCommand({
    name: "developer",
    description: "Comandos de desarrollador.",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: ["Administrator"], // Using string or bitfield
    options: [
        {
            name: "offdutyall",
            description: "Saca de servicio a todos los usuarios.",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: "getids",
            description: "Obtiene IDs de configuración (roles, canales, etc).",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: "list",
            description: "Lista todos los comandos cargados.",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: "clear",
            description: "Borra los comandos slash del servidor actual.",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    async run(interaction) {
        if (!interaction.guildId) return;
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // Double check admin just in case
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await safeReply(interaction, "❌ No tienes permisos.");
            return;
        }

        if (sub === "offdutyall") {
            const allDuty = await DutyStatus.find({ guildId });
            if (allDuty.length === 0) {
                await safeReply(interaction, "⚠️ No hay usuarios en servicio.");
                return;
            }

            let results = [];
            const now = new Date(); // Current time object

            for (const status of allDuty) {
                const startTime = new Date(status.startTime);
                const minutesWorked = Math.floor((now.getTime() - startTime.getTime()) / 60000);

                if (minutesWorked < 10) {
                    results.push(`⏱️ <@${status.userId}> estuvo **${minutesWorked} min** → ❌ Sin pago (menos de 10 min)`);
                    await DutyStatus.deleteOne({ userId: status.userId, guildId });
                    continue;
                }

                const config = await GuildConfig.findOne({ guildId }).lean();
                const incomeRole = config?.incomeRoles?.find(r => r.roleId === status.roleId);
                if (!incomeRole) {
                    results.push(`⚠️ <@${status.userId}> no tiene salario asignado.`);
                    await DutyStatus.deleteOne({ userId: status.userId, guildId });
                    continue;
                }

                const perMinute = incomeRole.incomePerHour / 60;
                const payment = Math.round(perMinute * minutesWorked);

                await User.findOneAndUpdate(
                    { userId: status.userId, guildId },
                    { $inc: { bank: payment } },
                    { upsert: true }
                );

                results.push(`💵 <@${status.userId}> trabajó **${minutesWorked} min** → Pagado **$${payment}**`);
                await DutyStatus.deleteOne({ userId: status.userId, guildId });
            }

            await safeReply(interaction, {
                embeds: [
                    new ThemedEmbed().setTitle("📢 Todos fuera de servicio")
                        .setDescription(results.join("\n").slice(0, 4000))
                        .setColor("#e74c3c")
                ]
            });
        }

        if (sub === "getids") {
            const channel = interaction.channel;
            const guild = interaction.guild;

            const txt = `
**Guild ID:** \`${guildId}\`
**Channel ID:** \`${channel?.id}\`
**User ID:** \`${interaction.user.id}\`
            `;
            await safeReply(interaction, {
                embeds: [
                    new ThemedEmbed().setTitle("🆔 IDs").setDescription(txt)
                ]
            });
        }

        if (sub === "list") {
            const sortedMap = new Map([...interaction.client.commands.entries()].sort());
            const list = [...sortedMap.keys()].map(name => `\`/${name}\``).join(", ");

            await safeReply(interaction, {
                embeds: [
                    new ThemedEmbed()
                        .setTitle(`📜 Comandos (${sortedMap.size})`)
                        .setDescription(list || "No hay comandos cargados.")
                ]
            });
        }

        if (sub === "clear") {
            await safeReply(interaction, "🧹 Borrando comandos de este servidor...");
            await interaction.guild?.commands.set([]);
            await interaction.followUp({ content: "✅ Comandos borrados del servidor (cache local no afectada).", ephemeral: true });
        }
    }
});
