import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from "discord.js";
import ThemedEmbed from "@src/utils/ThemedEmbed";
import eco from "@economy";
import safeReply from "@src/utils/safeReply";

export const data = new SlashCommandBuilder()
  .setName("addmoney")
  .setDescription("Añadir dinero a un usuario (Admin).")
  .addUserOption((o) =>
    o.setName("usuario").setDescription("Usuario").setRequired(true)
  )
  .addIntegerOption((o) =>
    o.setName("cantidad").setDescription("Cantidad").setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({});
  try {
    const targetUser = interaction.options.getUser("usuario", true);
    const guildId = interaction.guildId || "";
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const amount = interaction.options.getInteger("cantidad", true);
    if (amount <= 0)
      return safeReply(
        interaction,
        { embeds: [ThemedEmbed.error("Error", "Cantidad inválida.")] }
      );

    await eco.addMoney(targetUser.id, guildId, amount);
    const balance = await eco.getBalance(targetUser.id, guildId);

    const embed = new ThemedEmbed(interaction)
      .setTitle("💰 Dinero Añadido")
      .setDescription(`Se han añadido **$${amount}** a ${targetUser.tag}.`)
      .addFields(
        { name: "Dinero en Mano", value: `$${balance.money}`, inline: true },
        { name: "Dinero en Banco", value: `$${balance.bank}`, inline: true }
      )
      .setThumbnail((member || targetUser).displayAvatarURL?.() ?? targetUser.displayAvatarURL())
      .setColor("#2ecc71");

    return safeReply(interaction, { embeds: [embed] });
  } catch (err) {
    console.error("❌ ERROR EN COMANDO addmoney.ts:", err);
    return safeReply(
      interaction,
      { embeds: [ThemedEmbed.error("Error", "No se pudo añadir el dinero.")] }
    );
  }
}
