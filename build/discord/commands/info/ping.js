import { createCommand } from "#base";
import { ApplicationCommandType, EmbedBuilder } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import mongoose from "mongoose";
import os from "os";
createCommand({
  name: "ping",
  description: "Comprueba la latencia del bot y la salud del sistema.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    const start = Date.now();
    let dbPing = "0ms";
    try {
      await mongoose.connection.db?.admin().ping();
      dbPing = `${Date.now() - start}ms`;
    } catch (e) {
      dbPing = "Error";
    }
    const wsPing = Math.abs(interaction.client.ws.ping);
    let totalSeconds = (interaction.client.uptime || 0) / 1e3;
    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const embed = new EmbedBuilder().setColor(65535).setThumbnail(interaction.client.user?.displayAvatarURL() || null).addFields(
      { name: "Ping del Bot", value: `\u2503 \`${wsPing}ms\``, inline: true },
      { name: "Ping de la DB", value: `\u2503 \`${dbPing}\``, inline: true },
      { name: "Tiempo en L\xEDnea", value: `\u2503 \`${uptimeStr}\``, inline: true },
      { name: "Memoria RAM", value: `\u2503 \`${usedRam}MB / ${totalRam}GB\``, inline: true },
      { name: "Node.js", value: `\u2503 \`${process.version}\``, inline: true },
      { name: "Versi\xF3n Bot", value: `\u2503 \`1.2.1\``, inline: true }
    ).setFooter({
      text: `Estos tiempos de respuesta son aproximados \u2022 hoy a las ${(/* @__PURE__ */ new Date()).getHours()}:${(/* @__PURE__ */ new Date()).getMinutes().toString().padStart(2, "0")}`
    });
    await safeReply(interaction, { embeds: [embed] });
  }
});
