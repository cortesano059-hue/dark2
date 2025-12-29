import { Action } from "./types.js";

export function normalizeAction(raw: string): Action {
    const parts = raw.split(":");
    const [type] = parts;

    if (type === "money") {
        // Format: money:add:100 or money:remove:50
        const op = parts[1]; // add/remove
        const value = parts[2];

        return {
            type: "money",
            target: "money",
            mode: op,
            amount: Number(value),
        };
    }

    if (type === "bank") {
        const op = parts[1];
        const value = parts[2];

        return {
            type: "money", // We treat bank as money action with target bank
            target: "bank",
            mode: op,
            amount: Number(value)
        }
    }

    if (type === "role") {
        // role:add:ID or role:remove:ID
        const op = parts[1];
        const value = parts[2];
        return {
            type: "role",
            mode: op,
            roleId: value,
        };
    }

    if (type === "item") {
        // item:add:name:amount
        const op = parts[1];
        const name = parts[2];
        const amount = parts[3];
        return {
            type: "item",
            mode: op,
            itemName: name,
            amount: Number(amount ?? 1),
        };
    }

    if (type === "message") {
        // message:Content
        const content = raw.substring(8); // remove "message:"
        return {
            type: "message",
            text: content
        }
    }

    // Fallback for raw message if just string? Original normalized message:value.
    return {
        type: "message",
        text: raw,
    };
}
