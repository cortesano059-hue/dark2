import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { ThemedEmbed } from "../../../utils/ThemedEmbed.js";
import * as eco from "../../../economy/index.js";
import { logger } from "../../../utils/logger.js";
import ms from "ms";
const BROKEN_BOTTLE = "Botella rota";
const COOLDOWN = 15e3;
createCommand({
  name: "basura",
  description: "Buscar en la basura.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return;
    const now = Date.now();
    const balance = await eco.getBalance(userId, guildId);
    const cooldownEnd = Number(balance.trashCooldown) || 0;
    if (cooldownEnd > now) {
      const remaining = Math.max(cooldownEnd - now, 1);
      const formatted = ms(remaining, { long: true });
      await safeReply(interaction, {
        content: `\u23F1\uFE0F Debes esperar ${formatted} antes de buscar otra vez.`
      });
      return;
    }
    await interaction.deferReply();
    await eco.setTrashCooldown(userId, guildId, now + COOLDOWN);
    try {
      const roll = Math.random();
      if (roll < 0.05) {
        let bottle = await eco.getItemByName(guildId, BROKEN_BOTTLE);
        if (!bottle) {
          bottle = await eco.createItem(guildId, {
            itemName: BROKEN_BOTTLE,
            description: "Una botella rota. Cuidado con los cortes.",
            price: 1e3,
            type: "trash",
            data: { broken: true }
          });
        }
        if (bottle) {
          await eco.addToInventory(userId, guildId, BROKEN_BOTTLE, 1);
        }
        await safeReply(interaction, {
          embeds: [
            new ThemedEmbed(interaction).setTitle("\u{1FA78} \xA1Te has cortado!").setDescription(
              `Encontraste una **botella rota** y te hiciste da\xF1o.

La botella fue a\xF1adida a tu inventario.`
            ).setColor("#c0392b")
          ]
        });
        return;
      }
      if (roll < 0.35) {
        logger.info(`${interaction.user.tag} no encontr\xF3 nada`, "Basura");
        await safeReply(interaction, {
          embeds: [
            new ThemedEmbed(interaction).setDescription("\u{1F5D1}\uFE0F No encontraste nada \xFAtil esta vez.").setColor("#7f8c8d")
          ]
        });
        return;
      }
      const lootTable = [
        { name: "Botellas", min: 10, max: 50 },
        { name: "Monedas antiguas", min: 20, max: 120 },
        { name: "Chatarra valiosa", min: 50, max: 200 },
        { name: "Latas", min: 5, max: 25 },
        { name: "Tapones", min: 3, max: 15 },
        { name: "Restos de metal", min: 20, max: 80 }
      ];
      const loot = lootTable[Math.floor(Math.random() * lootTable.length)];
      const reward = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      await eco.addMoney(userId, guildId, reward, "basura");
      await safeReply(interaction, {
        embeds: [
          ThemedEmbed.success(
            "B\xFAsqueda Terminada",
            `Encontraste **${loot.name}** y ganaste **$${reward}**.`
          )
        ]
      });
    } catch (err) {
      logger.error(`Error ejecutando /basura: ${err}`, "Basura");
      await safeReply(interaction, {
        content: "\u274C Ocurri\xF3 un error al ejecutar el comando."
      });
    }
  }
});
