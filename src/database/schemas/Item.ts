import { Schema, model, Types } from "mongoose";

export interface IItemContent {
    itemId: Types.ObjectId;
    amount: number;
}

export interface IItem {
    guildId?: string;
    itemName: string;
    description?: string;
    emoji?: string;
    price?: number;
    inventory?: boolean;
    usable?: boolean;
    sellable?: boolean;
    stock?: number;
    timeLimit?: number;
    actions: any[];
    requirements: any[];
    type: "normal" | "container";
    capacity: number;
    contents: IItemContent[];
    authorizedUsers: string[];
    data: Record<string, any>;
}

const ItemSchema = new Schema<IItem>({
    guildId: String,
    itemName: String,
    description: String,
    emoji: String,
    price: Number,

    inventory: Boolean,
    usable: { type: Boolean, default: true },
    sellable: Boolean,

    stock: Number,
    timeLimit: Number,

    actions: {
        type: [Schema.Types.Mixed],
        default: [],
    } as any,

    requirements: {
        type: [Schema.Types.Mixed],
        default: [],
    } as any,

    type: {
        type: String,
        enum: ["normal", "container"],
        default: "normal",
    },

    capacity: { type: Number, default: 0 },

    contents: [
        {
            itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
            amount: { type: Number, default: 1, min: 1 },
        },
    ],

    authorizedUsers: { type: [String], default: [] },
    data: { type: Object, default: {} },
});

ItemSchema.index({ guildId: 1, itemName: 1 }, { unique: true });

export const Item = model<IItem>("Item", ItemSchema);
