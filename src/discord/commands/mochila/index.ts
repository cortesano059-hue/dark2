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
    const adminMode = interaction.member.permissions.has("Administrator") && (interaction.options.getBoolean("admin") === true);

    if (["mochila", "nombre"].includes(focused.name)) {
      const { listAccessibleBackpacks, listAllGuildBackpacks } = await import("../../../database/repositories/backpackRepo.js");
      let bps: any[] = [];

      if (adminMode) {
        bps = await listAllGuildBackpacks(guildId);
      } else {
        const member = interaction.member;
        const roleIds = member && Array.isArray(member.roles) ? member.roles : (member?.roles?.cache?.map((r: any) => r.id) || []);
        bps = await listAccessibleBackpacks(interaction.user.id, guildId, roleIds);
      }

      const filtered = bps
        .filter((b: any) => b.name.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25);

      await interaction.respond(filtered.map((b: any) => ({
        name: `${b.emoji || '🎒'} ${b.name}`,
        value: b.name
      })));
    }

    if (focused.name === "item") {
      if (sub === "meter") {
        const { getUserInventory } = await import("../../../economy/index.js");
        const inv = await getUserInventory(interaction.user.id, guildId);
        const filtered = inv
          .filter((i: any) => i.itemName.toLowerCase().includes(focused.value.toLowerCase()))
          .filter((i: any) => i.amount > 0)
          .slice(0, 25);

        await interaction.respond(filtered.map((i: any) => ({ name: `${i.emoji || '📦'} ${i.itemName} (x${i.amount})`, value: i.itemName })));
      }
      else if (sub === "sacar") {
        const backpackName = interaction.options.getString("mochila");
        if (!backpackName) {
          await interaction.respond([]);
          return;
        }

        const { BackpackModel } = await import("../../../database/repositories/backpackRepo.js");

        function escapeRegex(str: string) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
        const regex = new RegExp(`^${escapeRegex(backpackName)}$`, "i");
        const bp = await BackpackModel.findOne({ guildId, name: regex });

        if (!bp || !bp.items) {
          await interaction.respond([]);
          return;
        }

        const { getAllItems } = await import("../../../economy/index.js");
        const allGlobalItems = await getAllItems(guildId);
        const globalMap = new Map(allGlobalItems.map((i: any) => [i.name, i]));

        const items = bp.items instanceof Map ? Array.from(bp.items.values()) : Object.values(bp.items);
        const filtered = items
          .filter((i: any) => i.itemId.toLowerCase().includes(focused.value.toLowerCase()))
          .slice(0, 25);

        await interaction.respond(filtered.map((i: any) => {
          const gItem = globalMap.get(i.itemId);
          const emoji = gItem ? gItem.emoji : '📦';
          return { name: `${emoji} ${i.itemId} (x${i.amount})`, value: i.itemId };
        }));
      }
      else if (sub === "añadir") {
        const { getAllItems } = await import("../../../economy/index.js");
        const items = await getAllItems(guildId);
        const filtered = items.filter((i: any) => i.itemName.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);
        await interaction.respond(filtered.map((i: any) => ({ name: `${i.emoji || '📦'} ${i.itemName}`, value: i.itemName })));
      }
    }
  }
});

// Register subcommands
const actions = {
  crear, abrir, listar, info, meter, sacar, autorizar, añadir: add
};

// Map action names to their file paths (relative to this file)
const actionFiles: Record<string, string> = {
  crear: "./actions/crear.js",
  abrir: "./actions/abrir.js",
  listar: "./actions/listar.js",
  info: "./actions/info.js",
  meter: "./actions/meter.js",
  sacar: "./actions/sacar.js",
  autorizar: "./actions/autorizar.js",
  add: "./actions/add.js" // mapped from 'añadir'
};

Object.entries(actions).forEach(([name, staticAction]) => {
  command.subcommand({
    name: staticAction.command.name,
    description: staticAction.command.description,
    options: staticAction.command.options,
    run: async (interaction) => {
      try {
        // Defer immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        // Dynamic Loading for Hot-Reload
        // We determine the key for the file map. 'añadir' maps to 'add' file.
        const fileKey = name === 'añadir' ? 'add' : name;
        const filePath = actionFiles[fileKey];

        // Import the fresh module
        const module = await import(`${filePath}?t=${Date.now()}`);

        // The action export might be named (e.g. export const crear) or default.
        // Based on current static imports: import { crear } from ...
        // So we expect module[fileKey] or module.default?
        // Let's assume the export name matches the key usually, except 'add' vs 'añadir'.
        // Actually, looking at imports: import { add } from ./actions/add.js.
        // So module.crear, module.abrir, module.add.
        const actionInstance = module[fileKey] || module.default;

        if (!actionInstance || !actionInstance.run) {
          throw new Error(`Could not load action ${name} dynamically.`);
        }

        // Execute the action's run method
        const result = await actionInstance.run(interaction);

        if (result) {
          const { safeReply } = await import("../../../utils/safeReply.js");
          await safeReply(interaction, result);
        }
      } catch (error) {
        console.error(`Error in /mochila ${name}:`, error);
        const { safeReply } = await import("../../../utils/safeReply.js");
        await safeReply(interaction, { content: "❌ Ocurrió un error al ejecutar el comando.", ephemeral: true });
      }
    }
  });
});

