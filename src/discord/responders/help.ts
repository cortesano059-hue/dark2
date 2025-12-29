import { createResponder, ResponderType } from "#base";
import { generateHelpPayload } from "../../utils/helpUtils.js";

// Responder para el menú desplegable
createResponder({
    customId: "help/menu/:userId",
    types: [ResponderType.StringSelect],
    cache: "cached",
    async run(interaction, { userId }) {
        if (interaction.user.id !== userId) {
            await interaction.reply({ content: "❌ No puedes usar este menú.", ephemeral: true });
            return;
        }

        const category = interaction.values[0];
        const stats = {
            ping: Math.abs(interaction.client.ws.ping),
            totalCmds: interaction.client.application?.commands.cache.size || 36,
            version: "1.2.1",
            avatar: interaction.client.user?.displayAvatarURL()
        };

        const payload = await generateHelpPayload(interaction.client, interaction.user, category, 0, undefined, stats);
        await interaction.update(payload as any);
    }
});

// Responder para la navegación (paginación)
createResponder({
    customId: "help/nav/:category/:page/:userId",
    types: [ResponderType.Button],
    cache: "cached",
    async run(interaction, { category, page, userId }) {
        if (interaction.user.id !== userId) {
            await interaction.reply({ content: "❌ No puedes usar estos botones.", ephemeral: true });
            return;
        }

        const pageIndex = parseInt(page);
        const stats = {
            ping: Math.abs(interaction.client.ws.ping),
            totalCmds: interaction.client.application?.commands.cache.size || 36,
            version: "1.2.1",
            avatar: interaction.client.user?.displayAvatarURL()
        };

        const payload = await generateHelpPayload(interaction.client, interaction.user, category, pageIndex, undefined, stats);
        await interaction.update(payload as any);
    }
});
