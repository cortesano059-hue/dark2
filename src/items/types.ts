export interface EngineMoneyDelta {
    add: number;
    remove: number;
}

export interface EngineBankDelta {
    add: number;
    remove: number;
}

export interface EngineItemDelta {
    name: string;
    amount: number;
}

export interface EngineContext {
    guildId: string;
    userId: string;
    guild: any; // Discord Guild
    member: any; // Discord Member
    user: any; // Discord User
    interaction: any;

    rolesGiven: string[];
    rolesRemoved: string[];

    itemsGiven: EngineItemDelta[];

    money: number;
    moneyChanges: EngineMoneyDelta; // Tracks visual delta if needed
    bank?: EngineBankDelta;

    customMessage: string | null;
    item?: any; // The item being used
}

export interface Action {
    type: "money" | "role" | "item" | "message";
    target?: string;
    op?: string;
    value?: any;
    mode?: string;
    amount?: number;
    itemName?: string;
    text?: string;
    roleId?: string;
}

export interface Requirement {
    type: "money" | "item" | "role";
    target?: string;
    value?: any;
    amount?: number;
    mode?: string;
    item?: string;
    roleId?: string;
    source?: "wallet" | "bank";
}
