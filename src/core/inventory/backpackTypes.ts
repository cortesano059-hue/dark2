export interface BackpackItem {
  itemId: string;
  amount: number;
}

export interface Backpack {
  id: string;
  ownerId: string;
  ownerType?: 'user' | 'role' | 'system';
  guildId?: string; // Optional for compatibility, but encouraged
  name: string;
  description?: string;
  emoji?: string;
  capacity: number;
  items: Record<string, BackpackItem>;
  allowedUsers?: string[];
  allowedRoles?: string[];
  accessType?: 'owner_only' | 'custom';
}