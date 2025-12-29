import { Constatic, createEvent } from "#base";
import { GuildConfig } from "#database";
import { ApplicationCommandType } from "discord.js";
import { HybridInteraction } from "../../utils/hybridBridge.js";
createEvent({
  event: "messageCreate",
  name: "HybridCommandExecutor",
  async run(message) {
    if (message.author.bot || !message.guild) return;
    const config = await GuildConfig.findOne({ guildId: message.guildId });
    const prefix = config?.prefix || ".";
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;
    const app = Constatic.getInstance();
    const handler = app.commands.getHandler(ApplicationCommandType.ChatInput, commandName);
    if (!handler) return;
    const hybridInteraction = new HybridInteraction(message, commandName, args);
    try {
      let result;
      for (const run of handler) {
        if (typeof run !== "function") continue;
        result = await run.call({
          block() {
            throw new Error("Command execution blocked by framework logic.");
          }
        }, hybridInteraction, result);
      }
    } catch (err) {
      if (err.message !== "Command execution blocked by framework logic.") {
        console.error(`[Hybrid Engine Error] Comando: ${commandName}`, err);
      }
    }
  }
});
