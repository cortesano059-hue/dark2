import { createCommand } from "#base";
import { ApplicationCommandType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
// Child process is imported dynamically



createCommand({
    name: "reloadbot",
    description: "Recarga comandos, handlers y utils sin reiniciar (Owner Only).",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    async run(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const { spawn } = await import("child_process");

            const embed = new EmbedBuilder()
                .setTitle("🔄 Reiniciando Sistema")
                .setDescription(
                    `El bot se está reiniciando por completo.\n` +
                    `• Se aplicarán cambios en **TODO** (handlers, utils, DB, etc).\n` +
                    `• Tiempo estimado: **2-5 segundos**.\n\n` +
                    `⚠️ **No apagues la terminal**, el proceso nuevo se iniciará automáticamente.`
                )
                .setColor("Orange")
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });

            // Give a moment for the reply to send
            setTimeout(() => {
                // Spawn new process independent of this one
                // Use 'npm.cmd' on Windows, 'npm' on Linux
                const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

                const subprocess = spawn(npmCmd, ["run", "dev"], {
                    detached: true,
                    stdio: "ignore",
                    cwd: process.cwd()
                });

                subprocess.unref();
                process.exit(0);
            }, 1000);

        } catch (err) {
            console.error("❌ Error en auto-restart:", err);
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Error al reiniciar")
                .setDescription("No se pudo iniciar el nuevo proceso.")
                .setColor("Red");

            await safeReply(interaction, { embeds: [errorEmbed] });
        }
    }
});
