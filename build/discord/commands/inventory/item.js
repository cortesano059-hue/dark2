import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import * as eco from "../../../economy/index.js";
import { getAllItems } from "../../../items/cache.js";
import * as handlers from "./itemHandlers.js";
createCommand({
  name: "item",
  description: "Sistema completo de items del servidor.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "crear",
      description: "Crear un item (admins).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "nombre", description: "Nombre del item", type: ApplicationCommandOptionType.String, required: true },
        { name: "precio", description: "Precio", type: ApplicationCommandOptionType.Integer, required: true },
        { name: "descripcion", description: "Descripci\xF3n", type: ApplicationCommandOptionType.String },
        { name: "emoji", description: "Emoji", type: ApplicationCommandOptionType.String },
        { name: "inventariable", description: "Inventariable", type: ApplicationCommandOptionType.Boolean },
        { name: "usable", description: "Usable", type: ApplicationCommandOptionType.Boolean },
        { name: "vendible", description: "Vendible", type: ApplicationCommandOptionType.Boolean },
        { name: "stock", description: "Stock (-1 ilimitado)", type: ApplicationCommandOptionType.Integer }
      ]
    },
    {
      name: "info",
      description: "Informaci\xF3n detallada del item.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "nombre", description: "Item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
      ]
    },
    {
      name: "usar",
      description: "Usar un item del inventario.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "nombre", description: "Item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
      ]
    },
    {
      name: "editar",
      description: "Editar un item existente (admins).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "nombre", description: "Item actual", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
        { name: "nuevo_nombre", description: "Nuevo nombre", type: ApplicationCommandOptionType.String },
        { name: "precio", description: "Nuevo precio", type: ApplicationCommandOptionType.Integer },
        { name: "descripcion", description: "Nueva descripci\xF3n", type: ApplicationCommandOptionType.String },
        { name: "emoji", description: "Nuevo emoji", type: ApplicationCommandOptionType.String }
      ]
    },
    {
      name: "eliminar",
      description: "Eliminar un item (admins).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "nombre", description: "Nombre", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }
      ]
    },
    {
      name: "dar",
      description: "Dar item a un usuario (admins).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "usuario", description: "Usuario", type: ApplicationCommandOptionType.User, required: true },
        { name: "nombre", description: "Item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
        { name: "cantidad", description: "Cantidad", type: ApplicationCommandOptionType.Integer, required: true }
      ]
    },
    {
      name: "quitar",
      description: "Quitar item del usuario (admins).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "usuario", description: "Usuario", type: ApplicationCommandOptionType.User, required: true },
        { name: "nombre", description: "Item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
        { name: "cantidad", description: "Cantidad", type: ApplicationCommandOptionType.Integer, required: true }
      ]
    },
    {
      name: "comprar",
      description: "Comprar un item de la tienda.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "nombre", description: "Item a comprar", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
        { name: "cantidad", description: "Cantidad", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }
      ]
    },
    {
      name: "set",
      description: "Configura acciones y requisitos (admins).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "item", description: "Item", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
        { name: "addrole", description: "Rol a dar", type: ApplicationCommandOptionType.Role },
        { name: "removerole", description: "Rol a quitar", type: ApplicationCommandOptionType.Role },
        { name: "addmoney", description: "Dinero a dar", type: ApplicationCommandOptionType.Integer },
        { name: "removemoney", description: "Dinero a quitar", type: ApplicationCommandOptionType.Integer },
        { name: "addmoneybank", description: "Dinero a dar al banco", type: ApplicationCommandOptionType.Integer },
        { name: "removemoneybank", description: "Dinero a quitar del banco", type: ApplicationCommandOptionType.Integer },
        { name: "additem", description: "Dar item (nombre:cantidad)", type: ApplicationCommandOptionType.String },
        { name: "removeitem", description: "Quitar item (nombre:cantidad)", type: ApplicationCommandOptionType.String },
        { name: "sendmessage", description: "Mensaje", type: ApplicationCommandOptionType.String },
        { name: "requirerole", description: "Rol requerido", type: ApplicationCommandOptionType.Role },
        { name: "requiremoney", description: "Dinero requerido", type: ApplicationCommandOptionType.Integer },
        { name: "requireitem", description: "Item requerido (nombre:cantidad)", type: ApplicationCommandOptionType.String },
        { name: "reset", description: "Limpiar acciones y requisitos previos", type: ApplicationCommandOptionType.Boolean }
      ]
    }
  ],
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "nombre" && focused.name !== "item") return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!guildId) return;
    let suggestions = [];
    if (sub === "usar") {
      const inv = await eco.getUserInventory(interaction.user.id, guildId);
      suggestions = inv.map((i) => i.itemName);
    } else {
      const all = await getAllItems(guildId);
      suggestions = all.map((i) => i.itemName);
    }
    const filtered = suggestions.filter((n) => n.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);
    await interaction.respond(filtered.map((n) => ({ name: n, value: n })));
  },
  async run(interaction) {
    if (!interaction.guildId) return;
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    const adminCmds = ["crear", "editar", "eliminar", "dar", "quitar", "set"];
    if (adminCmds.includes(sub) && !isAdmin) {
      await handlers.safeReply(interaction, "\u274C No tienes permisos para esto.");
      return;
    }
    switch (sub) {
      case "crear":
        return handlers.createHandler(interaction);
      case "comprar":
        return handlers.buyHandler(interaction);
      case "info":
        return handlers.infoHandler(interaction);
      case "usar":
        return handlers.useHandler(interaction);
      case "editar":
        return handlers.editHandler(interaction);
      case "eliminar":
        return handlers.deleteHandler(interaction);
      case "dar":
        return handlers.giveHandler(interaction);
      case "quitar":
        return handlers.removeHandler(interaction);
      case "set":
        return handlers.setHandler(interaction);
    }
  }
});
