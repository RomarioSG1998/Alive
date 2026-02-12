
export enum ResourceType {
    WOOD = 'WOOD',
    STONE = 'STONE',
    FOOD = 'FOOD',
    STRUCTURE = 'STRUCTURE',
    DECOR_TREE = 'DECOR_TREE',
    BUSH = 'BUSH',
    GRASS = 'GRASS'
}

export interface Vector2 {
    x: number;
    y: number;
}

export interface Entity {
    id: string;
    type: ResourceType | 'PLAYER' | 'ENEMY';
    pos: Vector2;
    size: number;
    color: string;
    rotation?: number;
    variant?: number;
    health?: number;
    maxHealth?: number;
}

export interface InventoryItem {
    type: ResourceType;
    count: number;
}

export interface GameState {
    health: number;
    hunger: number;
    inventory: InventoryItem[];
    entities: Entity[];
    structures: Entity[];
    log: string[];
}

export type CameraMode = '1P' | '2P' | '3P';

export type AvatarType = 'gemini' | 'classic' | 'blocky' | 'robot';

export interface PlayerProfile {
    name: string;
    avatarType: AvatarType;
    createdAt: number;
}

export interface SavedGameState {
    position: Vector2;
    inventory: InventoryItem[];
    health: number;
    hunger: number;
    structures: Entity[];
    lastSaved: number;
}

