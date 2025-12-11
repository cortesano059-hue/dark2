import "tsx";
import { REST, Routes } from "discord.js";
import { env } from "../../src/env.js";
import { Constatic } from "../../src/discord/base/app.js";
import { join } from "node:path";
import { glob } from "glob";

// --------------------------------------------------------
// CARGAR TODA LA ESTRUCTURA DE COMANDOS (index.ts + módulos)
// --------------------------------------------------------

async function loadAllCommands() {
    const app = Constatic.getInstance();
    const workdir = join(process.cwd(), "src");

    // Cargar index.ts de Discord
    try {
        await import(`file://${join(workdir, "discord/index.ts")}`);
    } catch {
        try {
            await import(`file://${join(workdir, "discord/index.js")}`);
        } catch {}
    }

    // Cargar todos los módulos
    const files = glob.sync("discord/**/*.{ts,js}", {
        cwd: workdir,
        absolute: true,
        ignore: ["discord/base/**"]
    });

    let createCommand: any = null;

    // obtenemos createCommand desde index.ts (Constatic creators)
    const discordIndex = await import(`file://${join(workdir, "discord/index.ts")}`);
    createCommand = discordIndex.createCommand;

    for (const filePath of files) {
        try {
            const module = await import(`file://${filePath}`);
            let cmd = null;

            if (module.default && module.default.data && module.default.execute)
                cmd = module.default;

            if (!cmd && module.command)
                cmd = module.command;

            if (!cmd && module.data && module.execute)
                cmd = { data: module.data, execute: module.execute };

            if (cmd) {
                const json = cmd.data.toJSON();

                createCommand({
                    name: json.name,
                    description: json.description || "",
                    options: json.options || [],
                    run: cmd.execute
                });
            }
        } catch {}
    }

    return Constatic.getInstance().commands.build();
}

// --------------------------------------------------------
// DEPLOY
// --------------------------------------------------------

async function deploy() {
    console.log("📦 Cargando comandos...");

    const commands = await loadAllCommands();

    console.log(`📌 Comandos encontrados: ${commands.length}`);
    console.log(commands.map(c => ` - ${c.name}`).join("\n"));

    const rest = new REST({ version: "10" }).setToken(env.BOT_TOKEN);

    console.log("\n📤 Registrando comandos en Discord...");

    try {
        await rest.put(
            Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
            { body: commands }
        );
        console.log("✅ ¡Comandos registrados correctamente!");
    } catch (err) {
        console.error("❌ Error al registrar comandos:", err);
    }
}

deploy();
