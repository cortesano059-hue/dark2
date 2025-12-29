import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import * as eco from "../../../economy/index.js";
import { safeReply } from "../../../utils/safeReply.js";
import { GuildConfig } from "#database";
createCommand({
  name: "config",
  description: "Comandos de configuraci\xF3n (Admins).",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  // Or ManageGuild
  options: [
    {
      name: "balance",
      description: "Configura el dinero inicial para nuevos usuarios.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "mano", description: "Dinero en mano", type: ApplicationCommandOptionType.Integer, minValue: 0 },
        { name: "banco", description: "Dinero en banco", type: ApplicationCommandOptionType.Integer, minValue: 0 }
      ]
    },
    {
      name: "income",
      description: "Configura el sueldo por hora de un rol.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "rol", description: "Rol", type: ApplicationCommandOptionType.Role, required: true },
        { name: "cantidad", description: "Cantidad/hora", type: ApplicationCommandOptionType.Integer, required: true }
      ]
    },
    {
      name: "rolepoli",
      description: "Establece el rol de polic\xEDa.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "rol", description: "Rol de polic\xEDa", type: ApplicationCommandOptionType.Role, required: true }
      ]
    },
    {
      name: "badulaque",
      description: "Configura recompensas de un badulaque.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "badulaque",
          description: "Badulaque",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Badulaque Central", value: "central" },
            { name: "Badulaque Casino", value: "casino" },
            { name: "Badulaque Rojo", value: "rojo" },
            { name: "Badulaque Verde", value: "verde" },
            { name: "Badulaque Licorer\xEDa", value: "licoreria" }
          ]
        },
        { name: "item", description: "Item recompensa", type: ApplicationCommandOptionType.String, required: true },
        { name: "cantidad", description: "Cantidad", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 },
        { name: "imagen", description: "URL Imagen", type: ApplicationCommandOptionType.String }
      ]
    },
    {
      name: "minar",
      description: "Configura requisitos de miner\xEDa.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "tipo",
          description: "Tipo de requisito",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Rol", value: "role" },
            { name: "Item", value: "item" },
            { name: "Ninguno", value: "none" }
          ]
        },
        { name: "valor", description: "ID Rol o Nombre Item", type: ApplicationCommandOptionType.String }
      ]
    },
    {
      name: "mari",
      description: "Configura venta de marihuana.",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "ver",
          description: "Ver configuraci\xF3n actual.",
          type: ApplicationCommandOptionType.Subcommand
        },
        {
          name: "item",
          description: "Configurar item necesario.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [{ name: "nombre", description: "Nombre exacto", type: ApplicationCommandOptionType.String, required: true }]
        },
        {
          name: "rol",
          description: "Configurar rol ilegal necesario.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [{ name: "rol", description: "Rol", type: ApplicationCommandOptionType.Role, required: true }]
        },
        {
          name: "precio",
          description: "Configurar precios.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            { name: "min", description: "Min", type: ApplicationCommandOptionType.Integer, required: true },
            { name: "max", description: "Max", type: ApplicationCommandOptionType.Integer, required: true }
          ]
        },
        {
          name: "consumo",
          description: "Configurar consumo stock.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            { name: "min", description: "Min", type: ApplicationCommandOptionType.Integer, required: true },
            { name: "max", description: "Max", type: ApplicationCommandOptionType.Integer, required: true }
          ]
        }
      ]
    }
  ],
  async run(interaction) {
    if (!interaction.guildId) return;
    const subGroup = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (sub === "income") {
      const role = interaction.options.getRole("rol", true);
      const amount = interaction.options.getInteger("cantidad", true);
      await eco.setIncomeRole(guildId, role.id, amount);
      await safeReply(interaction, {
        embeds: [{
          title: "\u{1F4BC} Salario configurado",
          description: `El rol **${role.name}** ahora cobra **$${amount}/hora**.`,
          color: 43263
        }]
      });
      return;
    }
    if (sub === "balance") {
      const money = interaction.options.getInteger("mano");
      const bank = interaction.options.getInteger("banco");
      if (money === null && bank === null) {
        await safeReply(interaction, "\u274C Debes especificar al menos un valor (mano o banco).");
        return;
      }
      const update = {};
      if (money !== null) update.initialMoney = money;
      if (bank !== null) update.initialBank = bank;
      await GuildConfig.findOneAndUpdate({ guildId }, update, { upsert: true, new: true });
      await safeReply(interaction, {
        embeds: [{
          title: "\u{1F4B0} Econom\xEDa Inicial Configurada",
          description: `Valores actualizados para nuevos usuarios:`,
          fields: [
            { name: "Mano", value: money !== null ? `$${money}` : "Sin cambio", inline: true },
            { name: "Banco", value: bank !== null ? `$${bank}` : "Sin cambio", inline: true }
          ],
          color: 15844367
        }]
      });
      return;
    }
    if (sub === "rolepoli") {
      const role = interaction.options.getRole("rol", true);
      await eco.setPoliceRole(guildId, role.id);
      await safeReply(interaction, `\u2705 Rol de polic\xEDa establecido: <@&${role.id}>`);
      return;
    }
    if (sub === "badulaque") {
      const key = interaction.options.getString("badulaque", true);
      const item = interaction.options.getString("item", true);
      const amount = interaction.options.getInteger("cantidad", true);
      const image = interaction.options.getString("imagen");
      const itemObj = await eco.getItemByName(guildId, item);
      if (!itemObj) {
        await safeReply(interaction, `\u274C El item **${item}** no existe.`);
        return;
      }
      await eco.setBadulaque(guildId, key, {
        reward: { itemName: item, amount },
        ...image ? { image } : {}
      });
      await safeReply(interaction, `\u2705 Badulaque **${key}** configurado. Recompensa: ${amount}x ${item}.`);
      return;
    }
    if (sub === "minar") {
      const tipo = interaction.options.getString("tipo", true);
      const valor = interaction.options.getString("valor");
      let data = { requireType: null, requireId: null };
      if (tipo !== "none") {
        if (!valor) {
          await safeReply(interaction, "\u274C Debes indicar el valor (ID Rol o Nombre Item).");
          return;
        }
        if (tipo === "role") {
          if (valor.startsWith("<@&") && valor.endsWith(">")) {
            data.requireId = valor.slice(3, -1);
          } else {
            data.requireId = valor;
          }
        }
        if (tipo === "item") {
          const i = await eco.getItemByName(guildId, valor);
          if (!i) {
            await safeReply(interaction, "\u274C Item no existe.");
            return;
          }
          data.requireId = valor;
        }
        data.requireType = tipo;
      }
      await eco.setMiningConfig(guildId, data);
      await safeReply(interaction, "\u2705 Configuraci\xF3n de miner\xEDa actualizada.");
      return;
    }
    if (subGroup === "mari") {
      let cfg = await eco.getMariConfig(guildId) || {};
      if (!cfg.guildId && !cfg.save) {
      }
      const updateData = {};
      if (sub === "ver") {
        await safeReply(interaction, {
          embeds: [{
            title: "\u{1F33F} Configuraci\xF3n Marihuana",
            fields: [
              { name: "Item", value: cfg.itemName || "\u274C", inline: true },
              { name: "Rol", value: cfg.roleId ? `<@&${cfg.roleId}>` : "\u274C", inline: true },
              { name: "Precio", value: `${cfg.minPrice}-${cfg.maxPrice}`, inline: true }
            ],
            color: 3066993
          }]
        });
        return;
      }
      if (sub === "item") {
        updateData.itemName = interaction.options.getString("nombre", true);
      }
      if (sub === "rol") {
        updateData.roleId = interaction.options.getRole("rol", true).id;
      }
      if (sub === "precio") {
        updateData.minPrice = interaction.options.getInteger("min", true);
        updateData.maxPrice = interaction.options.getInteger("max", true);
      }
      if (sub === "consumo") {
        updateData.minConsume = interaction.options.getInteger("min", true);
        updateData.maxConsume = interaction.options.getInteger("max", true);
      }
      await eco.setMariConfig(guildId, updateData);
      await safeReply(interaction, "\u2705 Configuraci\xF3n marihuana actualizada.");
    }
  }
});
