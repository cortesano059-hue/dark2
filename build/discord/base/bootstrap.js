import { env } from "#env";
import { CustomItents, CustomPartials } from "@magicyan/discord";
import ck from "chalk";
import { Client, version as djsVersion } from "discord.js";
import { Constatic } from "./app.js";
import { baseErrorHandler } from "./base.error.js";
import { runtimeDisplay } from "./base.version.js";
import { BaseCommandHandlers } from "./commands/handlers.js";
import "./constants.js";
import { BaseEventHandlers } from "./events/handlers.js";
import { BaseResponderHandlers } from "./responders/handlers.js";
import glob from "fast-glob";
import { join } from "node:path";
async function bootstrap(options) {
  const app = Constatic.getInstance();
  const { meta, modules, beforeLoad, loadLogs = true, ...clientOptions } = options;
  const client = new Client({
    ...clientOptions,
    intents: options.intents ?? CustomItents.All,
    partials: options.partials ?? CustomPartials.All,
    failIfNotExists: options.failIfNotExists ?? false
  });
  client.once("clientReady", async (client2) => {
    registerErrorHandlers(client2);
    await client2.guilds.fetch().catch(() => null);
    console.log(ck.green(` ${ck.greenBright.underline(client2.user.username)} online `));
    await BaseCommandHandlers.register(client2);
    await Promise.all(
      Array.from(app.events.getEvents("clientReady").values()).map((data) => BaseEventHandlers.handler(data, [client2]))
    );
  });
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isAutocomplete()) {
      await BaseCommandHandlers.autocomplete(interaction);
      return;
    }
    if (interaction.isCommand()) {
      await BaseCommandHandlers.command(interaction);
      return;
    }
    await BaseResponderHandlers.handler(interaction);
  });
  if (beforeLoad) {
    await beforeLoad(client);
  }
  await loadModules(meta.dirname, modules);
  if (loadLogs) app.printLoadLogs();
  console.log();
  console.log(ck.blue(` Constatic Base ${ck.reset.dim(env.BASE_VERSION)}`));
  console.log(
    `${ck.hex("#5865F2")(" discord.js")} ${ck.dim(djsVersion)}`,
    "|",
    runtimeDisplay
  );
  BaseEventHandlers.register(client);
  client.login(env.BOT_TOKEN);
  return { client };
}
async function loadModules(workdir, modules = [], nocache = false) {
  const app = Constatic.getInstance();
  const files = await glob([
    "./discord/**/*.{js,ts,jsx,tsx}",
    ...modules
  ], {
    cwd: workdir,
    ignore: [
      "./discord/index.*",
      "./discord/base/**/*"
    ]
  });
  for (const path of files) {
    const url = `file://${join(workdir, path)}`;
    const parts = path.split(/[\\/]/);
    const categoryIndex = parts.indexOf("commands");
    if (categoryIndex !== -1 && parts[categoryIndex + 1]) {
      app.currentCategory = parts[categoryIndex + 1];
    } else {
      app.currentCategory = null;
    }
    await (nocache ? import(`${url}?t=${Date.now()}`) : import(url));
  }
  app.currentCategory = null;
}
function registerErrorHandlers(client) {
  const errorHandler = client ? (err) => baseErrorHandler(err, client) : baseErrorHandler;
  if (client) {
    process.removeListener("uncaughtException", baseErrorHandler);
    process.removeListener("unhandledRejection", baseErrorHandler);
  }
  process.on("uncaughtException", errorHandler);
  process.on("unhandledRejection", errorHandler);
}
registerErrorHandlers();
export {
  bootstrap,
  loadModules
};
