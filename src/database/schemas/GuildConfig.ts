import { Schema, model } from "mongoose";

export interface IGuildConfig {
    guildId: string;
    prefix: string;
    welcomeChannel?: string;
    leaveChannel?: string;
    modsRole?: string;
    initialMoney?: number;
    initialBank?: number;
    currencySymbol?: string;
    economyLogsChannel?: string;

    // Modules
    mining: {
        requireType: "role" | "item" | null;
        requireId: string | null;
    };
    police: {
        roleId: string;
    };
    mari: {
        itemName?: string;
        roleId?: string;
        minConsume: number;
        maxConsume: number;
        minPrice: number;
        maxPrice: number;
    };
    badulaques: {
        key: string;
        reward: {
            itemName: string;
            amount: number;
        };
        image?: string;
    }[];
    incomeRoles: {
        roleId: string;
        incomePerHour: number;
    }[];

    createdAt: Date;
    updatedAt: Date;
}

const GuildConfigSchema = new Schema<IGuildConfig>({
    guildId: { type: String, unique: true, required: true },
    prefix: { type: String, default: "." },
    welcomeChannel: { type: String, default: null },
    leaveChannel: { type: String, default: null },
    modsRole: { type: String, default: null },
    initialMoney: { type: Number, default: 0 },
    initialBank: { type: Number, default: 5000 },
    currencySymbol: { type: String, default: "$" },
    economyLogsChannel: { type: String, default: null },

    // Modules
    mining: {
        requireType: { type: String, enum: ["role", "item", null], default: null },
        requireId: { type: String, default: null }
    },
    police: {
        roleId: { type: String, default: null }
    },
    mari: {
        itemName: { type: String, default: null },
        roleId: { type: String, default: null },
        minConsume: { type: Number, default: 1 },
        maxConsume: { type: Number, default: 5 },
        minPrice: { type: Number, default: 20 },
        maxPrice: { type: Number, default: 50 },
    },
    badulaques: [
        {
            key: { type: String, required: true }, // central, casino...
            reward: {
                itemName: { type: String, required: true },
                amount: { type: Number, required: true }
            },
            image: { type: String, default: null }
        }
    ],
    incomeRoles: [
        {
            roleId: { type: String, required: true },
            incomePerHour: { type: Number, required: true }
        }
    ]
}, {
    timestamps: true
});

export const GuildConfig = model<IGuildConfig>("GuildConfig", GuildConfigSchema);
