import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
import { EconomyConfig } from "../../../config/economy.js";
import ms from "ms";
const { work: workConfig } = EconomyConfig;
const COOLDOWN = workConfig.cooldown;
const jobs = workConfig.jobs;
createCommand({
  name: "work",
  description: "Trabaja y gana dinero.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return;
    const balance = await eco.getBalance(userId, guildId);
    const now = Date.now();
    const cooldownEnd = Number(balance.workCooldown) || 0;
    if (cooldownEnd > now) {
      const remaining = Math.max(cooldownEnd - now, 1);
      const formatted = ms(remaining, { long: true });
      const embed2 = new ThemedEmbed(interaction).setTitle("\u274C \u23F3 Est\xE1s cansado").setColor("Red").setDescription(`Podr\xE1s volver a trabajar **en ${formatted}**.`);
      await interaction.editReply({ embeds: [embed2] });
      return;
    }
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const reward = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
    await eco.addMoney(userId, guildId, reward, "work");
    await eco.setWorkCooldown(userId, guildId, now + COOLDOWN);
    const embed = new ThemedEmbed(interaction).setTitle("\u{1F4BC} \xA1Has trabajado!").setColor("Green").setDescription(`${job.message} **${reward}$** \u{1F4B0}`);
    await interaction.editReply({ embeds: [embed] });
  }
});
