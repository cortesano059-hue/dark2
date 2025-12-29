import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { Constatic } from "./app.js";
import { env } from "#env";
function setupCreators(options = {}) {
  const app = Constatic.getInstance();
  app.config.commands = { ...options.commands };
  if (env.GUILD_ID) {
    (app.config.commands.guilds ??= []).push(env.GUILD_ID);
  }
  app.config.responders = { ...options.responders };
  app.config.events = { ...options.events };
  const defaultPerms = options.commands?.defaultMemberPermissions;
  return {
    createCommand: function(data) {
      if (defaultPerms) {
        data.defaultMemberPermissions ??= defaultPerms;
      }
      if (!data.category && app.currentCategory) {
        data.category = app.currentCategory;
      }
      const resolved = app.commands.set(data);
      app.commands.addLog(resolved);
      if (resolved.type !== ApplicationCommandType.ChatInput) {
        return resolved;
      }
      const commandName = resolved.name;
      const createSubcommand = (group) => {
        return function(data2) {
          app.commands.addModule(commandName, {
            ...data2,
            group,
            type: ApplicationCommandOptionType.Subcommand
          });
        };
      };
      return Object.assign(data, {
        ...resolved,
        group(data2) {
          app.commands.addModule(commandName, {
            ...data2,
            type: ApplicationCommandOptionType.SubcommandGroup
          });
          return { subcommand: createSubcommand(data2.name) };
        },
        subcommand: createSubcommand()
      });
    },
    createEvent: function(data) {
      const resolved = {
        ...data,
        once: data.event === "ready" ? true : data.once
      };
      app.events.addLogs(resolved);
      return app.events.add(resolved);
    },
    createResponder: function(data) {
      app.responders.addLogs(data);
      return app.responders.add(data);
    }
  };
}
export {
  setupCreators
};
