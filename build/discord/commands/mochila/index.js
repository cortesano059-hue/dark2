import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";
import { crear } from "./actions/crear.js";
import { abrir } from "./actions/abrir.js";
import { listar } from "./actions/listar.js";
import { info } from "./actions/info.js";
import { meter } from "./actions/meter.js";
import { sacar } from "./actions/sacar.js";
import { autorizar } from "./actions/autorizar.js";
import { add } from "./actions/add.js";
const command = createCommand({
  name: "mochila",
  description: "Sistema de mochilas por slots",
  type: ApplicationCommandType.ChatInput,
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const guildId = interaction.guildId;
    if (!guildId) return;
    const sub = interaction.options.getSubcommand();
    const adminMode = interaction.member.permissions.has("Administrator") && interaction.options.getBoolean("admin") === true;
    if (["mochila", "nombre"].includes(focused.name)) {
      const { listAccessibleBackpacks, listAllGuildBackpacks } = await import("../../../database/repositories/backpackRepo.js");
      let bps = [];
      if (adminMode) {
        bps = await listAllGuildBackpacks(guildId);
      } else {
        const member = interaction.member;
        const roleIds = member && Array.isArray(member.roles) ? member.roles : member?.roles?.cache?.map((r) => r.id) || [];
        bps = await listAccessibleBackpacks(interaction.user.id, guildId, roleIds);
      }
      const filtered = bps.filter((b) => b.name.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);
      await interaction.respond(filtered.map((b) => ({
        name: `${b.emoji || "\u{1F392}"} ${b.name}`,
        value: b.name
      })));
    }
    if (focused.name === "item") {
      if (sub === "meter") {
        const { getUserInventory } = await import("../../../economy/index.js");
        const inv = await getUserInventory(interaction.user.id, guildId);
        const filtered = inv.filter((i) => i.itemName.toLowerCase().includes(focused.value.toLowerCase())).filter((i) => i.amount > 0).slice(0, 25);
        await interaction.respond(filtered.map((i) => ({ name: `${i.emoji || "\u{1F4E6}"} ${i.itemName} (x${i.amount})`, value: i.itemName })));
      } else if (sub === "sacar") {
        let escapeRegex2 = function(str) {
          return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        };
        var escapeRegex = escapeRegex2;
        const backpackName = interaction.options.getString("mochila");
        if (!backpackName) {
          await interaction.respond([]);
          return;
        }
        const { BackpackModel } = await import("../../../database/repositories/backpackRepo.js");
        const regex = new RegExp(`^${escapeRegex2(backpackName)}$`, "i");
        const bp = await BackpackModel.findOne({ guildId, name: regex });
        if (!bp || !bp.items) {
          await interaction.respond([]);
          return;
        }
        const { getAllItems } = await import("../../../economy/index.js");
        const allGlobalItems = await getAllItems(guildId);
        const globalMap = new Map(allGlobalItems.map((i) => [i.name, i]));
        const items = bp.items instanceof Map ? Array.from(bp.items.values()) : Object.values(bp.items);
        const filtered = items.filter((i) => i.itemId.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);
        await interaction.respond(filtered.map((i) => {
          const gItem = globalMap.get(i.itemId);
          const emoji = gItem ? gItem.emoji : "\u{1F4E6}";
          return { name: `${emoji} ${i.itemId} (x${i.amount})`, value: i.itemId };
        }));
      } else if (sub === "a\xF1adir") {
        const { getAllItems } = await import("../../../economy/index.js");
        const items = await getAllItems(guildId);
        const filtered = items.filter((i) => i.itemName.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);
        await interaction.respond(filtered.map((i) => ({ name: `${i.emoji || "\u{1F4E6}"} ${i.itemName}`, value: i.itemName })));
      }
    }
  }
});
const actions = {
  crear,
  abrir,
  listar,
  info,
  meter,
  sacar,
  autorizar,
  a\u00F1adir: add
};
const actionFiles = {
  crear: "./actions/crear.js",
  abrir: "./actions/abrir.js",
  listar: "./actions/listar.js",
  info: "./actions/info.js",
  meter: "./actions/meter.js",
  sacar: "./actions/sacar.js",
  autorizar: "./actions/autorizar.js",
  add: "./actions/add.js"
  // mapped from 'añadir'
};
Object.entries(actions).forEach(([name, staticAction]) => {
  command.subcommand({
    name: staticAction.command.name,
    description: staticAction.command.description,
    options: staticAction.command.options,
    run: async (interaction) => {
      try {
        await interaction.deferReply({ ephemeral: true });
        const fileKey = name === "a\xF1adir" ? "add" : name;
        const filePath = actionFiles[fileKey];
        const module = await import(`${filePath}?t=${Date.now()}`);
        const actionInstance = module[fileKey] || module.default;
        if (!actionInstance || !actionInstance.run) {
          throw new Error(`Could not load action ${name} dynamically.`);
        }
        const result = await actionInstance.run(interaction);
        if (result) {
          const { safeReply } = await import("../../../utils/safeReply.js");
          await safeReply(interaction, result);
        }
      } catch (error) {
        console.error(`Error in /mochila ${name}:`, error);
        const { safeReply } = await import("../../../utils/safeReply.js");
        await safeReply(interaction, { content: "\u274C Ocurri\xF3 un error al ejecutar el comando.", ephemeral: true });
      }
    }
  });
});
