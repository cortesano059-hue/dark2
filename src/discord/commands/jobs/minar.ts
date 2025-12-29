import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { addMoney, getMiningConfig, getMiningCooldown, hasItem, setMiningCooldown } from "../../../economy/index.js";
import { MINING_CONFIG, chance, formatTime, pickRarity, random } from "../../../economy/miningRules.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import { safeReply } from "../../../utils/safeReply.js";

createCommand({
    name: "minar",
    description: "Minar minerales y obtener dinero.",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        if (!interaction.guildId || !interaction.member) return;
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        const cd = await getMiningCooldown(userId, guildId);
        if (cd > Date.now()) {
            await safeReply(interaction, {
                embeds: [new ThemedEmbed().setTitle("⏳ Minería en cooldown").setDescription(`Debes esperar **${formatTime(cd - Date.now())}**.`)]
            });
            return;
        }

        const config = await getMiningConfig(guildId);

        if (config?.requireType === "role") {
            // @ts-ignore
            if (!interaction.member.roles.cache.has(config.requireId)) {
                // Debug info in error
                await safeReply(interaction, `❌ No tienes el rol necesario para minar.\nRequerido: <@&${config.requireId}> (ID: ${config.requireId})`);
                return;
            }
        }

        if (config?.requireType === "item") {
            const ok = await hasItem(userId, guildId, config.requireId, 1);
            if (!ok) {
                await safeReply(interaction, "❌ Necesitas un pico (item) para minar.");
                return;
            }
        }

        let totalMoney = 0;
        let lines = [];

        // @ts-ignore
        for (const [name, data] of Object.entries(MINING_CONFIG.minerals)) {
            // @ts-ignore
            if (!chance(data.chance)) continue;

            const rarity = pickRarity(MINING_CONFIG.rarities);
            // @ts-ignore
            const qtyBase = random(data.quantity[0], data.quantity[1]);
            // @ts-ignore
            const qtyFinal = Math.max(1, Math.floor(qtyBase * MINING_CONFIG.rarities[rarity].multiplier));

            // @ts-ignore
            const earned = qtyFinal * data.price;
            totalMoney += earned;

            lines.push(`⛏️ **${name}** (${rarity}) × ${qtyFinal} → **${earned}$**`);
        }

        await setMiningCooldown(userId, guildId, Date.now() + MINING_CONFIG.cooldown);

        if (!totalMoney) {
            await safeReply(interaction, {
                embeds: [new ThemedEmbed().setTitle("⛏️ Minería").setColor("Grey").setDescription("No has encontrado nada.")]
            });
            return;
        }

        await addMoney(userId, guildId, totalMoney, "mining");

        const embed = new ThemedEmbed()
            .setTitle("⛏️ Resultado")
            .setColor("Gold")
            .setDescription(lines.join("\n"))
            .addFields({ name: "💰 Total ganado", value: `**${totalMoney}$**` })
            .setFooter({ text: `Cooldown: ${formatTime(MINING_CONFIG.cooldown)}` });

        await safeReply(interaction, { embeds: [embed] });
    }
});
