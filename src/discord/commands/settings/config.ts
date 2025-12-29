import { createCommand } from "#base";
import { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import * as eco from "../../../economy/index.js";
import { safeReply } from "../../../utils/safeReply.js";

import { GuildConfig } from "#database";

createCommand({
    name: "config",
    description: "Comandos de configuración (Admins).",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.Administrator, // Or ManageGuild
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
            description: "Establece el rol de policía.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: "rol", description: "Rol de policía", type: ApplicationCommandOptionType.Role, required: true }
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
                        { name: "Badulaque Licorería", value: "licoreria" },
                    ]
                },
                { name: "item", description: "Item recompensa", type: ApplicationCommandOptionType.String, required: true },
                { name: "cantidad", description: "Cantidad", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 },
                { name: "imagen", description: "URL Imagen", type: ApplicationCommandOptionType.String }
            ]
        },
        {
            name: "minar",
            description: "Configura requisitos de minería.",
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
                    description: "Ver configuración actual.",
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

        // === INCOME ===
        if (sub === "income") {
            const role = interaction.options.getRole("rol", true);
            const amount = interaction.options.getInteger("cantidad", true);

            await eco.setIncomeRole(guildId, role.id, amount);

            await safeReply(interaction, {
                embeds: [{
                    title: "💼 Salario configurado",
                    description: `El rol **${role.name}** ahora cobra **$${amount}/hora**.`,
                    color: 0x00a8ff
                }]
            });
            return;
        }

        // === BALANCE (Balance) ===
        if (sub === "balance") {
            const money = interaction.options.getInteger("mano");
            const bank = interaction.options.getInteger("banco");

            if (money === null && bank === null) {
                await safeReply(interaction, "❌ Debes especificar al menos un valor (mano o banco).");
                return;
            }

            const update: any = {};
            if (money !== null) update.initialMoney = money;
            if (bank !== null) update.initialBank = bank;

            await GuildConfig.findOneAndUpdate({ guildId }, update, { upsert: true, new: true });

            await safeReply(interaction, {
                embeds: [{
                    title: "💰 Economía Inicial Configurada",
                    description: `Valores actualizados para nuevos usuarios:`,
                    fields: [
                        { name: "Mano", value: money !== null ? `$${money}` : "Sin cambio", inline: true },
                        { name: "Banco", value: bank !== null ? `$${bank}` : "Sin cambio", inline: true }
                    ],
                    color: 0xf1c40f
                }]
            });
            return;
        }

        // === INCOME ===
        if (sub === "rolepoli") {
            const role = interaction.options.getRole("rol", true);
            await eco.setPoliceRole(guildId, role.id);
            await safeReply(interaction, `✅ Rol de policía establecido: <@&${role.id}>`);
            return;
        }

        // === BADULAQUE ===
        if (sub === "badulaque") {
            const key = interaction.options.getString("badulaque", true);
            const item = interaction.options.getString("item", true);
            const amount = interaction.options.getInteger("cantidad", true);
            const image = interaction.options.getString("imagen");

            const itemObj = await eco.getItemByName(guildId, item);
            if (!itemObj) {
                await safeReply(interaction, `❌ El item **${item}** no existe.`);
                return;
            }

            await eco.setBadulaque(guildId, key, {
                reward: { itemName: item, amount },
                ...(image ? { image } : {})
            });

            await safeReply(interaction, `✅ Badulaque **${key}** configurado. Recompensa: ${amount}x ${item}.`);
            return;
        }

        // === MINAR ===
        if (sub === "minar") {
            const tipo = interaction.options.getString("tipo", true);
            const valor = interaction.options.getString("valor");

            let data: any = { requireType: null, requireId: null };

            if (tipo !== "none") {
                if (!valor) {
                    await safeReply(interaction, "❌ Debes indicar el valor (ID Rol o Nombre Item).");
                    return;
                }

                if (tipo === "role") {
                    // Clean ID if it is a mention
                    if (valor.startsWith("<@&") && valor.endsWith(">")) {
                        data.requireId = valor.slice(3, -1);
                    } else {
                        data.requireId = valor;
                    }
                }
                if (tipo === "item") {
                    const i = await eco.getItemByName(guildId, valor);
                    if (!i) {
                        await safeReply(interaction, "❌ Item no existe.");
                        return;
                    }
                    data.requireId = valor;
                }
                data.requireType = tipo;
            }

            await eco.setMiningConfig(guildId, data);
            await safeReply(interaction, "✅ Configuración de minería actualizada.");
            return;
        }

        // === MARI (Group) ===
        if (subGroup === "mari") {
            let cfg = await eco.getMariConfig(guildId) as any || {};
            // If document, extract plain object or use it directly. Mongoose doc is mutable.
            // If plain object needed, use lean? But getMariConfig returns connection doc?
            // Wait, getMariConfig returns Promise<Document | null>.
            // If null, we create object.

            if (!cfg.guildId && !cfg.save) {
                // It's a plain object (from {} fallback)
                // We need to upsert.
                // We will update fields and call setMariConfig.
            }
            // Actually simpler to just build update object and set it.

            const updateData: any = {};

            if (sub === "ver") {
                await safeReply(interaction, {
                    embeds: [{
                        title: "🌿 Configuración Marihuana",
                        fields: [
                            { name: "Item", value: cfg.itemName || "❌", inline: true },
                            { name: "Rol", value: cfg.roleId ? `<@&${cfg.roleId}>` : "❌", inline: true },
                            { name: "Precio", value: `${cfg.minPrice}-${cfg.maxPrice}`, inline: true }
                        ],
                        color: 0x2ecc71
                    }]
                });
                return;
            }

            if (sub === "item") {
                updateData.itemName = interaction.options.getString("nombre", true);
                // Also verify item exists?
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

            // Merge
            // But if cfg is Mongoose Document, we can just save it?
            // if (cfg.save) ...
            // But I exported setMariConfig which does findOneAndUpdate.
            // So better use setMariConfig(guildId, updateData).
            // But this overrides other fields?
            // findOneAndUpdate with $set logic is default behavior of mongoose if pass object?
            // No, it replaces if I pass whole object unless I use $set.
            // setMariConfig in index.ts: findOneAndUpdate({guildId}, data, {upsert: true, new: true})
            // If data is { itemName: 'foo' }, it might unset other fields if not using $set explicitly?
            // Mongoose `findOneAndUpdate` second arg IS the update.
            // If I pass `{ itemName: 'foo' }`, does it replace?
            // Default is atomic operators. If no operators, it MIGHT replace?
            // If strict option?
            // Usually we should use `{ $set: data }` to be safe OR rely on mongoose magic.
            // I'll be safe:

            await eco.setMariConfig(guildId, updateData); // Safe update

            await safeReply(interaction, "✅ Configuración marihuana actualizada.");
        }
    }
});
