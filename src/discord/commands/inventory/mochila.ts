// src/commands/economia/mochilas/mochila.js
import {
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';
import safeReply from '@src/utils/safeReply';
import { Backpack } from '@database/mongodb';
import eco from '@economy';
import escapeRegex from '@src/utils/escapeRegex';
import { canAccessBackpack, isAdmin } from '@src/utils/backpackAccess';

/* -------------------------------------------------------------------------- */
/*                                FIND BACKPACK                               */
/* -------------------------------------------------------------------------- */

async function findBackpackByName(guildId, member, name) {
    const regex = new RegExp("^" + escapeRegex(name) + "$", "i");

    // 1) Propia
    let bp = await Backpack.findOne({
        guildId,
        ownerId: member.id,
        name: regex
    });
    if (bp) return bp;

    // 2) Admin → cualquiera
    if (isAdmin(member)) {
        bp = await Backpack.findOne({ guildId, name: regex });
        if (bp) return bp;
    }

    // 3) Permitidas
    const all = await Backpack.find({ guildId, name: regex });
    return all.find(bp => canAccessBackpack(bp, member)) || null;
}

/* -------------------------------------------------------------------------- */
/*                               EMBED MOCHILA                                */
/* -------------------------------------------------------------------------- */

function buildBackpackEmbed(bp, items) {
    const embed = new EmbedBuilder()
        .setTitle(`${bp.emoji} Mochila: ${bp.name}`)
        .setColor("#2ecc71")
        .setDescription(bp.description || "Sin descripción.")
        .addFields(
            { name: "Capacidad", value: `${bp.items.length} / ${bp.capacity}`, inline: true },
            {
                name: "Acceso",
                value: bp.accessType === "owner_only"
                    ? "Solo dueño + admins"
                    : "Personalizado (usuarios / roles)",
                inline: true
            }
        );

    if (!items || items.length === 0) {
        embed.addFields({ name: "Contenido", value: "📦 Vacía" });
    } else {
        embed.addFields({
            name: "Contenido",
            value: items
                .map(s => `• ${s.itemId.emoji} **${s.itemId.itemName}** × ${s.amount}`)
                .join("\n")
                .slice(0, 4096)
        });
    }

    return embed;
}

/* -------------------------------------------------------------------------- */
/*                             DEFINICIÓN COMANDO                             */
/* -------------------------------------------------------------------------- */

const command = {
    data: new SlashCommandBuilder()
        .setName("mochila")
        .setDescription("Sistema de mochilas")

        /* ------------------------------ CREAR ------------------------------ */
        .addSubcommand(sub =>
            sub
                .setName("crear")
                .setDescription("Crear una mochila (solo admins)")
                .addUserOption(o => o.setName("usuario").setDescription("Dueño").setRequired(true))
                .addStringOption(o =>
                    o.setName("nombre").setDescription("Nombre").setRequired(true)
                )
                .addIntegerOption(o => o.setName("capacidad").setDescription("Slots").setMinValue(1))
                .addStringOption(o => o.setName("emoji").setDescription("Emoji"))
                .addStringOption(o => o.setName("descripcion").setDescription("Descripción"))
        )

        /* ------------------------------ ABRIR ------------------------------ */
        .addSubcommand(sub =>
            sub
                .setName("abrir")
                .setDescription("Abrir una mochila")
                .addStringOption(o =>
                    o.setName("nombre").setDescription("Nombre de la mochila")
                        .setRequired(true).setAutocomplete(true)
                )
        )

        /* ------------------------------ INFO ------------------------------ */
        .addSubcommand(sub =>
            sub
                .setName("info")
                .setDescription("Ver información de una mochila")
                .addStringOption(o =>
                    o.setName("nombre").setDescription("Nombre")
                        .setRequired(true).setAutocomplete(true)
                )
        )

        /* ------------------------------ LISTAR ---------------------------- */
        .addSubcommand(sub =>
            sub
                .setName("listar")
                .setDescription("Listar mochilas accesibles")
                .addBooleanOption(o =>
                    o.setName("admin").setDescription("Ver todas (solo admins)")
                )
        )

        /* ------------------------------ METER ----------------------------- */
        .addSubcommand(sub =>
            sub
                .setName("meter")
                .setDescription("Meter items")
                .addStringOption(o =>
                    o.setName("mochila").setDescription("Nombre").setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o =>
                    o.setName("item").setDescription("Item").setRequired(true).setAutocomplete(true)
                )
                .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad").setMinValue(1))
        )

        /* ------------------------------ SACAR ----------------------------- */
        .addSubcommand(sub =>
            sub
                .setName("sacar")
                .setDescription("Sacar items de una mochila")
                .addStringOption(o =>
                    o.setName("mochila").setDescription("Nombre").setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o =>
                    o.setName("item").setDescription("Item").setRequired(true).setAutocomplete(true)
                )
                .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad").setMinValue(1))
        )

        /* ------------------------------ AUTORIZAR ------------------------- */
        .addSubcommand(sub =>
            sub
                .setName("autorizar")
                .setDescription("Dar o quitar permisos")
                .addStringOption(o =>
                    o.setName("mochila").setDescription("Nombre").setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o =>
                    o.setName("accion").setDescription("Acción").setRequired(true)
                        .addChoices(
                            { name: "Añadir", value: "add" },
                            { name: "Quitar", value: "remove" }
                        )
                )
                .addStringOption(o =>
                    o.setName("tipo").setDescription("Usuario o Rol").setRequired(true)
                        .addChoices(
                            { name: "Usuario", value: "user" },
                            { name: "Rol", value: "role" }
                        )
                )
                .addUserOption(o => o.setName("usuario").setDescription("Usuario"))
                .addRoleOption(o => o.setName("rol").setDescription("Rol"))
        )

        /* ------------------------------ EDITAR ---------------------------- */
        .addSubcommand(sub =>
            sub
                .setName("editar")
                .setDescription("Editar una mochila")
                .addStringOption(o =>
                    o.setName("nombre").setDescription("Nombre actual").setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o => o.setName("nuevo_nombre").setDescription("Nuevo nombre"))
                .addIntegerOption(o => o.setName("capacidad").setDescription("Nueva capacidad").setMinValue(1))
                .addStringOption(o => o.setName("emoji").setDescription("Nuevo emoji"))
                .addStringOption(o => o.setName("descripcion").setDescription("Nueva descripción"))
        ),

    /* ---------------------------------------------------------------------- */
    /*                               EJECUCIÓN                                */
    /* ---------------------------------------------------------------------- */

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const member = interaction.member;

        /* ------------------------------ CREAR ------------------------------ */
        if (sub === "crear") {
            if (!isAdmin(member))
                return safeReply(interaction, "❌ Solo admins.", true);

            const user = interaction.options.getUser("usuario");
            const nombre = interaction.options.getString("nombre");
            const capacidad = interaction.options.getInteger("capacidad") || 15;
            const emoji = interaction.options.getString("emoji") || "🎒";
            const descripcion = interaction.options.getString("descripcion") || "";

            const exists = await Backpack.findOne({
                guildId,
                ownerId: user.id,
                name: new RegExp("^" + escapeRegex(nombre) + "$", "i")
            });

            if (exists)
                return safeReply(interaction, "❌ Ese usuario ya tiene una mochila con ese nombre.", true);

            const bp = new Backpack({
                guildId,
                ownerId: user.id,
                name: nombre,
                emoji,
                description: descripcion,
                capacity: capacidad
            });

            await bp.save();

            return safeReply(
                interaction,
                `🎒 Mochila **${nombre}** creada para <@${user.id}>.`,
                true
            );
        }

        /* ------------------------------ ABRIR ------------------------------ */
        if (sub === "abrir") {
            const nombre = interaction.options.getString("nombre");
            const bp = await findBackpackByName(guildId, member, nombre);

            if (!bp)
                return safeReply(interaction, "❌ No existe o no tienes acceso.", true);

            const populated = await Backpack.findById(bp._id).populate("items.itemId");
            return safeReply(interaction, { embeds: [buildBackpackEmbed(bp, populated.items)] });
        }

        /* ------------------------------ INFO ------------------------------- */
        if (sub === "info") {
            const nombre = interaction.options.getString("nombre");
            const bp = await findBackpackByName(guildId, member, nombre);

            if (!bp)
                return safeReply(interaction, "❌ No existe o no tienes acceso.", true);

            const pop = await Backpack.findById(bp._id).populate("items.itemId");
            return safeReply(interaction, { embeds: [buildBackpackEmbed(bp, pop.items)] });
        }

        /* ------------------------------ LISTAR ----------------------------- */
        if (sub === "listar") {
            const adminFlag = interaction.options.getBoolean("admin");

            let list = await Backpack.find({ guildId });

            // 🔥 ARREGLO FINAL:
            // admin:true → muestra todo
            // admin:false / vacío → solo accesibles
            if (!(adminFlag === true && isAdmin(member))) {
                list = list.filter(bp => canAccessBackpack(bp, member));
            }

            if (list.length === 0)
                return safeReply(interaction, "📦 No tienes mochilas visibles.", true);

            const txt = list
                .map(bp => `• ${bp.emoji} **${bp.name}** — dueño: <@${bp.ownerId}>`)
                .join("\n");

            return safeReply(
                interaction,
                {
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#9b59b6")
                            .setTitle("📋 Mochilas")
                            .setDescription(txt.slice(0, 4096))
                    ]
                },
                true
            );
        }

        /* ------------------------------ METER ------------------------------ */
        if (sub === "meter") {
            const nombre = interaction.options.getString("mochila");
            const itemName = interaction.options.getString("item");
            const cantidad = interaction.options.getInteger("cantidad") || 1;

            const bp = await findBackpackByName(guildId, member, nombre);
            if (!bp)
                return safeReply(interaction, "❌ No existe o no tienes acceso.", true);

            if (!(bp.ownerId === member.id || isAdmin(member)))
                return safeReply(interaction, "❌ Solo dueño o admin.", true);

            const item = await eco.getItemByName(guildId, itemName);
            if (!item)
                return safeReply(interaction, "❌ Ese item no existe.", true);

            const inv = await eco.getUserInventory(member.id, guildId);
            const slot = inv.find(s => s.name.toLowerCase() === item.itemName.toLowerCase());

            if (!slot || slot.amount < cantidad)
                return safeReply(interaction, "❌ No tienes suficientes.", true);

            const existsSlot = bp.items.some(s => String(s.itemId) === String(item._id));
            if (!existsSlot && bp.items.length >= bp.capacity)
                return safeReply(interaction, "❌ La mochila no tiene más slots libres.", true);

            await eco.removeItem(member.id, guildId, item.itemName, cantidad);

            const idx = bp.items.findIndex(s => String(s.itemId) === String(item._id));
            if (idx === -1) bp.items.push({ itemId: item._id, amount: cantidad });
            else bp.items[idx].amount += cantidad;

            await bp.save();

            return safeReply(
                interaction,
                `📥 Metiste **${cantidad}x ${item.itemName}** en **${bp.name}**.`,
                true
            );
        }

        /* ------------------------------ SACAR ------------------------------ */
        if (sub === "sacar") {
            const nombre = interaction.options.getString("mochila");
            const itemName = interaction.options.getString("item");
            const cantidad = interaction.options.getInteger("cantidad") || 1;

            const bp = await findBackpackByName(guildId, member, nombre);
            if (!bp)
                return safeReply(interaction, "❌ No existe o no tienes acceso.", true);

            if (!(bp.ownerId === member.id || isAdmin(member)))
                return safeReply(interaction, "❌ Solo dueño o admin.", true);

            const item = await eco.getItemByName(guildId, itemName);
            if (!item)
                return safeReply(interaction, "❌ Item inválido.", true);

            const idx = bp.items.findIndex(s => String(s.itemId) === String(item._id));
            if (idx === -1 || bp.items[idx].amount < cantidad)
                return safeReply(interaction, "❌ La mochila no tiene suficientes.", true);

            bp.items[idx].amount -= cantidad;
            if (bp.items[idx].amount <= 0) bp.items.splice(idx, 1);

            await bp.save();
            await eco.addToInventory(member.id, guildId, item._id, cantidad);

            return safeReply(
                interaction,
                `📤 Sacaste **${cantidad}x ${item.itemName}** de **${bp.name}**.`,
                true
            );
        }

        /* ------------------------------ AUTORIZAR --------------------------- */
        if (sub === "autorizar") {
            const nombre = interaction.options.getString("mochila");
            const accion = interaction.options.getString("accion");
            const tipo = interaction.options.getString("tipo");

            const targetUser = interaction.options.getUser("usuario");
            const targetRole = interaction.options.getRole("rol");

            const bp = await Backpack.findOne({
                guildId,
                name: new RegExp("^" + escapeRegex(nombre) + "$", "i")
            });

            if (!bp)
                return safeReply(interaction, "❌ Mochila no encontrada.", true);

            if (!(bp.ownerId === member.id || isAdmin(member)))
                return safeReply(interaction, "❌ No puedes modificar permisos.", true);

            if (accion === "add") bp.accessType = "custom";

            if (tipo === "user") {
                if (!targetUser)
                    return safeReply(interaction, "❌ Falta usuario.", true);

                const id = targetUser.id;
                if (accion === "add") {
                    if (!bp.allowedUsers.includes(id)) bp.allowedUsers.push(id);
                } else {
                    bp.allowedUsers = bp.allowedUsers.filter(u => u !== id);
                }
            }

            if (tipo === "role") {
                if (!targetRole)
                    return safeReply(interaction, "❌ Falta rol.", true);

                const id = targetRole.id;
                if (accion === "add") {
                    if (!bp.allowedRoles.includes(id)) bp.allowedRoles.push(id);
                } else {
                    bp.allowedRoles = bp.allowedRoles.filter(r => r !== id);
                }
            }

            await bp.save();
            return safeReply(interaction, `✅ Permisos actualizados para **${bp.name}**.`, true);
        }

        /* ------------------------------ EDITAR ------------------------------ */
        if (sub === "editar") {
            const nombre = interaction.options.getString("nombre");
            const nuevoNombre = interaction.options.getString("nuevo_nombre");
            const nuevaCap = interaction.options.getInteger("capacidad");
            const nuevoEmoji = interaction.options.getString("emoji");
            const nuevaDesc = interaction.options.getString("descripcion");

            const bp = await Backpack.findOne({
                guildId,
                name: new RegExp("^" + escapeRegex(nombre) + "$", "i")
            });

            if (!bp)
                return safeReply(interaction, "❌ Mochila no encontrada.", true);

            if (!(bp.ownerId === member.id || isAdmin(member)))
                return safeReply(interaction, "❌ No puedes editar esta mochila.", true);

            if (nuevoNombre) bp.name = nuevoNombre;
            if (nuevaCap) bp.capacity = nuevaCap;
            if (nuevoEmoji) bp.emoji = nuevoEmoji;
            if (nuevaDesc) bp.description = nuevaDesc;

            await bp.save();
            return safeReply(interaction, `✅ Mochila **${bp.name}** actualizada.`, true);
        }
    }
};

export default command;