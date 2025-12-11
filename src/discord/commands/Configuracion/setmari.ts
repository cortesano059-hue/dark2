import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";
import safeReply from "@safeReply";
import eco from "@economy";
import MyClient from "@structures/MyClient.js";

type MariConfig = {
    itemName?: string;
    roleId?: string;
    minPrice?: number;
    maxPrice?: number;
    minConsume?: number;
    maxConsume?: number;
};

export default {
    data: new SlashCommandBuilder()
        .setName("mari")
        .setDescription("Configura todo lo relacionado con vender marihuana. (Admin)")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName("ver").setDescription("Mostrar configuración actual.")
        )
        .addSubcommand(sub =>
            sub
                .setName("item")
                .setDescription("Configurar el item necesario.")
                .addStringOption(o =>
                    o.setName("nombre")
                        .setDescription("Nombre EXACTO del item.")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("rol")
                .setDescription("Configurar el rol ilegal necesario.")
                .addRoleOption(o =>
                    o.setName("rol")
                        .setDescription("Rol obligatorio.")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("precio")
                .setDescription("Precio mínimo y máximo por unidad vendida.")
                .addIntegerOption(o =>
                    o.setName("min").setDescription("Precio mínimo").setRequired(true)
                )
                .addIntegerOption(o =>
                    o.setName("max").setDescription("Precio máximo").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("consumo")
                .setDescription("Cantidad mínima y máxima a consumir.")
                .addIntegerOption(o =>
                    o.setName("min").setDescription("Mínimo consumido").setRequired(true)
                )
                .addIntegerOption(o =>
                    o.setName("max").setDescription("Máximo consumido").setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild?.id;
        if (!guildId) {
            return safeReply(interaction, "❌ No se pudo identificar el servidor.");
        }

        const sub = interaction.options.getSubcommand();
        const cfg: MariConfig = (await eco.getMariConfig(guildId)) ?? {};

        if (sub === "ver") {
            const embed = new EmbedBuilder()
                .setTitle("🌿 Configuración de venta de marihuana")
                .setColor("#2ecc71")
                .addFields(
                    { name: "📦 Item", value: cfg.itemName || "❌ No configurado", inline: true },
                    { name: "🔞 Rol ilegal", value: cfg.roleId ? `<@&${cfg.roleId}>` : "❌ No configurado", inline: true },
                    { name: "💵 Precio", value: `Min: ${cfg.minPrice ?? "?"} | Max: ${cfg.maxPrice ?? "?"}`, inline: true },
                    { name: "📉 Consumo", value: `Min: ${cfg.minConsume ?? "?"} | Max: ${cfg.maxConsume ?? "?"}`, inline: true }
                );

            return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "item") {
            const name = interaction.options.getString("nombre", true);

            cfg.itemName = name;
            await eco.setMariConfig(guildId, cfg);

            return safeReply(interaction, `✅ Item configurado como **${name}**`);
        }

        if (sub === "rol") {
            const role = interaction.options.getRole("rol", true);

            cfg.roleId = role.id;
            await eco.setMariConfig(guildId, cfg);

            return safeReply(interaction, `✅ Rol ilegal configurado como ${role}`);
        }

        if (sub === "precio") {
            const min = interaction.options.getInteger("min", true);
            const max = interaction.options.getInteger("max", true);

            if (min <= 0 || max <= 0 || min > max) {
                return safeReply(interaction, "❌ Valores inválidos.");
            }

            cfg.minPrice = min;
            cfg.maxPrice = max;
            await eco.setMariConfig(guildId, cfg);

            return safeReply(interaction, `💵 Precio por unidad: **${min} – ${max}**`);
        }

        if (sub === "consumo") {
            const min = interaction.options.getInteger("min", true);
            const max = interaction.options.getInteger("max", true);

            if (min <= 0 || max <= 0 || min > max) {
                return safeReply(interaction, "❌ Valores inválidos.");
            }

            cfg.minConsume = min;
            cfg.maxConsume = max;
            await eco.setMariConfig(guildId, cfg);

            return safeReply(interaction, `📉 Consumo por venta: **${min} – ${max}**`);
        }

        return safeReply(interaction, "❌ Subcomando inválido.");
    }
};


