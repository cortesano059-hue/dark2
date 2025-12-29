export interface NormalizedAction {
  type: string;
  op: string;
  value: any;
}

export interface NormalizedRequirement {
  type: string;
  op: string;
  value: any;
}

export interface EngineContext {
  actions: Record<string, (action: NormalizedAction, ctx: EngineContext) => Promise<void>>;
  requires?: Record<string, (req: NormalizedRequirement, ctx: EngineContext) => Promise<boolean>>;
  consume?: Record<string, (req: NormalizedRequirement, ctx: EngineContext) => Promise<void>>;
}