import { Item } from "#database";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, Guild, GuildMember } from "discord.js";
import * as eco from "../../../economy/index.js";
import { getItem, invalidateAll } from "../../../items/cache.js";
import { checkRequirements } from "../../../items/checkRequirements.js";
import { consumeRequirements } from "../../../items/consumeRequirements.js";
import { runItem } from "../../../items/engine.js";
import { normalizeAction } from "../../../items/normalizeAction.js";
import { normalizeRequirement } from "../../../items/normalizeRequirement.js";
import { EngineContext } from "../../../items/types.js";
import { safeReply } from "../../../utils/safeReply.js";

// === CREATE ===
export async function createHandler(interaction: ChatInputCommandInteraction) {
    try {
        const name = interaction.options.getString("nombre", true);
        const price = interaction.options.getInteger("precio", true);

        const exists = await Item.findOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });
        if (exists) {
            await safeReply(interaction, "❌ Ya existe un item con ese nombre.");
            return;
        }

        const itemData: any = {
            guildId: interaction.guildId,
            itemName: name,
            price: price,
            description: interaction.options.getString("descripcion") || "",
            emoji: interaction.options.getString("emoji") || "📦",
            inventory: interaction.options.getBoolean("inventariable") ?? true,
            usable: interaction.options.getBoolean("usable") ?? false,
            sellable: interaction.options.getBoolean("vendible") ?? false,
            stock: interaction.options.getInteger("stock") ?? -1,
            time: interaction.options.getInteger("tiempo") ?? undefined,
            requirements: [],
            actions: []
        };

        await Item.create(itemData);

        invalidateAll();
        await safeReply(interaction, `✅ Item **${name}** creado correctamente.`);
    } catch (err) {
        console.error("Error creating item:", err);
        await safeReply(interaction, "❌ Error al crear el item.");
    }
}

