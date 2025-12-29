import { createCommand } from "#base";
import { ApplicationCommandType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
createCommand({
  name: "reloadbot",
  description: "Recarga comandos, handlers y utils sin reiniciar (Owner Only).",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const { spawn } = await import("child_process");
      const embed = new EmbedBuilder().setTitle("\u{1F504} Reiniciando Sistema").setDescription(
        `El bot se est\xE1 reiniciando por completo.
\u2022 Se aplicar\xE1n cambios en **TODO** (handlers, utils, DB, etc).
\u2022 Tiempo estimado: **2-5 segundos**.

\u26A0\uFE0F **No apagues la terminal**, el proceso nuevo se iniciar\xE1 autom\xE1ticamente.`
      ).setColor("Orange").setTimestamp();
      await safeReply(interaction, { embeds: [embed] });
      setTimeout(() => {
        const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
        const subprocess = spawn(npmCmd, ["run", "dev"], {
          detached: true,
          stdio: "ignore",
          cwd: process.cwd()
        });
        subprocess.unref();
        process.exit(0);
      }, 1e3);
    } catch (err) {
      console.error("\u274C Error en auto-restart:", err);
      const errorEmbed = new EmbedBuilder().setTitle("\u274C Error al reiniciar").setDescription("No se pudo iniciar el nuevo proceso.").setColor("Red");
      await safeReply(interaction, { embeds: [errorEmbed] });
    }
  }
});
