import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
createCommand({
  name: "shop",
  description: "Abre la tienda del servidor.",
  type: ApplicationCommandType.ChatInput,
  async run(interaction) {
    if (!interaction.guildId) return;
    const { generateShopPayload } = await import(`../../../utils/shopUtils.js?t=${Date.now()}`);
    const payload = await generateShopPayload(interaction.guildId, 0, interaction.user.id);
    await safeReply(interaction, payload);
  }
});
