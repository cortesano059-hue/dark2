import { env } from "#env";
import { CustomItents, CustomPartials } from "@magicyan/discord";
import ck from "chalk";
import {
    Client,
    ClientOptions,
    version as djsVersion,
    REST,
    Routes
} from "discord.js";

import { Constatic } from "./app.js";
import { baseErrorHandler } from "./base.error.js";

// Import correcto
import { BASE_VERSION, runtimeDisplay } from "./base.runtime.js";

import { BaseCommandHandlers } from "./commands/handlers.js";
import "./constants.js";
import { BaseEventHandlers } from "./events/handlers.js";
import { BaseResponderHandlers } from "./responders/handlers.js";

import { glob } from "node:fs/promises";
import { join } from "node:path";

interface BootstrapOptions extends Partial<ClientOptions> {
    meta: ImportMeta;
    modules?: string[];
    loadLogs?: boolean;
    beforeLoad?(client: Client): Promise<void>;
}

export async function bootstrap(options: BootstrapOptions) {
    const { meta, modules, beforeLoad, loadLogs = true, ...clientOptions } = options;

    const client = new Client({
        ...clientOptions,
        intents: options.intents ?? CustomItents.All,
        partials: options.partials ?? CustomPartials.All,
        failIfNotExists: options.failIfNotExists ?? false,
    });

    const app = Constatic.getInstance();

    // READY EVENT
    client.once("clientReady", async (client) => {
        registerErrorHandlers(client);
        await client.guilds.fetch().catch(() => null);

        console.log(ck.green(`● ${ck.greenBright.underline(client.user.username)} online ✓`));

        await BaseCommandHandlers.register(client);

        await Promise.all(
            Array.from(app.events.getEvents("clientReady").values())
                .map(data => BaseEventHandlers.handler(data, [client]))
        );
    });

    // INTERACTIONS
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isAutocomplete()) {
            return void BaseCommandHandlers.autocomplete(interaction);
        }
        if (interaction.isCommand()) {
            return void BaseCommandHandlers.command(interaction);
        }
        await BaseResponderHandlers.handler(interaction);
    });

    if (beforeLoad) {
        await beforeLoad(client);
    }

    // Load discord/index
    try {
        await import(`file://${join(meta.dirname, "./discord/index.ts")}`);
    } catch {
        try {
            await import(`file://${join(meta.dirname, "./discord/index.js")}`);
        } catch {}
    }

    // LOAD MODULES
    await loadModules(meta.dirname, modules);

    if (loadLogs) app.printLoadLogs?.();

    console.log();
    console.log(ck.blue(`★ Constatic Base ${BASE_VERSION}`));
    console.log(`${ck.hex("#5865F2")("◌ discord.js")} ${ck.dim(djsVersion)} | ${runtimeDisplay()}`);

    BaseEventHandlers.register(client);

    // AUTO-DEPLOY -------------------------------------------
    async function deployCommands() {
        const rest = new REST({ version: "10" }).setToken(env.BOT_TOKEN);

        const builtCommands = app.commands.build();

        if (!env.GUILD_ID) {
            console.error("❌ No se encontró GUILD_ID en .env");
            return;
        }

        try {
            await rest.put(
                Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
                { body: builtCommands }
            );
            console.log("✅ Commands deployed successfully!");
        } catch (err) {
            console.error("❌ Error deploying commands:", err);
        }
    }

    await deployCommands();

    client.login(env.BOT_TOKEN);

    return { client };
}

// ---------------------------------------------------------
// MODULE LOADER COMPATIBLE CON DISCLOUD (JS only)
// ---------------------------------------------------------
async function loadModules(workdir: string, modules: string[] = []) {
    const files = await Array.fromAsync(
        glob(
            [
                "./discord/**/*.js",
                "./discord/**/*.cjs",
                "./discord/**/*.mjs",
                ...modules,
            ],
            {
                cwd: workdir,
                exclude: ["./discord/index.*", "./discord/base/**/*"],
            }
        )
    );

    let createCommand: any;

    try {
        const discordIndex = await import(`file://${join(workdir, "./discord/index.js")}`);
        createCommand = discordIndex.createCommand;
    } catch {
        const fallback = await import(`file://${join(workdir, "./discord/index.cjs")}`).catch(() => null);
        if (fallback?.createCommand) {
            createCommand = fallback.createCommand;
        } else {
            const { setupCreators } = await import("./creators.js");
            createCommand = setupCreators().createCommand;
        }
    }

    await Promise.all(
        files.map(async (filePath) => {
            try {
                const module = await import(`file://${join(workdir, filePath)}`);
                let cmd: any = null;

                if (module.default && typeof module.default === "object") {
                    const def = module.default;
                    if (def.data && def.execute && def.data.toJSON) cmd = def;
                }

                if (!cmd && module.command?.data?.toJSON && module.command?.execute) {
                    cmd = module.command;
                }

                if (!cmd && module.data?.toJSON && typeof module.execute === "function") {
                    cmd = { data: module.data, execute: module.execute };
                }

                if (cmd) {
                    const c = cmd.data.toJSON();

                    createCommand({
                        name: c.name,
                        description: c.description,
                        options: c.options || [],
                        run: cmd.execute,
                    });
                }

            } catch {}
        })
    );
}

// ---------------------------------------------------------

function registerErrorHandlers(client?: Client<true>): void {
    const errorHandler = client
        ? (err: unknown) => baseErrorHandler(err, client)
        : baseErrorHandler;

    if (client) {
        process.removeListener("uncaughtException", baseErrorHandler);
        process.removeListener("unhandledRejection", baseErrorHandler);
    }

    process.on("uncaughtException", errorHandler);
    process.on("unhandledRejection", errorHandler);
}

registerErrorHandlers();
