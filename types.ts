
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
