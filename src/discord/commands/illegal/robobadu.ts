import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { BadulaqueLocalCooldown, GuildConfig } from "../../../database/index.js";
import { addToInventory, getPoliceRole, getUser } from "../../../economy/index.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";

const USER_CD = 15 * 60 * 1000;
const BADU_CD = 30 * 60 * 1000;
const BADUS = ["central", "casino", "rojo", "verde", "licoreria"];

function formatTime(ms: number) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
}

createCommand({
    name: "robobadu",
    description: "Robo a un badulaque.",
    type: ApplicationCommandType.ChatInput,
    options: BADUS.map(b => ({
        name: b,
        description: `Robo al Badulaque ${b.charAt(0).toUpperCase() + b.slice(1)}`,
        type: ApplicationCommandOptionType.Subcommand
    })),
    async run(interaction) {
        if (!interaction.guildId) return;
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const now = Date.now();

        if (!BADUS.includes(sub)) {
            await safeReply(interaction, { content: "❌ Badulaque inválido.", ephemeral: true });
            return;
        }

        const user = await getUser(userId, guildId);
        if (!user) {
            await safeReply(interaction, { content: "❌ Error al obtener tu perfil.", ephemeral: true });
            return;
        }
        // @ts-ignore
        const userCd = user.robobadu_cooldown || 0;

        if (userCd > now) {
            await safeReply(interaction, {
                content: `⏳ Debes esperar **${formatTime(userCd - now)}** para volver a robar.`,
                ephemeral: true
            });
            return;
        }

        const guildConfig = await GuildConfig.findOne({ guildId }).lean();
        const cfg = guildConfig?.badulaques?.find(b => b.key === sub);

        if (!cfg) {
            await safeReply(interaction, {
                content: "❌ Este badulaque no está configurado.",
                ephemeral: true
            });
            return;
        }

        let baduCd = await BadulaqueLocalCooldown.findOne({ guildId, key: sub });
        if (!baduCd) {
            baduCd = await BadulaqueLocalCooldown.create({
                guildId, key: sub, cooldownUntil: 0
            });
        }

        if (baduCd.cooldownUntil > now) {
            await safeReply(interaction, {
                content: `🏪 Este badulaque está en enfriamiento.\n⏳ Disponible en **${formatTime(baduCd.cooldownUntil - now)}**`,
                ephemeral: true
            });
            return;
        }

        // Apply Cooldowns
        // @ts-ignore
        user.robobadu_cooldown = now + USER_CD;
        await user.save();

        baduCd.cooldownUntil = now + BADU_CD;
        await baduCd.save();

        // Reward
        await addToInventory(userId, guildId, cfg.reward.itemName, cfg.reward.amount);

        // Notify Police
        const policeRoleId = await getPoliceRole(guildId);
        const policePing = policeRoleId ? `<@&${policeRoleId}>` : null;

        const embed = new ThemedEmbed()
            .setTitle("🚨 ROBO EN BADULAQUE")
            .setColor("#E74C3C")
            .setDescription(`🕵️ **Robo al Badulaque ${sub.toUpperCase()}**`)
            .addFields(
                { name: "📍 Ubicación", value: `Badulaque ${sub}`, inline: true },
                { name: "💰 Botín", value: `${cfg.reward.amount}x ${cfg.reward.itemName}`, inline: true }
            );

        if (cfg.image) embed.setImage(cfg.image);

        const content = policePing
            ? `${policePing}\n🚓 **Robo en curso**`
            : `🚓 **Robo en curso**`;

        await safeReply(interaction, {
            content,
            embeds: [embed],
            allowedMentions: policeRoleId ? { roles: [policeRoleId] } : {}
        });
    }
});
