import { Item } from "#database";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import * as eco from "../../../economy/index.js";
import { getItem, invalidateAll } from "../../../items/cache.js";
import { checkRequirements } from "../../../items/checkRequirements.js";
import { consumeRequirements } from "../../../items/consumeRequirements.js";
import { runItem } from "../../../items/engine.js";
import { normalizeAction } from "../../../items/normalizeAction.js";
import { normalizeRequirement } from "../../../items/normalizeRequirement.js";
import { safeReply } from "../../../utils/safeReply.js";
async function createHandler(interaction) {
  try {
    const name = interaction.options.getString("nombre", true);
    const price = interaction.options.getInteger("precio", true);
    const exists = await Item.findOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });
    if (exists) {
      await safeReply(interaction, "\u274C Ya existe un item con ese nombre.");
      return;
    }
    const itemData = {
      guildId: interaction.guildId,
      itemName: name,
      price,
      description: interaction.options.getString("descripcion") || "",
      emoji: interaction.options.getString("emoji") || "\u{1F4E6}",
      inventory: interaction.options.getBoolean("inventariable") ?? true,
      usable: interaction.options.getBoolean("usable") ?? false,
      sellable: interaction.options.getBoolean("vendible") ?? false,
      stock: interaction.options.getInteger("stock") ?? -1,
      time: interaction.options.getInteger("tiempo") ?? void 0,
      requirements: [],
      actions: []
    };
    await Item.create(itemData);
    invalidateAll();
    await safeReply(interaction, `\u2705 Item **${name}** creado correctamente.`);
  } catch (err) {
    console.error("Error creating item:", err);
    await safeReply(interaction, "\u274C Error al crear el item.");
  }
}
async function infoHandler(interaction) {
  const name = interaction.options.getString("nombre", true);
  const item = await getItem(name, interaction.guildId);
  if (!item) {
    await safeReply(interaction, "\u274C Ese item no existe.");
    return;
  }
  const embed = new EmbedBuilder().setTitle(`${item.emoji || "\u{1F4E6}"} ${item.itemName}`).setColor(5793266).addFields(
    { name: "Name", value: item.itemName, inline: true },
    { name: "Price", value: `\u{1F4B5} ${item.price.toLocaleString()}`, inline: true },
    { name: "Description", value: item.description || "No description provided.", inline: false },
    { name: "Inventory", value: item.inventory ? "Yes" : "No", inline: true },
    { name: "Usable", value: item.usable ? "Yes" : "No", inline: true },
    { name: "Sellable", value: item.sellable ? "Yes" : "No", inline: true },
    { name: "Time remaining", value: item.time ? `${item.time}ms` : "No time limit", inline: true },
    { name: "Stock remaining", value: item.stock === -1 ? "Unlimited" : `${item.stock}`, inline: true }
  );
  if (item.requirements?.length) {
    embed.addFields({
      name: "Requirements",
      value: item.requirements.map((r) => formatEffect(r, interaction.guild, "req")).join("\n"),
      inline: false
    });
  }
  if (item.actions?.length) {
    embed.addFields({
      name: "Actions",
      value: item.actions.map((a) => formatEffect(a, interaction.guild, "act")).join("\n"),
      inline: false
    });
  }
  embed.setFooter({ text: "Requirements and Actions can be edited on the Dashboard" });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`item/buy/${item.itemName}`).setLabel("\u{1F6D2} Comprar Unid.").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`item/use/${item.itemName}`).setLabel("\u{1F392} Usar Objeto").setStyle(ButtonStyle.Primary).setDisabled(!item.usable)
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}
async function useHandler(interaction) {
  const name = interaction.options.getString("nombre", true);
  return executeItemUsage(interaction, name);
}
async function executeItemUsage(interaction, itemName) {
  const item = await getItem(itemName, interaction.guildId);
  if (!item) {
    if (interaction.deferred || interaction.replied) await interaction.editReply("\u274C Ese item no existe.");
    else await safeReply(interaction, "\u274C Ese item no existe.");
    return;
  }
  if (!item.usable) {
    if (interaction.deferred || interaction.replied) await interaction.editReply("\u274C Este item no es usable.");
    else await safeReply(interaction, "\u274C Este item no es usable.");
    return;
  }
  const ctx = {
    guildId: interaction.guildId,
    userId: interaction.user.id,
    user: interaction.user,
    member: interaction.member,
    guild: interaction.guild,
    interaction,
    rolesGiven: [],
    rolesRemoved: [],
    itemsGiven: [],
    money: 0,
    moneyChanges: { add: 0, remove: 0 },
    bank: { add: 0, remove: 0 },
    customMessage: null,
    item
  };
  try {
    await checkRequirements(item, ctx);
  } catch (err) {
    let msg = "\u274C Requisitos no cumplidos.";
    if (err.message === "REQUIRE_MONEY") msg = "\u274C No tienes suficiente dinero.";
    if (err.message === "REQUIRE_ITEM") msg = "\u274C No tienes los items requeridos.";
    if (err.message === "REQUIRE_ROLE") msg = "\u274C No cumples los requisitos de rol.";
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
    else await safeReply(interaction, msg);
    return;
  }
  const inv = await eco.getUserInventory(interaction.user.id, interaction.guildId);
  const found = inv.find((i) => i.itemName.toLowerCase() === itemName.toLowerCase());
  if (!found || found.amount < 1) {
    const msg = "\u274C No tienes este item en tu inventario.";
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
    else await safeReply(interaction, msg);
    return;
  }
  await consumeRequirements(item, ctx);
  const rem = await eco.removeItem(interaction.user.id, interaction.guildId, item.itemName, 1);
  if (!rem.success) {
    const msg = "\u274C Error al consumir el item.";
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
    else await safeReply(interaction, msg);
    return;
  }
  await runItem(item, ctx);
  const embed = new EmbedBuilder().setTitle(`\u{1F392} Has usado: ${item.itemName}`).setColor(3066993);
  if (ctx.customMessage) embed.setDescription(ctx.customMessage);
  if (ctx.moneyChanges.add > 0) embed.addFields({ name: "\u{1F4B0} Ganancia", value: `+$${ctx.moneyChanges.add}`, inline: true });
  if (ctx.itemsGiven.length > 0) embed.addFields({ name: "\u{1F4E6} Obtuviste", value: ctx.itemsGiven.map((i) => `${i.name} x${i.amount}`).join("\n") });
  if (ctx.rolesGiven.length > 0) embed.addFields({ name: "\u{1F3AD} Roles", value: ctx.rolesGiven.map((r) => `<@&${r}>`).join(", ") });
  if (interaction.deferred || interaction.replied) await interaction.editReply({ content: null, embeds: [embed] });
  else await safeReply(interaction, { embeds: [embed] });
}
async function buyHandler(interaction) {
  const name = interaction.options.getString("nombre", true);
  const qty = interaction.options.getInteger("cantidad", true);
  const res = await eco.buyItem(interaction.user.id, interaction.guildId, name, qty);
  if (res.success) {
    await safeReply(interaction, `\u2705 Has comprado ${qty} **${name}** por $${res.totalPrice}.`);
  } else {
    await safeReply(interaction, `\u274C Error: ${res.reason}`);
  }
}
async function editHandler(interaction) {
  const name = interaction.options.getString("nombre", true);
  const item = await Item.findOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });
  if (!item) {
    await safeReply(interaction, "\u274C Item no encontrado.");
    return;
  }
  const newName = interaction.options.getString("nuevo_nombre");
  if (newName) item.itemName = newName;
  const price = interaction.options.getInteger("precio");
  if (price !== null) item.price = price;
  const desc = interaction.options.getString("descripcion");
  if (desc) item.description = desc;
  const emoji = interaction.options.getString("emoji");
  if (emoji) item.emoji = emoji;
  await item.save();
  invalidateAll();
  await safeReply(interaction, `\u2705 Item **${item.itemName}** actualizado.`);
}
async function deleteHandler(interaction) {
  const name = interaction.options.getString("nombre", true);
  const res = await Item.deleteOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });
  if (res.deletedCount === 0) {
    await safeReply(interaction, "\u274C Item no encontrado.");
  } else {
    invalidateAll();
    await safeReply(interaction, `\u2705 Item **${name}** eliminado.`);
  }
}
async function giveHandler(interaction) {
  const user = interaction.options.getUser("usuario", true);
  const item = interaction.options.getString("nombre", true);
  const qty = interaction.options.getInteger("cantidad", true);
  const success = await eco.addToInventory(user.id, interaction.guildId, item, qty);
  if (success) {
    await safeReply(interaction, `\u2705 Se entregaron ${qty} **${item}** a ${user.username}.`);
  } else {
    await safeReply(interaction, "\u274C Error. Verifica que el item existe.");
  }
}
async function removeHandler(interaction) {
  const user = interaction.options.getUser("usuario", true);
  const item = interaction.options.getString("nombre", true);
  const qty = interaction.options.getInteger("cantidad", true);
  const res = await eco.removeItem(user.id, interaction.guildId, item, qty);
  if (res.success) {
    await safeReply(interaction, `\u2705 Se quitaron ${qty} **${item}** a ${user.username}.`);
  } else {
    await safeReply(interaction, `\u274C Error: ${res.reason}`);
  }
}
async function setHandler(interaction) {
  const name = interaction.options.getString("item", true);
  const item = await Item.findOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });
  if (!item) {
    await safeReply(interaction, "\u274C Item no encontrado.");
    return;
  }
  const reset = interaction.options.getBoolean("reset");
  const actions = reset ? [] : [...item.actions || []];
  const requirements = reset ? [] : [...item.requirements || []];
  const addRole = interaction.options.getRole("addrole");
  if (addRole) actions.push(`role:add:${addRole.id}`);
  const removeRole = interaction.options.getRole("removerole");
  if (removeRole) actions.push(`role:remove:${removeRole.id}`);
  const addMoney = interaction.options.getInteger("addmoney");
  if (addMoney) actions.push(`money:add:${addMoney}`);
  const removeMoney = interaction.options.getInteger("removemoney");
  if (removeMoney) actions.push(`money:remove:${removeMoney}`);
  const addBank = interaction.options.getInteger("addmoneybank");
  if (addBank) actions.push(`bank:add:${addBank}`);
  const removeBank = interaction.options.getInteger("removemoneybank");
  if (removeBank) actions.push(`bank:remove:${removeBank}`);
  const addItem = interaction.options.getString("additem");
  if (addItem) actions.push(`item:add:${addItem}`);
  const removeItem = interaction.options.getString("removeitem");
  if (removeItem) actions.push(`item:remove:${removeItem}`);
  const message = interaction.options.getString("sendmessage");
  if (message) actions.push(`message:${message}`);
  const reqRole = interaction.options.getRole("requirerole");
  if (reqRole) requirements.push(`role:${reqRole.id}`);
  const reqMoney = interaction.options.getInteger("requiremoney");
  if (reqMoney) requirements.push(`money:${reqMoney}`);
  const reqItem = interaction.options.getString("requireitem");
  if (reqItem) requirements.push(`item:${reqItem}`);
  item.actions = actions;
  item.requirements = requirements;
  await item.save();
  invalidateAll();
  await safeReply(interaction, "\u2705 Configuraci\xF3n actualizada.");
}
function formatEffect(raw, guild, type) {
  try {
    if (type === "req") {
      const req = normalizeRequirement(raw);
      if (req.type === "role") return `\u2022 All of these roles: <@&${req.roleId}>`;
      if (req.type === "money") return `\u2022 Total balance at least \u{1F4B5} ${req.value.toLocaleString()}`;
      if (req.type === "item") return `\u2022 All of these items: **${req.item}** (x${req.amount})`;
    } else {
      const act = normalizeAction(raw);
      if (act.type === "role") return `\u2022 ${act.mode === "add" ? "Give" : "Take"} role: <@&${act.roleId}>`;
      if (act.type === "money") return `\u2022 ${act.mode === "add" ? "Give" : "Take"} \u{1F4B5} ${act.amount?.toLocaleString()}`;
      if (act.type === "item") return `\u2022 ${act.mode === "add" ? "Give" : "Take"} item: **${act.itemName}** (x${act.amount})`;
      if (act.type === "message") return `\u2022 Send message: "${act.text}"`;
    }
  } catch (e) {
    return `\u2022 ${raw}`;
  }
  return `\u2022 ${raw}`;
}
export {
  buyHandler,
  createHandler,
  deleteHandler,
  editHandler,
  executeItemUsage,
  giveHandler,
  infoHandler,
  removeHandler,
  setHandler,
  useHandler
};
