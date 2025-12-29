import { MessageFlags } from "discord.js";
async function safeReply(interaction, payload) {
  if (!payload) return;
  let data;
  if (typeof payload === "string") {
    data = { content: payload, ephemeral: true };
  } else {
    data = { ...payload };
    if (data.ephemeral === void 0) data.ephemeral = true;
  }
  if (data.ephemeral && !data.flags) {
    data.flags = MessageFlags.Ephemeral;
  }
  try {
    if (!interaction) {
      console.error("\u274C safeReply: Interacci\xF3n nula");
      return;
    }
    if (interaction.replied) {
      return await interaction.followUp(data);
    }
    if (interaction.deferred) {
      return await interaction.editReply(data);
    }
    return await interaction.reply(data);
  } catch (err) {
    if (err.code !== 10062 && err.code !== 40060) {
      console.error("\u26A0\uFE0F Error en safeReply:", err.message);
      if (err.errors) console.error("\u{1F50D} Detalle errores:", JSON.stringify(err.errors, null, 2));
    }
  }
}
export {
  safeReply
};
