/**
 * src/utils/itemActions.ts
 *
 * Motor de acciones estilo UnbelievaBoat:
 * - message: messageText, embed (boolean)
 * - roles: addRoles[], removeRoles[]
 * - balance: money (number +/-), bank (number +/-)
 * - items: giveItem, giveAmount, removeItem, removeAmount
 *
 * Uso:
 *   const itemActions = require("@src/utils/itemActions");
 *   const res = await itemActions.executeActions(item, interaction, { qty: 1 });
 *
 * Devuelve:
 *   { success: true, messages: [ ... ], details: { ... } }
 */

import safeReply from "@src/utils/safeReply";
import eco from "@economy";
import { CommandInteraction, GuildMember } from "discord.js";

interface ItemAction {
  type: string;
  messageText?: string;
  addRoles?: string[];
  removeRoles?: string[];
  money?: number;
  bank?: number;
  giveItem?: string;
  giveAmount?: number;
  removeItem?: string;
  removeAmount?: number;
}

interface ItemDocument {
  actions?: ItemAction[];
  itemName?: string;
}

interface ActionResults {
  success: boolean;
  messages: string[];
  details: {
    moneyAdded: number;
    moneyRemoved: number;
    bankAdded: number;
    bankRemoved: number;
    rolesAdded: string[];
    rolesRemoved: string[];
    itemsGiven: string[];
    itemsRemoved: string[];
  };
  errors: string[];
}

interface ExecuteActionsOptions {
  qty?: number;
  targetUserId?: string;
  context?: any;
}

export async function executeActions(
  item: ItemDocument,
  interaction: CommandInteraction,
  opts: ExecuteActionsOptions = {}
): Promise<ActionResults> {
  const guildId = interaction.guildId || "";
  const userId = opts.targetUserId || interaction.user.id;
  const member = (interaction.guild?.members.cache.get(userId) as GuildMember | undefined) || undefined;
  const qty = Number(opts.qty || 1);

  const results: ActionResults = {
    success: true,
    messages: [],
    details: {
      moneyAdded: 0,
      moneyRemoved: 0,
      bankAdded: 0,
      bankRemoved: 0,
      rolesAdded: [],
      rolesRemoved: [],
      itemsGiven: [],
      itemsRemoved: [],
    },
    errors: [],
  };

  // Recorremos actions en orden
  for (const a of item.actions || []) {
    try {
      switch (a.type) {
        /* ========================= MESSAGE ========================= */
        case "message": {
          const text = (a.messageText || "")
            .replace(/\{user\}/g, `<@${userId}>`)
            .replace(/\{item\}/g, item.itemName || "")
            .replace(/\{amount\}/g, `${qty}`);
          // Guardamos para mostrar luego (no enviamos automáticamente)
          results.messages.push(text);
          break;
        }

        /* ========================= ROLES ========================= */
        case "roles": {
          // addRoles
          if (Array.isArray(a.addRoles) && a.addRoles.length > 0) {
            for (const r of a.addRoles) {
              try {
                // intentar resolver rol en el guild
                const role = interaction.guild?.roles.cache.get(r);
                if (role && member) {
                  await member.roles.add(role).catch(() => {});
                  results.details.rolesAdded.push(role.id);
                }
              } catch (err) {
                // continuar con demás roles
                results.errors.push(
                  `Error añadiendo rol ${r}: ${err instanceof Error ? err.message : err}`
                );
              }
            }
          }

          // removeRoles
          if (Array.isArray(a.removeRoles) && a.removeRoles.length > 0) {
            for (const r of a.removeRoles) {
              try {
                const role = interaction.guild?.roles.cache.get(r);
                if (role && member) {
                  await member.roles.remove(role).catch(() => {});
                  results.details.rolesRemoved.push(role.id);
                }
              } catch (err) {
                results.errors.push(
                  `Error quitando rol ${r}: ${err instanceof Error ? err.message : err}`
                );
              }
            }
          }
          break;
        }

        /* ========================= BALANCE ========================= */
        case "balance": {
          if (a.money !== undefined) {
            const amount = Number(a.money);
            if (amount > 0) {
              results.details.moneyAdded += amount;
            } else if (amount < 0) {
              results.details.moneyRemoved -= amount;
            }
          }

          if (a.bank !== undefined) {
            const amount = Number(a.bank);
            if (amount > 0) {
              results.details.bankAdded += amount;
            } else if (amount < 0) {
              results.details.bankRemoved -= amount;
            }
          }
          break;
        }

        /* ========================= ITEMS ========================= */
        case "items": {
          // giveItem
          if (a.giveItem && a.giveAmount) {
            results.details.itemsGiven.push(`${a.giveAmount}x ${a.giveItem}`);
          }

          // removeItem
          if (a.removeItem && a.removeAmount) {
            results.details.itemsRemoved.push(`${a.removeAmount}x ${a.removeItem}`);
          }
          break;
        }

        default:
          results.errors.push(`Tipo de acción desconocido: ${a.type}`);
      }
    } catch (err) {
      results.errors.push(
        `Error procesando acción: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  return results;
}

export default {
  executeActions,
};