// === INFO ===
export async function infoHandler(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("nombre", true);
    const item = await getItem(name, interaction.guildId!);

    if (!item) {
        await safeReply(interaction, "❌ Ese item no existe.");
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${item.emoji || "📦"} ${item.itemName}`)
        .setColor(0x5865f2)
        .addFields(
            { name: "Name", value: item.itemName, inline: true },
            { name: "Price", value: `💵 ${item.price.toLocaleString()}`, inline: true },
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
            value: item.requirements.map((r: string) => formatEffect(r, interaction.guild!, "req")).join("\n"),
            inline: false
        });
    }

    if (item.actions?.length) {
        embed.addFields({
            name: "Actions",
            value: item.actions.map((a: string) => formatEffect(a, interaction.guild!, "act")).join("\n"),
            inline: false
        });
    }

    embed.setFooter({ text: "Requirements and Actions can be edited on the Dashboard" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`item/buy/${item.itemName}`)
            .setLabel("🛒 Comprar Unid.")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`item/use/${item.itemName}`)
            .setLabel("🎒 Usar Objeto")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!item.usable)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

// === USE ===
export async function useHandler(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("nombre", true);
    return executeItemUsage(interaction, name);
}

export async function executeItemUsage(interaction: any, itemName: string) {
    const item = await getItem(itemName, interaction.guildId!);

    if (!item) {
        if (interaction.deferred || interaction.replied) await interaction.editReply("❌ Ese item no existe.");
        else await safeReply(interaction, "❌ Ese item no existe.");
        return;
    }

    if (!item.usable) {
        if (interaction.deferred || interaction.replied) await interaction.editReply("❌ Este item no es usable.");
        else await safeReply(interaction, "❌ Este item no es usable.");
        return;
    }

    const ctx: EngineContext = {
        guildId: interaction.guildId!,
        userId: interaction.user.id,
        user: interaction.user,
        member: interaction.member as GuildMember,
        guild: interaction.guild,
        interaction: interaction,
        rolesGiven: [],
        rolesRemoved: [],
        itemsGiven: [],
        money: 0,
        moneyChanges: { add: 0, remove: 0 },
        bank: { add: 0, remove: 0 },
        customMessage: null,
        item: item
    };

    try {
        await checkRequirements(item, ctx);
    } catch (err: any) {
        let msg = "❌ Requisitos no cumplidos.";
        if (err.message === "REQUIRE_MONEY") msg = "❌ No tienes suficiente dinero.";
        if (err.message === "REQUIRE_ITEM") msg = "❌ No tienes los items requeridos.";
        if (err.message === "REQUIRE_ROLE") msg = "❌ No cumples los requisitos de rol.";

        if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
        else await safeReply(interaction, msg);
        return;
    }

    // Check availability in inventory
    const inv = await eco.getUserInventory(interaction.user.id, interaction.guildId!);
    const found = inv.find(i => i.itemName.toLowerCase() === itemName.toLowerCase());
    if (!found || found.amount < 1) {
        const msg = "❌ No tienes este item en tu inventario.";
        if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
        else await safeReply(interaction, msg);
        return;
    }

    await consumeRequirements(item, ctx);
    const rem = await eco.removeItem(interaction.user.id, interaction.guildId!, item.itemName, 1);
    if (!rem.success) {
        const msg = "❌ Error al consumir el item.";
        if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
        else await safeReply(interaction, msg);
        return;
    }

    await runItem(item, ctx);

    const embed = new EmbedBuilder()
        .setTitle(`🎒 Has usado: ${item.itemName}`)
        .setColor(0x2ecc71);

    if (ctx.customMessage) embed.setDescription(ctx.customMessage);

    if (ctx.moneyChanges.add > 0) embed.addFields({ name: "💰 Ganancia", value: `+$${ctx.moneyChanges.add}`, inline: true });
    if (ctx.itemsGiven.length > 0) embed.addFields({ name: "📦 Obtuviste", value: ctx.itemsGiven.map(i => `${i.name} x${i.amount}`).join('\n') });
    if (ctx.rolesGiven.length > 0) embed.addFields({ name: "🎭 Roles", value: ctx.rolesGiven.map(r => `<@&${r}>`).join(', ') });

    if (interaction.deferred || interaction.replied) await interaction.editReply({ content: null, embeds: [embed] });
    else await safeReply(interaction, { embeds: [embed] });
}

// === COMPRAR ===
export async function buyHandler(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("nombre", true);
    const qty = interaction.options.getInteger("cantidad", true);

    const res = await eco.buyItem(interaction.user.id, interaction.guildId!, name, qty);
    if (res.success) {
        await safeReply(interaction, `✅ Has comprado ${qty} **${name}** por $${res.totalPrice}.`);
    } else {
        await safeReply(interaction, `❌ Error: ${res.reason}`);
    }
}

// === EDIT ===
export async function editHandler(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("nombre", true);
    const item = await Item.findOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });

    if (!item) {
        await safeReply(interaction, "❌ Item no encontrado.");
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
    await safeReply(interaction, `✅ Item **${item.itemName}** actualizado.`);
}

// === DELETE ===
export async function deleteHandler(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("nombre", true);
    const res = await Item.deleteOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });

    if (res.deletedCount === 0) {
        await safeReply(interaction, "❌ Item no encontrado.");
    } else {
        invalidateAll();
        await safeReply(interaction, `✅ Item **${name}** eliminado.`);
    }
}

// === GIVE (Admin) ===
export async function giveHandler(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("usuario", true);
    const item = interaction.options.getString("nombre", true);
    const qty = interaction.options.getInteger("cantidad", true);

    const success = await eco.addToInventory(user.id, interaction.guildId!, item, qty);
    if (success) {
        await safeReply(interaction, `✅ Se entregaron ${qty} **${item}** a ${user.username}.`);
    } else {
        await safeReply(interaction, "❌ Error. Verifica que el item existe.");
    }
}

// === REMOVE (Admin) ===
export async function removeHandler(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("usuario", true);
    const item = interaction.options.getString("nombre", true);
    const qty = interaction.options.getInteger("cantidad", true);

    const res = await eco.removeItem(user.id, interaction.guildId!, item, qty);
    if (res.success) {
        await safeReply(interaction, `✅ Se quitaron ${qty} **${item}** a ${user.username}.`);
    } else {
        await safeReply(interaction, `❌ Error: ${res.reason}`);
    }
}

// === SET (Config) ===
export async function setHandler(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("item", true);
    const item = await Item.findOne({ guildId: interaction.guildId, itemName: { $regex: `^${name}$`, $options: "i" } });

    if (!item) {
        await safeReply(interaction, "❌ Item no encontrado.");
        return;
    }

    const reset = interaction.options.getBoolean("reset");
    const actions = reset ? [] : [...(item.actions || [])];
    const requirements = reset ? [] : [...(item.requirements || [])];

    // Simple helpers to add config.
    // In migration, I'll simplify: just push strings.

    // Add Role action
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
    // @ts-ignore
    item.requirements = requirements;
    await item.save();

    invalidateAll();
    await safeReply(interaction, "✅ Configuración actualizada.");
}

function formatEffect(raw: string, guild: Guild, type: "req" | "act"): string {
    try {
        if (type === "req") {
            const req = normalizeRequirement(raw);
            if (req.type === "role") return `• All of these roles: <@&${req.roleId}>`;
            if (req.type === "money") return `• Total balance at least 💵 ${req.value.toLocaleString()}`;
            if (req.type === "item") return `• All of these items: **${req.item}** (x${req.amount})`;
        } else {
            const act = normalizeAction(raw);
            if (act.type === "role") return `• ${act.mode === "add" ? "Give" : "Take"} role: <@&${act.roleId}>`;
            if (act.type === "money") return `• ${act.mode === "add" ? "Give" : "Take"} 💵 ${act.amount?.toLocaleString()}`;
            if (act.type === "item") return `• ${act.mode === "add" ? "Give" : "Take"} item: **${act.itemName}** (x${act.amount})`;
            if (act.type === "message") return `• Send message: "${act.text}"`;
        }
    } catch (e) {
        return `• ${raw}`;
    }
    return `• ${raw}`;
}
