import { isDefined, limitText, spaceBuilder } from "@magicyan/discord";
import ck from "chalk";
import { ApplicationCommandOptionType, ApplicationCommandType, Collection } from "discord.js";
class CommandManager {
  collection = new Collection();
  commandRunners = new Collection();
  autocompleteRunners = new Collection();
  logs = [];
  formatName(name, type = ApplicationCommandType.ChatInput) {
    return limitText(
      type === ApplicationCommandType.ChatInput ? name.toLowerCase().replaceAll(" ", "") : name,
      32
    );
  }
  clear() {
    this.collection.clear();
    this.logs.length = 0;
  }
  reset() {
    this.clear();
    this.commandRunners.clear();
    this.autocompleteRunners.clear();
  }
  getAutocompleteHandler(...path) {
    const commandName = path[0];
    const type = ApplicationCommandType.ChatInput;
    const resolved = `/${type}/${path.filter(isDefined).join("/")}`;
    return this.autocompleteRunners.get(resolved) ?? this.autocompleteRunners.get(`/${type}/${commandName}`);
  }
  getHandler(type, ...path) {
    const commandName = path[0];
    const resolved = `/${type}/${path.filter(isDefined).join("/")}`;
    return this.commandRunners.get(resolved) ?? this.commandRunners.get(`/${type}/${commandName}`);
  }
  getTitle(type) {
    return {
      [ApplicationCommandType.ChatInput]: ["{/}", "Slash command"],
      [ApplicationCommandType.User]: ["{\u2630}", "User context menu"],
      [ApplicationCommandType.Message]: ["{\u2630}", "Message context menu"]
    }[type ?? ApplicationCommandType.ChatInput];
  }
  buildOptions(options, path) {
    const resolved = [];
    for (const option of options) {
      const description = option.description ?? option.name;
      if ("autocomplete" in option && option.autocomplete && typeof option.autocomplete === "function") {
        this.autocompleteRunners.set(
          `${path}/${option.name}`,
          option.autocomplete
        );
      }
      switch (option.type) {
        case ApplicationCommandOptionType.SubcommandGroup: {
          const { options: subcommands, ...data } = option;
          resolved.push({
            ...data,
            description,
            options: this.buildOptions(
              subcommands,
              `${path}/${data.name}`
            )
          });
          continue;
        }
        case ApplicationCommandOptionType.Subcommand: {
          const { options: options2, ...data } = option;
          resolved.push({
            ...data,
            description,
            ...options2?.length ? {
              options: this.buildOptions(
                options2,
                `${path}/${data.name}`
              )
            } : {}
          });
          continue;
        }
        case ApplicationCommandOptionType.String:
        case ApplicationCommandOptionType.Integer:
        case ApplicationCommandOptionType.Number: {
          const { choices, autocomplete, ...data } = option;
          const validation = data.type === ApplicationCommandOptionType.String ? { minLength: data.minLength, maxLength: data.maxLength } : { minValue: data.minValue, maxValue: data.maxValue };
          const extra = autocomplete ? { autocomplete: true, ...validation } : choices?.length ? { choices: choices.slice(0, 25) } : validation;
          resolved.push(Object.assign({
            ...data,
            description,
            ...extra
          }));
          continue;
        }
        default: {
          resolved.push({ ...option, description });
        }
      }
    }
    return resolved;
  }
  resolveModules(modules, path, run) {
    const resolved = [];
    if (!modules.length) return [];
    const groups = modules.filter(
      (module) => module.type === ApplicationCommandOptionType.SubcommandGroup
    );
    const subcommands = modules.filter(
      (module) => module.type === ApplicationCommandOptionType.Subcommand
    );
    if (groups.length >= 1) {
      for (const group of groups) {
        const data = [
          ...(group.options ?? []).map((data2) => ({
            ...data2,
            type: ApplicationCommandOptionType.Subcommand
          })),
          ...subcommands.filter(
            (sub) => sub.type === ApplicationCommandOptionType.Subcommand && sub.group === group.name
          )
        ];
        resolved.push({ ...group, options: data });
        for (const subcommand of data) {
          this.commandRunners.set(
            `${path}/${group.name}/${subcommand.name}`,
            [run, group.run, subcommand.run]
          );
        }
      }
      ;
    }
    for (const subcommand of subcommands.filter((sub) => !sub.group)) {
      this.commandRunners.set(
        `${path}/${subcommand.name}`,
        [run, subcommand.run]
      );
      resolved.push(subcommand);
    }
    return resolved;
  }
  set(data) {
    const type = data.type ?? ApplicationCommandType.ChatInput;
    const name = this.formatName(data.name, type);
    const dmPermission = data.dmPermission ?? false;
    const commandData = { ...data, name, type, dmPermission };
    this.collection.set(name, commandData);
    this.commandRunners.set(`/${type}/${name}`, [data.run]);
    if ("autocomplete" in data && data.autocomplete) {
      this.autocompleteRunners.set(
        `/${type}/${name}`,
        data.autocomplete
      );
    }
    return commandData;
  }
  build() {
    return Array.from(this.collection.values()).map((raw) => {
      const {
        options,
        modules,
        description,
        descriptionLocalizations,
        ...data
      } = raw;
      const path = `/${data.type}/${data.name}`;
      const buildedOptions = this.buildOptions([
        ...options ?? [],
        ...this.resolveModules(
          modules ?? [],
          path,
          data.run
        )
      ], path);
      const slashData = data.type === ApplicationCommandType.ChatInput ? {
        description: description ?? data.name,
        descriptionLocalizations,
        ...buildedOptions.length >= 1 ? { options: buildedOptions } : {}
      } : {};
      return { ...data, ...slashData };
    });
  }
  addLog(data) {
    this.logs.push(ck.green(spaceBuilder(
      this.getTitle(data.type),
      ck.gray(">"),
      ck.underline.blue(`${data.name}`),
      "\u2713"
    )));
  }
  addModule(commandName, module) {
    const command = this.collection.get(commandName);
    if (!command) return;
    command.modules ??= [];
    command.modules.push(module);
  }
}
export {
  CommandManager
};
