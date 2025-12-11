import { createEvent } from "#base";
import { Events } from "discord.js";
import safeReply from "@src/utils/safeReply";
import logger from "@src/utils/logger";
import handleHelpMenu from "@src/handlers/helpMenuHandler";
import backpackAutocomplete from "@src/handlers/backpackAutocomplete";
import MyClient from "../structures/MyClient.js";

// Este evento maneja solo casos especiales que Constatic no cubre automáticamente
// Los comandos, botones y selectMenus normales son manejados por Constatic en bootstrap.ts
createEvent({
    name: "interactionCreateCustom",
    event: Events.InteractionCreate,
    async run(interaction) {
        try {
            const client = interaction.client as MyClient;

            // Autocomplete personalizado para backpack
            if (interaction.isAutocomplete()) {
                try {
                    return backpackAutocomplete.execute(interaction, client);
                } catch (err) {
                    logger.error(`🔴 Error en autocomplete:`, err);
                    return interaction.respond([]);
                }
            }

            // Manejo especial para el menú de ayuda (help-page-* y help-category-*)
            if (interaction.isButton() && interaction.customId.startsWith("help-page-")) {
                return handleHelpMenu(interaction, client);
            }

            if (interaction.isStringSelectMenu() && interaction.customId.startsWith("help-category-")) {
                return handleHelpMenu(interaction, client);
            }

            // El resto de interacciones (comandos, botones, selectMenus, modals) 
            // son manejados automáticamente por Constatic en bootstrap.ts
            // No necesitamos código adicional aquí

        } catch (err) {
            logger.error("🔴 Error crítico en InteractionCreate:", err);

            try {
                if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                    await safeReply(interaction, "❌ Error crítico en la interacción.");
                }
            } catch {
                /* Ignorar */
            }
        }
    }
});
