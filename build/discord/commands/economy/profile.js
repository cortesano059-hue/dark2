import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
createCommand({
  name: "profile",
  description: "Muestra tu perfil econ\xF3mico o el de otro usuario.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "usuario",
      description: "Usuario del que ver el perfil",
      type: ApplicationCommandOptionType.User,
      required: false
    }
  ],
  async run(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("usuario") || interaction.user;
    const guildId = interaction.guildId;
    if (!guildId) return;
    const balance = await eco.getBalance(user.id, guildId);
    if (!balance) {
      await safeReply(interaction, "\u274C No se pudo obtener el perfil.");
      return;
    }
    const money = balance.money ?? 0;
    const bank = balance.bank ?? 0;
    const dailyCooldown = Number(balance.dailyClaim) || 0;
    const workCooldown = Number(balance.workCooldown) || 0;
    const embed = new ThemedEmbed(interaction).setTitle(`\u{1F4D8} Perfil de ${user.username}`).setDescription(`Informaci\xF3n econ\xF3mica del usuario`).addFields(
      {
        name: "\u{1F4B5} Dinero en mano",
        value: `$${money.toLocaleString()}`,
        inline: true
      },
      {
        name: "\u{1F3E6} Banco",
        value: `$${bank.toLocaleString()}`,
        inline: true
      },
      {
        name: "\u23F3 Cooldowns",
        value: `**Daily:** ${dailyCooldown === 0 ? "Disponible" : `<t:${Math.floor(dailyCooldown / 1e3)}:R>`}
**Work:** ${workCooldown === 0 ? "Disponible" : `<t:${Math.floor(workCooldown / 1e3)}:R>`}`
      }
    );
    await safeReply(interaction, { embeds: [embed] });
  }
});
