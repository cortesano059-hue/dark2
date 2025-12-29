import { createCommand } from "#base";
import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import { generateHelpPayload } from "../../../utils/helpUtils.js";

createCommand({
    name: "help",
    description: "Muestra el menú de ayuda.",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "comando",
            description: "Comando específico del que quieres ver ayuda.",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    async run(interaction) {
        const commandName = interaction.options.getString("comando") || undefined;

        const stats = {
            ping: Math.abs(interaction.client.ws.ping),
            totalCmds: interaction.client.application?.commands.cache.size || 36,
            version: "1.2.1",
            avatar: interaction.client.user?.displayAvatarURL()
        };

        const payload = await generateHelpPayload(interaction.client, interaction.user, undefined, 0, commandName, stats);

        await safeReply(interaction, payload as any);
    }
});
