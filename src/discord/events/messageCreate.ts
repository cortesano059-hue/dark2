import { Constatic, createEvent } from "#base";
import { GuildConfig } from "#database";
import { ApplicationCommandType } from "discord.js";
import { HybridInteraction } from "../../utils/hybridBridge.js";

createEvent({
    event: "messageCreate",
    name: "HybridCommandExecutor",
    async run(message) {
        // Ignorar bots y mensajes fuera de servidores
        if (message.author.bot || !message.guild) return;

        // Obtener prefijo de la base de datos (o usar el por defecto)
        const config = await GuildConfig.findOne({ guildId: message.guildId });
        const prefix = config?.prefix || ".";

        // Verificar si el mensaje empieza por el prefijo
        if (!message.content.startsWith(prefix)) return;

        // Limpiar contenido y separar comando de argumentos
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const app = Constatic.getInstance();

        // Obtener el handler del comando (asumimos ChatInput para prefijos)
        const handler = app.commands.getHandler(ApplicationCommandType.ChatInput, commandName);

        if (!handler) return;

        // Crear la interacción virtual (Bridge)
        const hybridInteraction = new HybridInteraction(message, commandName, args);

        // Ejecutar los runners del comando
        try {
            let result;
            // El framework Constatic permite múltiples runners por comando (middleware + run)
            for (const run of handler) {
                if (typeof run !== "function") continue;

                // Ejecutamos el runner pasando nuestro Bridge como 'interaction'
                result = await run.call({
                    block() {
                        // Simular el comportamiento de 'block' del framework
                        throw new Error("Command execution blocked by framework logic.");
                    }
                }, hybridInteraction as any, result);
            }
        } catch (err: any) {
            // Manejar errores de ejecución (puedes añadir logs o respuestas de error aquí)
            if (err.message !== "Command execution blocked by framework logic.") {
                console.error(`[Hybrid Engine Error] Comando: ${commandName}`, err);
            }
        }
    }
});
