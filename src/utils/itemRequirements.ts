/**
 * Sistema de verificación de requisitos estilo UnbelievaBoat
 */

import eco from "@economy";
import { GuildMember } from "discord.js";

interface Requirement {
  type: string;
  applicableTo?: "buy" | "use" | "both";
  roleId?: string;
  mustHave?: boolean;
  balanceType?: "money" | "bank";
  amount?: number;
  operator?: ">" | ">=" | "<" | "<=" | "=";
  itemNameRequired?: string;
  itemAmountRequired?: number;
}

interface ItemDocument {
  requirements?: Requirement[];
}

interface ValidationResult {
  success: boolean;
  message?: string;
}

export async function validateRequirements(
  item: ItemDocument,
  member: GuildMember,
  mode: "buy" | "use"
): Promise<ValidationResult> {
  const guildId = member.guild.id;
  const userId = member.id;

  for (const req of item.requirements || []) {
    // Saltar si no aplica a este modo
    if (
      req.applicableTo &&
      req.applicableTo !== "both" &&
      req.applicableTo !== mode
    )
      continue;

    /* ======================================================
       ROLE REQUIREMENT
    ====================================================== */
    if (req.type === "role") {
      const hasRole = member.roles.cache.has(req.roleId || "");

      if (req.mustHave && !hasRole) {
        return {
          success: false,
          message: `Necesitas el rol <@&${req.roleId}>.`,
        };
      }

      if (!req.mustHave && hasRole) {
        return {
          success: false,
          message: `No debes tener el rol <@&${req.roleId}>.`,
        };
      }
    }

    /* ======================================================
       BALANCE REQUIREMENT
    ====================================================== */
    if (req.type === "balance") {
      const balance = await eco.getBalance(userId, guildId);
      const value =
        req.balanceType === "money" ? balance.money : balance.bank;

      const amount = req.amount || 0;

      let ok = false;

      switch (req.operator) {
        case ">":
          ok = value > amount;
          break;
        case ">=":
          ok = value >= amount;
          break;
        case "<":
          ok = value < amount;
          break;
        case "<=":
          ok = value <= amount;
          break;
        case "=":
          ok = value === amount;
          break;
      }

      if (!ok) {
        return {
          success: false,
          message: `Necesitas **${req.operator} ${amount}** en ${req.balanceType}.`,
        };
      }
    }

    /* ======================================================
       ITEM REQUIREMENT
    ====================================================== */
    if (req.type === "item") {
      const inv = await eco.getUserInventory(userId, guildId);

      const slot = inv.find(
        (i) =>
          i.itemName.toLowerCase() ===
          (req.itemNameRequired || "").toLowerCase()
      );

      if (!slot || slot.amount < (req.itemAmountRequired || 0)) {
        return {
          success: false,
          message: `Necesitas **${req.itemAmountRequired}x ${req.itemNameRequired}**.`,
        };
      }
    }
  }

  return { success: true };
}

export default {
  validateRequirements,
};
