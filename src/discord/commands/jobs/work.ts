import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import safeReply from "@src/utils/safeReply";
import ThemedEmbed from "@src/utils/ThemedEmbed";
import eco from "@economy";
import ms from "ms";
import { getEconomyConfig } from "@economyConfig";
import MyClient from "@structures/MyClient.js";

const { work: workConfig } = getEconomyConfig();
const COOLDOWN = workConfig.cooldown;
const jobs = workConfig.jobs;

export default {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Trabaja y gana dinero."),

    async execute(interaction: ChatInputCommandInteraction, client: MyClient): Promise<void> {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild!.id;

        const balance = await eco.getBalance(userId, guildId);
        const now = Date.now();
        const cooldownEnd = Number(balance.workCooldown) || 0;

        if (cooldownEnd > now) {
            const remaining = Math.max(cooldownEnd - now, 1);
            const formatted = ms(remaining, { long: true });

            const embed = new ThemedEmbed(interaction)
                .setTitle("❌ ⏳ Estás cansado")
                .setColor("Red" as any)
                .setDescription(`Podrás volver a trabajar **en ${formatted}**.`);

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const reward = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        await eco.addMoney(userId, guildId, reward, 'work');
        await eco.setWorkCooldown(userId, guildId, now + COOLDOWN);

        const embed = new ThemedEmbed(interaction)
            .setTitle("💼 ¡Has trabajado!")
            .setColor("Green" as any)
            .setDescription(`${job.message} **${reward}$** 💰`);

        await interaction.editReply({ embeds: [embed] });
        return;
    },
};

