import { Requirement } from "./types.js";

export function normalizeRequirement(raw: string): Requirement {
    const parts = raw.split(":");
    const [type, a, b] = parts;

    if (type === "money") {
        // money:100
        return {
            type: "money",
            target: "money",
            value: Number(a),
            source: "wallet"
        };
    }

    if (type === "bank") { // If supported
        return {
            type: "money",
            target: "bank",
            value: Number(a),
            source: "bank"
        }
    }

    if (type === "item") {
        // item:name:amount
        return {
            type: "item",
            item: a,
            amount: Number(b ?? 1),
        };
    }

    if (type === "role") {
        // role:ID
        return {
            type: "role",
            roleId: a,
        };
    }

    throw new Error(`Unknown requirement: ${raw}`);
}
