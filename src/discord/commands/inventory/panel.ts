import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  ChatInputCommandInteraction
} from "discord.js";
import safeReply from "@safeReply";
import eco from "@economy";
import MyClient from "@structures/MyClient.js";

const PANEL_TIMEOUT = 1000 * 60 * 3;

export default {
  data: new SlashCommandBuilder()
    .setName("itempanel")
    .setDescription("Panel visual para crear/editar items (wizard interactivo).")
    .addStringOption(o => o.setName("nombre").setDescription("Nombre del item").setRequired(true))
    .addBooleanOption(o => o.setName("editar").setDescription("Abrir para editar si existe (true/false)").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, client: MyClient): Promise<void> {
    const isAdmin = (interaction.member as any).permissions.has(PermissionFlagsBits.ManageGuild);
    if (!isAdmin) return safeReply(interaction, "⛔ Necesitas permisos de administrar el servidor.");

    const guildId = interaction.guild!.id;
    const name = interaction.options.getString("nombre")!.trim();
    const openForEdit = interaction.options.getBoolean("editar") || false;

    await interaction.deferReply({ ephemeral: true });

    const draft: any = {
      guildId,
      itemName: name,
      description: "",
      price: 0,
      emoji: "📦",
      inventory: true,
      usable: false,
      sellable: true,
      stock: -1,
      timeLimit: 0,
      requirements: [],
      actions: [],
      _editing: null,
    };

    const existing = await eco.getItemByName(guildId, name);
    if (openForEdit && existing) {
      draft.itemName = existing.itemName;
      draft.description = existing.description;
      draft.price = existing.price;
      draft.emoji = existing.emoji;
      draft.inventory = existing.inventory ?? draft.inventory;
      draft.usable = existing.usable ?? draft.usable;
      draft.sellable = existing.sellable ?? draft.sellable;
      draft.stock = existing.stock ?? draft.stock;
      draft.timeLimit = existing.timeLimit ?? draft.timeLimit;
      draft.requirements = existing.requirements || [];
      draft.actions = existing.actions || [];
      draft._editing = existing;
    }

    const makeEmbed = (): EmbedBuilder => {
      const e = new EmbedBuilder()
        .setTitle(`📦 Editor de item: ${draft.itemName}`)
        .setColor("#2b6cb0" as any)
        .setDescription(draft.description || "Sin descripción")
        .addFields(
          { name: "💰 Precio", value: `${draft.price}`, inline: true },
          { name: "🔣 Emoji", value: `${draft.emoji}`, inline: true },
          { name: "📥 Inventariable", value: draft.inventory ? "Sí" : "No", inline: true },
          { name: "🧪 Usable", value: draft.usable ? "Sí" : "No", inline: true },
          { name: "💸 Vendible", value: draft.sellable ? "Sí" : "No", inline: true },
          { name: "📦 Stock", value: draft.stock === -1 ? "Ilimitado" : `${draft.stock}`, inline: true },
          { name: "⏳ Tiempo límite", value: draft.timeLimit === 0 ? "Sin límite" : `${draft.timeLimit} ms`, inline: true },
          {
            name: `📋 Requisitos (${draft.requirements.length})`,
            value: draft.requirements.length ? "```json\n" + JSON.stringify(draft.requirements, null, 2).slice(0, 1000) + "\n```" : "Ninguno",
            inline: false
          },
          {
            name: `⚙️ Acciones (${draft.actions.length})`,
            value: draft.actions.length ? "```json\n" + JSON.stringify(draft.actions, null, 2).slice(0, 1000) + "\n```" : "Ninguna",
            inline: false
          }
        )
        .setFooter({ text: "Panel interactivo — puedes añadir requisitos/acciones y luego Guardar."});
      return e;
    };

    const rowMain = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("reqs").setLabel("Requisitos").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("acts").setLabel("Acciones").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("props").setLabel("Propiedades").setStyle(ButtonStyle.Secondary),
    );

    const rowMain2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("preview").setLabel("Vista previa").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("save").setLabel("Guardar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancelar").setStyle(ButtonStyle.Danger),
    );

    const reply = await interaction.followUp({ embeds: [makeEmbed()], components: [rowMain, rowMain2], ephemeral: true }) as any;

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: PANEL_TIMEOUT,
      filter: (i: any) => i.user.id === interaction.user.id
    });

    collector.on("collect", async (btnInt: any) => {
      try {
        await btnInt.deferUpdate();

        if (btnInt.customId === "reqs") {
          const selRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("req_type")
              .setPlaceholder("Selecciona tipo de requisito")
              .addOptions([
                { label: "Rol requerido", value: "role" },
                { label: "Dinero mínimo (money)", value: "balance_money" },
                { label: "Banco mínimo (bank)", value: "balance_bank" },
                { label: "Item requerido", value: "item" },
              ])
          );

          const msg = await interaction.followUp({ content: "Selecciona el tipo de requisito a añadir:", components: [selRow], ephemeral: true }) as any;
          const sColl = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });

          sColl.on("collect", async (s: any) => {
            await s.deferUpdate();
            const v = s.values[0];

            if (v === "role") {
              const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder()
                  .setCustomId("role_select")
                  .setPlaceholder("Selecciona rol requerido")
                  .setMinValues(1)
                  .setMaxValues(1)
              );
              const rmsg = await interaction.followUp({ content: "Selecciona el rol requerido:", components: [roleRow], ephemeral: true }) as any;
              const rColl = rmsg.createMessageComponentCollector({ componentType: ComponentType.RoleSelect, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });

              rColl.on("collect", async (rr: any) => {
                await rr.deferUpdate();
                const selectedRole = rr.roles.first();
                const mustRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder().setCustomId("must_have").setLabel("Debe tener el rol").setStyle(ButtonStyle.Success),
                  new ButtonBuilder().setCustomId("must_not").setLabel("No debe tenerlo").setStyle(ButtonStyle.Secondary)
                );
                const mmsg = await interaction.followUp({ content: `Rol seleccionado: <@&${selectedRole.id}> — ¿Debe tenerlo o no?`, components: [mustRow], ephemeral: true }) as any;
                const mColl = mmsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });

                mColl.on("collect", async (mm: any) => {
                  await mm.deferUpdate();
                  const mustHave = mm.customId === "must_have";
                  draft.requirements.push({
                    type: "role",
                    roleId: selectedRole.id,
                    mustHave,
                    applicableTo: "both"
                  });
                  await interaction.followUp({ content: `✔ Requisito añadido: role ${mustHave ? "REQUIERE" : "NO debe tener"} <@&${selectedRole.id}>`, ephemeral: true });
                  await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
                });
              });
            } else if (v === "balance_money" || v === "balance_bank") {
              const modal = new ModalBuilder().setCustomId("modal_balance").setTitle("Requisito - Balance");
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("op").setLabel("Operador (>,>=,<,<=,=)").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder(">=")
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("amount").setLabel("Cantidad (número)").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("5000")
                )
              );

              await interaction.showModal(modal);

              const modalSub = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (!modalSub) {
                await interaction.followUp({ content: "⌛ Tiempo para modal agotado.", ephemeral: true });
              } else {
                const op = modalSub.fields.getTextInputValue("op").trim();
                const amt = Number(modalSub.fields.getTextInputValue("amount").trim());
                await modalSub.deferReply({ ephemeral: true });
                if (!["<", "<=", ">", ">=", "="].includes(op) || isNaN(amt)) {
                  await modalSub.followUp({ content: "Entrada inválida.", ephemeral: true });
                } else {
                  draft.requirements.push({
                    type: "balance",
                    balanceType: v === "balance_money" ? "money" : "bank",
                    operator: op,
                    amount: amt,
                    applicableTo: "both"
                  });
                  await modalSub.followUp({ content: `✔ Requisito añadido: ${v === "balance_money" ? "money" : "bank"} ${op} ${amt}`, ephemeral: true });
                  await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
                }
              }
            } else if (v === "item") {
              const modal = new ModalBuilder().setCustomId("modal_itemreq").setTitle("Requisito - Item");
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("iname").setLabel("Nombre del item requerido (exacto)").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("iamt").setLabel("Cantidad requerida").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("1")
                )
              );
              await interaction.showModal(modal);

              const modalSub = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (!modalSub) {
                await interaction.followUp({ content: "⌛ Tiempo para modal agotado.", ephemeral: true });
              } else {
                const iname = modalSub.fields.getTextInputValue("iname").trim();
                const iamt = Number(modalSub.fields.getTextInputValue("iamt").trim());
                await modalSub.deferReply({ ephemeral: true });
                if (!iname || isNaN(iamt) || iamt <= 0) {
                  await modalSub.followUp({ content: "Entrada inválida.", ephemeral: true });
                } else {
                  draft.requirements.push({
                    type: "item",
                    itemNameRequired: iname,
                    itemAmountRequired: iamt,
                    applicableTo: "both"
                  });
                  await modalSub.followUp({ content: `✔ Requisito añadido: ${iamt}x ${iname}`, ephemeral: true });
                  await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
                }
              }
            }
          });
        } else if (btnInt.customId === "acts") {
          const selRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("act_type")
              .setPlaceholder("Selecciona tipo de acción")
              .addOptions([
                { label: "Enviar mensaje", value: "message" },
                { label: "Editar roles (add/remove)", value: "roles" },
                { label: "Editar balance (money/bank)", value: "balance" },
                { label: "Editar items (dar/quitar)", value: "items" },
              ])
          );
          const msg = await interaction.followUp({ content: "Selecciona el tipo de acción:", components: [selRow], ephemeral: true }) as any;
          const sColl = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });

          sColl.on("collect", async (s: any) => {
            await s.deferUpdate();
            const v = s.values[0];

            if (v === "message") {
              const modal = new ModalBuilder().setCustomId("modal_msgact").setTitle("Acción - Mensaje");
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("mtext").setLabel("Mensaje a enviar").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("Has usado {item}")
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("embedflag").setLabel("¿Embed? true/false").setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder("false")
                )
              );
              await interaction.showModal(modal);

              const modalSub = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (!modalSub) {
                await interaction.followUp({ content: "⌛ Tiempo para modal agotado.", ephemeral: true });
              } else {
                const mtext = modalSub.fields.getTextInputValue("mtext").trim();
                const embedflag = (modalSub.fields.getTextInputValue("embedflag") || "false").trim().toLowerCase() === "true";
                await modalSub.deferReply({ ephemeral: true });
                draft.actions.push({
                  type: "message",
                  messageText: mtext,
                  embed: embedflag
                });
                await modalSub.followUp({ content: "✔ Acción (message) añadida.", ephemeral: true });
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              }
            } else if (v === "roles") {
              const addRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder().setCustomId("roles_add").setPlaceholder("Selecciona roles a AÑADIR").setMinValues(0).setMaxValues(5)
              );
              const remRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder().setCustomId("roles_rem").setPlaceholder("Selecciona roles a QUITAR").setMinValues(0).setMaxValues(5)
              );
              const addMsg = await interaction.followUp({ content: "Selecciona roles a AÑADIR (puedes saltar):", components: [addRow], ephemeral: true }) as any;
              const addColl = addMsg.createMessageComponentCollector({ componentType: ComponentType.RoleSelect, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });

              addColl.on("collect", async (rr: any) => {
                await rr.deferUpdate();
                const adds = Array.from(rr.roles.values()).map((r: any) => r.id);
                const remMsg = await interaction.followUp({ content: "Selecciona roles a QUITAR (puedes saltar):", components: [remRow], ephemeral: true }) as any;
                const remColl = remMsg.createMessageComponentCollector({ componentType: ComponentType.RoleSelect, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });

                remColl.on("collect", async (rrr: any) => {
                  await rrr.deferUpdate();
                  const rems = Array.from(rrr.roles.values()).map((r: any) => r.id);
                  draft.actions.push({
                    type: "roles",
                    addRoles: adds,
                    removeRoles: rems
                  });
                  await interaction.followUp({ content: `✔ Acción roles añadida. Add: ${adds.length} / Rem: ${rems.length}`, ephemeral: true });
                  await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
                });

                remColl.on("end", async (collected: any) => {
                  if (collected.size === 0) {
                    draft.actions.push({
                      type: "roles",
                      addRoles: adds,
                      removeRoles: []
                    });
                    await interaction.followUp({ content: `✔ Acción roles añadida. Add: ${adds.length} / Rem: 0 (skip)`, ephemeral: true });
                    await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
                  }
                });
              });

              addColl.on("end", async (collected: any) => {
                if (collected.size === 0) {
                  const remMsg = await interaction.followUp({ content: "Selecciona roles a QUITAR (puedes saltar):", components: [remRow], ephemeral: true }) as any;
                  const remColl = remMsg.createMessageComponentCollector({ componentType: ComponentType.RoleSelect, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });

                  remColl.on("collect", async (rrr: any) => {
                    await rrr.deferUpdate();
                    const rems = Array.from(rrr.roles.values()).map((r: any) => r.id);
                    draft.actions.push({
                      type: "roles",
                      addRoles: [],
                      removeRoles: rems
                    });
                    await interaction.followUp({ content: `✔ Acción roles añadida. Add: 0 / Rem: ${rems.length}`, ephemeral: true });
                    await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
                  });

                  remColl.on("end", async (col: any) => {
                    if (col.size === 0) {
                      draft.actions.push({ type: "roles", addRoles: [], removeRoles: [] });
                      await interaction.followUp({ content: `✔ Acción roles añadida (vacia).`, ephemeral: true });
                      await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
                    }
                  });
                }
              });
            } else if (v === "balance") {
              const modal = new ModalBuilder().setCustomId("modal_balance_act").setTitle("Acción - Balance");
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("mval").setLabel("Money (ej: +100 o -50; 0 para skip)").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("bval").setLabel("Bank (ej: +200 o -20; 0 para skip)").setStyle(TextInputStyle.Short).setRequired(true)
                )
              );
              await interaction.showModal(modal);

              const modalSub = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (!modalSub) {
                await interaction.followUp({ content: "⌛ Tiempo para modal agotado.", ephemeral: true });
              } else {
                const mval = modalSub.fields.getTextInputValue("mval").trim();
                const bval = modalSub.fields.getTextInputValue("bval").trim();
                await modalSub.deferReply({ ephemeral: true });
                const money = Number(mval) || 0;
                const bank = Number(bval) || 0;
                draft.actions.push({ type: "balance", money, bank });
                await modalSub.followUp({ content: `✔ Acción balance añadida (money:${money}, bank:${bank}).`, ephemeral: true });
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              }
            } else if (v === "items") {
              const modal = new ModalBuilder().setCustomId("modal_items_act").setTitle("Acción - Items (dar/quitar)");
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("giveItem").setLabel("Item a DAR (nombre o vacío)").setStyle(TextInputStyle.Short).setRequired(false)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("giveAmt").setLabel("Cantidad a DAR (num)").setStyle(TextInputStyle.Short).setRequired(false)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("rmItem").setLabel("Item a QUITAR (nombre o vacío)").setStyle(TextInputStyle.Short).setRequired(false)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder().setCustomId("rmAmt").setLabel("Cantidad a QUITAR (num)").setStyle(TextInputStyle.Short).setRequired(false)
                )
              );
              await interaction.showModal(modal);

              const modalSub = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (!modalSub) {
                await interaction.followUp({ content: "⌛ Tiempo para modal agotado.", ephemeral: true });
              } else {
                await modalSub.deferReply({ ephemeral: true });
                const giveItem = (modalSub.fields.getTextInputValue("giveItem") || "").trim();
                const giveAmt = Number(modalSub.fields.getTextInputValue("giveAmt") || 0);
                const rmItem = (modalSub.fields.getTextInputValue("rmItem") || "").trim();
                const rmAmt = Number(modalSub.fields.getTextInputValue("rmAmt") || 0);

                draft.actions.push({
                  type: "items",
                  giveItem: giveItem || null,
                  giveAmount: giveAmt || 0,
                  removeItem: rmItem || null,
                  removeAmount: rmAmt || 0,
                });

                await modalSub.followUp({ content: "✔ Acción items añadida.", ephemeral: true });
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              }
            }
          });
        } else if (btnInt.customId === "props") {
          const propsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("p_name").setLabel("Nombre").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("p_price").setLabel("Precio").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("p_emoji").setLabel("Emoji").setStyle(ButtonStyle.Secondary),
          );
          const propsRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("p_flags").setLabel("Flags (invent,usable,sellable)").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("p_stock").setLabel("Stock").setStyle(ButtonStyle.Secondary)
          );
          const pMsg = await interaction.followUp({ content: "Elige propiedad a editar:", components: [propsRow, propsRow2], ephemeral: true }) as any;

          const pColl = pMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000, max: 1, filter: (i: any) => i.user.id === interaction.user.id });
          pColl.on("collect", async (pc: any) => {
            await pc.deferUpdate();
            if (pc.customId === "p_name") {
              const modal = new ModalBuilder().setCustomId("modal_name").setTitle("Editar nombre/desc");
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("nname").setLabel("Nombre").setStyle(TextInputStyle.Short).setRequired(true).setValue(draft.itemName)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("ndesc").setLabel("Descripción").setStyle(TextInputStyle.Paragraph).setRequired(false).setValue(draft.description || ""))
              );
              await interaction.showModal(modal);
              const mod = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (mod) {
                draft.itemName = mod.fields.getTextInputValue("nname").trim();
                draft.description = mod.fields.getTextInputValue("ndesc").trim();
                await mod.deferReply({ ephemeral: true });
                await mod.followUp({ content: "✔ Nombre y descripción actualizados.", ephemeral: true });
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              }
            } else if (pc.customId === "p_price") {
              const modal = new ModalBuilder().setCustomId("modal_price").setTitle("Editar precio");
              modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("price").setLabel("Precio (número)").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(draft.price || 0))));
              await interaction.showModal(modal);
              const mod = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (mod) {
                draft.price = Number(mod.fields.getTextInputValue("price") || 0);
                await mod.deferReply({ ephemeral: true });
                await mod.followUp({ content: "✔ Precio actualizado.", ephemeral: true });
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              }
            } else if (pc.customId === "p_emoji") {
              const modal = new ModalBuilder().setCustomId("modal_emoji").setTitle("Emoji");
              modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("emoji").setLabel("Emoji o texto").setStyle(TextInputStyle.Short).setRequired(true).setValue(draft.emoji || "📦")));
              await interaction.showModal(modal);
              const mod = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (mod) {
                draft.emoji = mod.fields.getTextInputValue("emoji").trim();
                await mod.deferReply({ ephemeral: true });
                await mod.followUp({ content: "✔ Emoji actualizado.", ephemeral: true });
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              }
            } else if (pc.customId === "p_flags") {
              const flagsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId("f_inv").setLabel(`Invent: ${draft.inventory ? "✔" : "✖"}`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("f_use").setLabel(`Usable: ${draft.usable ? "✔" : "✖"}`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("f_sell").setLabel(`Vendible: ${draft.sellable ? "✔" : "✖"}`).setStyle(ButtonStyle.Secondary),
              );
              const fmsg = await interaction.followUp({ content: "Toggle flags:", components: [flagsRow], ephemeral: true }) as any;
              const fColl = fmsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000, max: 3, filter: (i: any) => i.user.id === interaction.user.id });

              fColl.on("collect", async (f: any) => {
                await f.deferUpdate();
                if (f.customId === "f_inv") draft.inventory = !draft.inventory;
                if (f.customId === "f_use") draft.usable = !draft.usable;
                if (f.customId === "f_sell") draft.sellable = !draft.sellable;
                await f.followUp({ content: `Flags actualizadas.`, ephemeral: true }).catch(()=>{});
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              });
            } else if (pc.customId === "p_stock") {
              const modal = new ModalBuilder().setCustomId("modal_stock").setTitle("Stock y tiempo");
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("stock").setLabel("Stock (-1 ilimitado)").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(draft.stock))),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("tlim").setLabel("Tiempo límite ms (0 infinito)").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(draft.timeLimit)))
              );
              await interaction.showModal(modal);
              const mod = await interaction.awaitModalSubmit({ time: 60_000, filter: (m: any) => m.user.id === interaction.user.id }).catch(()=>null);
              if (mod) {
                draft.stock = Number(mod.fields.getTextInputValue("stock") || -1);
                draft.timeLimit = Number(mod.fields.getTextInputValue("tlim") || 0);
                await mod.deferReply({ ephemeral: true });
                await mod.followUp({ content: "✔ Stock y tiempo actualizados.", ephemeral: true });
                await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
              }
            }
          });
        } else if (btnInt.customId === "preview") {
          await interaction.followUp({ embeds: [makeEmbed()], ephemeral: true });
        } else if (btnInt.customId === "save") {
          try {
            const itemData = {
              inventory: draft.inventory,
              usable: draft.usable,
              sellable: draft.sellable,
              stock: draft.stock,
              timeLimit: draft.timeLimit,
              requirements: draft.requirements,
              actions: draft.actions,
              data: {}
            };

            if (draft._editing) {
              const doc = draft._editing;
              doc.itemName = draft.itemName;
              doc.description = draft.description;
              doc.price = draft.price;
              doc.emoji = draft.emoji;
              doc.inventory = itemData.inventory;
              doc.usable = itemData.usable;
              doc.sellable = itemData.sellable;
              doc.stock = itemData.stock;
              doc.timeLimit = itemData.timeLimit;
              doc.requirements = itemData.requirements;
              doc.actions = itemData.actions;
              doc.data = itemData.data;
              await doc.save();
              await interaction.followUp({ content: `✅ Item actualizado: **${doc.itemName}**`, ephemeral: true });
            } else {
              const created = await eco.createItem(guildId, draft.itemName, draft.price, draft.description, draft.emoji, itemData);
              if (!created) {
                await interaction.followUp({ content: "❌ No se pudo crear el item (ya existe o error).", ephemeral: true });
              } else {
                await interaction.followUp({ content: `✅ Item creado: **${created.itemName}**`, ephemeral: true });
              }
            }

            await interaction.editReply({ embeds: [makeEmbed()], components: [rowMain, rowMain2] }).catch(()=>{});
          } catch (err) {
            console.error("❌ Error guardando item desde panel:", err);
            await interaction.followUp({ content: "❌ Error guardando item.", ephemeral: true });
          }
        } else if (btnInt.customId === "cancel") {
          collector.stop("cancelled");
          await interaction.followUp({ content: "✖ Panel cancelado.", ephemeral: true });
          try { await interaction.editReply({ components: [] }); } catch(_) {}
        }

      } catch (err) {
        console.error("❌ Error en collector panel:", err);
      }
    });

    collector.on("end", async (collected: any, reason: string) => {
      if (reason === "time") {
        try {
          await interaction.followUp({ content: "⌛ Panel expirado (3 minutos). Ejecuta de nuevo /itempanel.", ephemeral: true });
          await interaction.editReply({ components: [] }).catch(()=>{});
        } catch(_) {}
      }
    });
  }
};

